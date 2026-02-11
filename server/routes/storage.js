const express = require('express');
const zlib = require('zlib');
const router = express.Router();

const { getPool } = require('../db');
const logger = require('../logger');
const { requireAdminAuth } = require('../middleware/auth');

const GZIP_PREFIX = '__gz__';
const STORAGE_READ_CACHE_TTL_MS = Math.max(
  0,
  parseInt(process.env.STORAGE_READ_CACHE_TTL_MS || '3000', 10) || 3000
);
const storageReadCache = new Map();

const getCachedStorageRow = (key) => {
  if (!key || STORAGE_READ_CACHE_TTL_MS <= 0) return null;
  const entry = storageReadCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    storageReadCache.delete(key);
    return null;
  }
  return entry.row;
};

const setCachedStorageRow = (key, row) => {
  if (!key || !row || STORAGE_READ_CACHE_TTL_MS <= 0) return;
  storageReadCache.set(key, {
    row,
    expiresAt: Date.now() + STORAGE_READ_CACHE_TTL_MS
  });
};

const invalidateStorageReadCache = (key) => {
  if (!key) {
    storageReadCache.clear();
    return;
  }
  storageReadCache.delete(key);
};

/** Archive current value to storage_history before overwrite (The Insurance). */
const archiveCurrentValue = async (client, key) => {
  const { rows } = await client.query(
    'SELECT value, updated_at FROM storage WHERE key = $1;',
    [key]
  );
  if (rows.length === 0) return;
  await client.query(
    `INSERT INTO storage_history (key, value, updated_at, archived_at) VALUES ($1, $2, $3, NOW());`,
    [key, rows[0].value, rows[0].updated_at]
  );
};

/** Store rejected payload in pending_storage_saves (Lost & Found on 409). */
const savePendingDraft = async (storageKey, value, reason, username) => {
  await getPool().query(
    `INSERT INTO pending_storage_saves (storage_key, value, reason, username, created_at) VALUES ($1, $2, $3, $4, NOW());`,
    [storageKey, value, reason, username || null]
  );
};

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
  const cached = getCachedStorageRow(key);
  if (cached) {
    return cached;
  }
  const { rows } = await getPool().query(
    'SELECT value, updated_at FROM storage WHERE key = $1;',
    [key]
  );
  if (!rows.length) {
    return null;
  }
  const row = rows[0];
  const normalized = {
    value: row.value,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
  setCachedStorageRow(key, normalized);
  return normalized;
};

const getValuesWithVersionBatch = async (keys) => {
  const uniqueKeys = Array.from(new Set((keys || []).filter(Boolean)));
  if (!uniqueKeys.length) return [];

  const rowsByKey = new Map();
  const missingKeys = [];
  uniqueKeys.forEach((key) => {
    const cached = getCachedStorageRow(key);
    if (cached) {
      rowsByKey.set(key, cached);
    } else {
      missingKeys.push(key);
    }
  });

  if (missingKeys.length) {
    const { rows } = await getPool().query(
      'SELECT key, value, updated_at FROM storage WHERE key = ANY($1::text[]);',
      [missingKeys]
    );
    (rows || []).forEach((row) => {
      const normalized = {
        value: row.value,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
      };
      rowsByKey.set(row.key, normalized);
      setCachedStorageRow(row.key, normalized);
    });
  }

  return uniqueKeys
    .filter((key) => rowsByKey.has(key))
    .map((key) => ({ key, ...rowsByKey.get(key) }));
};

/** Unconditional upsert. Archives old value first, then updates. Returns { updated_at }. */
const setValue = async (key, value) => {
  const client = await getPool().connect();
  try {
    await archiveCurrentValue(client, key);
    const { rows } = await client.query(
      `
      INSERT INTO storage (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = excluded.value, updated_at = NOW()
      RETURNING updated_at;
    `,
      [key, value]
    );
    const updatedAt = rows[0] && rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : new Date().toISOString();
    invalidateStorageReadCache(key);
    return { updated_at: updatedAt };
  } finally {
    client.release();
  }
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
      invalidateStorageReadCache(key);
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
    await archiveCurrentValue(client, key);
    const { rows } = await client.query(
      `UPDATE storage SET value = $2, updated_at = NOW() WHERE key = $1 RETURNING updated_at;`,
      [key, value]
    );
    const updatedAt = rows[0] && rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : now;
    invalidateStorageReadCache(key);
    return { updated_at: updatedAt };
  } finally {
    client.release();
  }
};

const deleteValue = async (key) => {
  await getPool().query('DELETE FROM storage WHERE key = $1;', [key]);
  invalidateStorageReadCache(key);
};

