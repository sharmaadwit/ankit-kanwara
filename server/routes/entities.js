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

/**
 * Rebuild client-shaped account list from D-002 normalized tables when storage.accounts is missing or [].
 * (Incidents where storage was wiped but dual-write had already populated SQL.)
 */
async function loadAccountsFromNormalizedTables(pool) {
  try {
    const { rows: accRows } = await pool.query(
      `SELECT id, name, industry, region, sales_rep, sales_rep_region, sales_rep_email, notes
       FROM accounts ORDER BY name ASC NULLS LAST, id ASC`
    );
    if (!accRows.length) return [];
    let projRows = [];
    try {
      const pr = await pool.query(
        `SELECT id, account_id, name, sfdc_link, use_cases, products_interested
         FROM projects ORDER BY name ASC NULLS LAST, id ASC`
      );
      projRows = pr.rows || [];
    } catch (e) {
      if (e.code !== '42P01') throw e;
    }
    const projectsByAccountId = new Map();
    for (const p of projRows) {
      const aid = p.account_id;
      if (!projectsByAccountId.has(aid)) projectsByAccountId.set(aid, []);
      projectsByAccountId.get(aid).push({
        id: p.id,
        name: p.name || '',
        sfdcLink: p.sfdc_link || null,
        useCases: Array.isArray(p.use_cases) ? p.use_cases : [],
        productsInterested: Array.isArray(p.products_interested) ? p.products_interested : []
      });
    }
    return accRows.map((r) => ({
      id: r.id,
      name: r.name || '',
      industry: r.industry || '',
      region: r.region || '',
      salesRep: r.sales_rep || '',
      salesRepRegion: r.sales_rep_region || '',
      salesRepEmail: r.sales_rep_email || '',
      notes: r.notes || '',
      projects: projectsByAccountId.get(r.id) || []
    }));
  } catch (e) {
    if (e.code === '42P01') return [];
    throw e;
  }
}

// --- Accounts ---

router.get('/accounts', async (req, res) => {
  try {
    const raw = await getStorageValue('accounts');
    let list = parseJsonArray(raw);
    if (!list.length) {
      const recovered = await loadAccountsFromNormalizedTables(getPool());
      if (recovered.length) {
        logger.info('entities_accounts_recovered_from_db', {
          count: recovered.length,
          transactionId: req.transactionId
        });
      }
      list = recovered;
    }
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
    let list = parseJsonArray(raw);
    if (!list.length) {
      list = await loadAccountsFromNormalizedTables(getPool());
    }
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
