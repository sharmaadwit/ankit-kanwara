const express = require('express');
const zlib = require('zlib');
const router = express.Router();

const { getPool } = require('../db');
const logger = require('../logger');

const GZIP_PREFIX = '__gz__';

const maybeDecompressValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  if (!value.startsWith(GZIP_PREFIX)) {
    return value;
  }
  try {
    const compressed = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    return zlib.gunzipSync(compressed).toString('utf8');
  } catch (error) {
    logger.warn('storage_decompress_failed', {
      message: error.message
    });
    return value;
  }
};

const listKeys = async () => {
  const { rows } = await getPool().query(
    'SELECT key FROM storage ORDER BY key ASC;'
  );
  return rows.map((row) => row.key);
};

const getValue = async (key) => {
  const { rows } = await getPool().query(
    'SELECT value FROM storage WHERE key = $1;',
    [key]
  );
  if (!rows.length) {
    return null;
  }
  return rows[0].value;
};

/** Returns { value, updated_at } for optimistic locking. updated_at is ISO string. */
const getValueWithVersion = async (key) => {
  const { rows } = await getPool().query(
    'SELECT value, updated_at FROM storage WHERE key = $1;',
    [key]
  );
  if (!rows.length) {
    return null;
  }
  const row = rows[0];
  return {
    value: row.value,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
};

const setValue = async (key, value) => {
  await getPool().query(
    `
      INSERT INTO storage (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = excluded.value, updated_at = NOW();
    `,
    [key, value]
  );
};

/** Conditional update: only if current updated_at matches ifMatch. Returns { updated_at } or null on conflict. */
const setValueIfMatch = async (key, value, ifMatch) => {
  const client = await getPool().connect();
  try {
    const existing = await client.query(
      'SELECT updated_at FROM storage WHERE key = $1;',
      [key]
    );
    const now = new Date().toISOString();
    if (existing.rows.length === 0) {
      if (ifMatch != null && ifMatch !== '') {
        return { conflict: true };
      }
      await client.query(
        `INSERT INTO storage (key, value, updated_at) VALUES ($1, $2, NOW());`,
        [key, value]
      );
      return { updated_at: now };
    }
    if (ifMatch != null && ifMatch !== '') {
      const current = new Date(existing.rows[0].updated_at).toISOString();
      if (current !== ifMatch) {
        const { rows } = await client.query(
          'SELECT value, updated_at FROM storage WHERE key = $1;',
          [key]
        );
        return {
          conflict: true,
          value: rows[0].value,
          updated_at: new Date(rows[0].updated_at).toISOString()
        };
      }
    }
    await client.query(
      `UPDATE storage SET value = $2, updated_at = NOW() WHERE key = $1;`,
      [key, value]
    );
    return { updated_at: now };
  } finally {
    client.release();
  }
};

const deleteValue = async (key) => {
  await getPool().query('DELETE FROM storage WHERE key = $1;', [key]);
};

const clearAll = async () => {
  await getPool().query('TRUNCATE storage;');
};

router.get('/', async (req, res) => {
  try {
    const keys = await listKeys();
    res.json({ keys });
  } catch (error) {
    logger.error('storage_list_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to list keys' });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const row = await getValueWithVersion(req.params.key);
    if (!row) {
      res.status(404).json({ message: 'Key not found' });
      return;
    }
    const value = maybeDecompressValue(row.value);
    res.json({
      key: req.params.key,
      value,
      updated_at: row.updated_at
    });
  } catch (error) {
    logger.error('storage_read_failed', {
      message: error.message,
      transactionId: req.transactionId,
      key: req.params.key
    });
    res.status(500).json({ message: 'Failed to read key' });
  }
});

router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body || {};
    if (value === undefined) {
      res.status(400).json({ message: 'Value is required' });
      return;
    }

    const serializedValue =
      value === null || value === undefined ? '' : String(value);
    const ifMatch = req.get('If-Match') || req.get('if-match');

    if (ifMatch !== undefined && ifMatch !== '') {
      const result = await setValueIfMatch(
        req.params.key,
        serializedValue,
        ifMatch
      );
      if (result.conflict) {
        const conflictValue = result.value != null ? maybeDecompressValue(result.value) : null;
        return res.status(409).json({
          message: 'Conflict: key was updated by another request',
          value: conflictValue,
          updated_at: result.updated_at
        });
      }
      return res.status(200).json({
        key: req.params.key,
        updated_at: result.updated_at
      });
    }

    await setValue(req.params.key, serializedValue);
    res.status(204).send();
  } catch (error) {
    logger.error('storage_write_failed', {
      message: error.message,
      transactionId: req.transactionId,
      key: req.params.key
    });
    res.status(500).json({ message: 'Failed to save key' });
  }
});

router.delete('/:key', async (req, res) => {
  try {
    await deleteValue(req.params.key);
    res.status(204).send();
  } catch (error) {
    logger.error('storage_delete_failed', {
      message: error.message,
      transactionId: req.transactionId,
      key: req.params.key
    });
    res.status(500).json({ message: 'Failed to remove key' });
  }
});

router.delete('/', async (req, res) => {
  try {
    await clearAll();
    res.status(204).send();
  } catch (error) {
    logger.error('storage_clear_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to clear storage' });
  }
});

module.exports = router;

