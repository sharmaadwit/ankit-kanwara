const express = require('express');
const router = express.Router();

const { getPool } = require('../db');
const { requireStorageAuth } = require('../middleware/auth');

router.use(requireStorageAuth);

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
    console.error('Failed to list storage keys', error);
    res.status(500).json({ message: 'Failed to list keys' });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const value = await getValue(req.params.key);
    if (value === null || value === undefined) {
      res.status(404).json({ message: 'Key not found' });
      return;
    }
    res.json({ key: req.params.key, value });
  } catch (error) {
    console.error('Failed to read storage key', error);
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

    await setValue(req.params.key, serializedValue);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to save storage key', error);
    res.status(500).json({ message: 'Failed to save key' });
  }
});

router.delete('/:key', async (req, res) => {
  try {
    await deleteValue(req.params.key);
    res.status(204).send();
  } catch (error) {
    console.error('Failed to remove storage key', error);
    res.status(500).json({ message: 'Failed to remove key' });
  }
});

router.delete('/', async (req, res) => {
  try {
    await clearAll();
    res.status(204).send();
  } catch (error) {
    console.error('Failed to clear storage', error);
    res.status(500).json({ message: 'Failed to clear storage' });
  }
});

module.exports = router;

