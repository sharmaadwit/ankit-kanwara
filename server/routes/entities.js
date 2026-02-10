/**
 * Phase 4 – Structured storage API (v1: list + get-by-id only).
 * REST for accounts and activities on top of existing storage blobs.
 * GET /api/entities/accounts         → list all accounts
 * GET /api/entities/accounts/:id     → one account by id
 * GET /api/entities/activities      → list activities (query: month=YYYY-MM required)
 * GET /api/entities/activities/:id  → one activity by id (query: month=YYYY-MM required)
 */

const express = require('express');
const zlib = require('zlib');
const router = express.Router();
const { getPool } = require('../db');
const logger = require('../logger');

const GZIP_PREFIX = '__gz__';

const maybeDecompress = (value) => {
  if (typeof value !== 'string') return value;
  if (!value.startsWith(GZIP_PREFIX)) return value;
  try {
    const compressed = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    return zlib.gunzipSync(compressed).toString('utf8');
  } catch (e) {
    return value;
  }
};

const getStorageValue = async (key) => {
  const { rows } = await getPool().query(
    'SELECT value FROM storage WHERE key = $1;',
    [key]
  );
  if (!rows.length) return null;
  return maybeDecompress(rows[0].value);
};

const parseJsonArray = (raw) => {
  if (raw == null || raw === '') return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

// --- Accounts ---

router.get('/accounts', async (req, res) => {
  try {
    const raw = await getStorageValue('accounts');
    const list = parseJsonArray(raw);
    res.json(list);
  } catch (error) {
    logger.error('entities_accounts_list_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to list accounts.' });
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const raw = await getStorageValue('accounts');
    const list = parseJsonArray(raw);
    const id = req.params.id;
    const item = list.find((a) => (a && (a.id === id || String(a.id) === id)));
    if (!item) {
      return res.status(404).json({ message: 'Account not found.', id });
    }
    res.json(item);
  } catch (error) {
    logger.error('entities_accounts_get_failed', {
      message: error.message,
      transactionId: req.transactionId,
      id: req.params.id
    });
    res.status(500).json({ message: 'Failed to get account.' });
  }
});

// --- Activities (sharded by month: activities:YYYY-MM) ---

const getActivitiesKey = (month) => {
  if (month != null && typeof month === 'string') {
    const trimmed = month.trim();
    if (/^\d{4}-\d{2}$/.test(trimmed)) return `activities:${trimmed}`;
  }
  return null;
};

router.get('/activities', async (req, res) => {
  try {
    const month = req.query.month;
    const key = getActivitiesKey(month) || 'activities';
    const raw = await getStorageValue(key);
    if (raw === null) {
      return res.json([]);
    }
    const list = parseJsonArray(raw);
    res.json(list);
  } catch (error) {
    logger.error('entities_activities_list_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to list activities.' });
  }
});

router.get('/activities/:id', async (req, res) => {
  try {
    const month = req.query.month;
    const key = getActivitiesKey(month) || 'activities';
    const raw = await getStorageValue(key);
    const list = parseJsonArray(raw);
    const id = req.params.id;
    const item = list.find((a) => (a && (a.id === id || String(a.id) === id)));
    if (!item) {
      return res.status(404).json({ message: 'Activity not found.', id });
    }
    res.json(item);
  } catch (error) {
    logger.error('entities_activities_get_failed', {
      message: error.message,
      transactionId: req.transactionId,
      id: req.params.id
    });
    res.status(500).json({ message: 'Failed to get activity.' });
  }
});

module.exports = router;