/** Log storage PUT for Railway/in-app diagnostics and retrieval (key, who, count). */
const logStorageWrite = (key, serializedValue, conditional, transactionId, username) => {
  const meta = {
    key,
    conditional: !!conditional,
    transactionId,
    username: username || null
  };
  if (key === 'activities' || key === 'accounts' || key === 'internalActivities') {
    try {
      const parsed = typeof serializedValue === 'string' ? JSON.parse(serializedValue) : serializedValue;
      if (Array.isArray(parsed)) {
        meta.count = parsed.length;
      }
    } catch (_) {
      // ignore parse errors
    }
  }
  if (/^activities:\d{4}-\d{2}$/.test(key)) {
    try {
      const parsed = typeof serializedValue === 'string' ? JSON.parse(serializedValue) : serializedValue;
      if (Array.isArray(parsed)) {
        meta.count = parsed.length;
      }
    } catch (_) {}
  }
  logger.info('storage_write', meta);
};

const clearAll = async () => {
  await getPool().query('TRUNCATE storage;');
  invalidateStorageReadCache();
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

/** Lost & Found: list pending/draft saves (e.g. after 409 conflict). Admin only. */
router.get('/pending', requireAdminAuth, async (req, res) => {
  try {
    const { rows } = await getPool().query(
      `SELECT id, storage_key, value, reason, username, created_at
       FROM pending_storage_saves
       ORDER BY created_at DESC
       LIMIT 200;`
    );
    const pending = rows.map((r) => ({
      id: r.id,
      storage_key: r.storage_key,
      value: r.value,
      reason: r.reason,
      username: r.username,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null
    }));
    res.json({ pending });
  } catch (error) {
    logger.error('storage_pending_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to list pending saves' });
  }
});

/** Remove a pending save after it has been applied (or discarded). Admin only. */
router.delete('/pending/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid pending id' });
    }
    const { rowCount } = await getPool().query(
      'DELETE FROM pending_storage_saves WHERE id = $1',
      [id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Pending save not found' });
    }
    res.status(204).send();
  } catch (error) {
    logger.error('storage_pending_delete_failed', {
      message: error.message,
      transactionId: req.transactionId,
      id: req.params.id
    });
    res.status(500).json({ message: 'Failed to delete pending save' });
  }
});

/** Batch GET: fetch multiple keys in one request. ?keys=key1,key2,key3 */
router.get('/batch', async (req, res) => {
  try {
    const keysParam = (req.query.keys || '').trim();
    const keys = keysParam ? keysParam.split(',').map((k) => k.trim()).filter(Boolean) : [];
    if (!keys.length || keys.length > 20) {
      return res.status(400).json({ message: 'Provide 1–20 keys in ?keys=key1,key2' });
    }
    const rows = await getValuesWithVersionBatch(keys);
    const items = (rows || []).map((r) => ({
      key: r.key,
      value: maybeDecompressValue(r.value),
      updated_at: r.updated_at
    }));
    res.json({ items });
  } catch (error) {
    logger.error('storage_batch_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to read keys' });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const row = await getValueWithVersion(req.params.key);
    if (!row) {
      const username = req.get('X-Admin-User') || req.get('x-admin-user') || null;
      logger.warn('storage_get_404', {
        key: req.params.key,
        transactionId: req.transactionId,
        username: username || 'unknown'
      });
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
        logger.warn('storage_conflict', {
          key: req.params.key,
          transactionId: req.transactionId,
          message: 'Key was updated by another request; client should merge and retry'
        });
        try {
          await savePendingDraft(
            req.params.key,
            serializedValue,
            'conflict',
            req.get('X-Admin-User') || req.get('x-admin-user')
          );
        } catch (archiveErr) {
          logger.warn('storage_pending_draft_failed', { message: archiveErr.message, key: req.params.key });
        }
        const conflictValue = result.value != null ? maybeDecompressValue(result.value) : null;
        return res.status(409).json({
          message: 'Conflict: key was updated by another request',
          value: conflictValue,
          updated_at: result.updated_at
        });
      }
      const username = req.get('X-Admin-User') || req.get('x-admin-user');
      logStorageWrite(req.params.key, serializedValue, true, req.transactionId, username);
      return res.status(200).json({
        key: req.params.key,
        updated_at: result.updated_at
      });
    }

    const setResult = await setValue(req.params.key, serializedValue);
    const username = req.get('X-Admin-User') || req.get('x-admin-user');
    logStorageWrite(req.params.key, serializedValue, false, req.transactionId, username);
    return res.status(200).json({
      key: req.params.key,
      updated_at: setResult.updated_at
    });
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

