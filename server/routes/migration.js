/**
 * Migration mode API:
 * POST /api/migration/import - upload CSV, parse, write draft (admin)
 * GET /api/migration/stats - return draft counts for dashboard
 * GET /api/migration/draft?keys=... - return draft data (accounts, activities:YYYY-MM, internalActivities)
 * POST /api/migration/confirm - move draft item(s) to confirmed or promote confirmed to main (admin)
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const logger = require('../logger');
const { requireAdminAuth } = require('../middleware/auth');
const {
  parseMigrationCSV,
  writeDraftToStorage
} = require('../services/migrationImport');

const maybeDecompress = (value) => {
  if (typeof value !== 'string') return value;
  const GZIP_PREFIX = '__gz__';
  if (!value.startsWith(GZIP_PREFIX)) return value;
  try {
    const zlib = require('zlib');
    const compressed = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    return zlib.gunzipSync(compressed).toString('utf8');
  } catch (e) {
    return value;
  }
};

const getStorageValue = async (key) => {
  const pool = getPool();
  const { rows } = await pool.query('SELECT value FROM storage WHERE key = $1;', [key]);
  if (!rows.length) return null;
  const raw = rows[0].value;
  const str = maybeDecompress(raw);
  try {
    return JSON.parse(str);
  } catch (_) {
    return str;
  }
};

const setStorageValue = async (key, value) => {
  const pool = getPool();
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  await pool.query(
    `INSERT INTO storage (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW();`,
    [key, serialized]
  );
};

/** POST /api/migration/import - body: { csv: "<raw csv string>" } */
router.post('/import', requireAdminAuth, async (req, res) => {
  try {
    const csv = req.body && req.body.csv;
    if (typeof csv !== 'string' || !csv.trim()) {
      return res.status(400).json({ message: 'Request body must include csv (string).' });
    }
    const { accounts, activitiesByMonth, internalActivities, errors } = parseMigrationCSV(csv);
    if (errors.length && !accounts.length && !internalActivities.length) {
      return res.status(400).json({ message: errors[0] || 'Failed to parse CSV', errors });
    }
    await writeDraftToStorage(accounts, activitiesByMonth, internalActivities);
    const totalActivities = Object.values(activitiesByMonth).reduce((s, arr) => s + arr.length, 0);
    const projectCount = accounts.reduce((s, a) => s + (a.projects && a.projects.length || 0), 0);
    logger.info('migration_import_done', {
      transactionId: req.transactionId,
      accountCount: accounts.length,
      projectCount,
      activityCount: totalActivities,
      internalCount: internalActivities.length
    });
    return res.status(200).json({
      message: 'Migration draft loaded.',
      accountCount: accounts.length,
      projectCount,
      activityCount: totalActivities,
      internalCount: internalActivities.length,
      activityMonths: Object.keys(activitiesByMonth).sort(),
      errors: errors.length ? errors : undefined
    });
  } catch (error) {
    logger.error('migration_import_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    return res.status(500).json({ message: 'Import failed.', error: error.message });
  }
});

/** GET /api/migration/stats - returns counts for dashboard */
router.get('/stats', async (req, res) => {
  try {
    const meta = await getStorageValue('migration_draft_meta');
    const accounts = await getStorageValue('migration_draft_accounts');
    const confirmedAccounts = await getStorageValue('migration_confirmed_accounts');
    const confirmedMeta = await getStorageValue('migration_confirmed_meta');

    const accountList = Array.isArray(accounts) ? accounts : [];
    const projectCount = accountList.reduce((s, a) => s + (a.projects && a.projects.length || 0), 0);
    let totalActivities = 0;
    let confirmedActivities = 0;
    if (meta && Array.isArray(meta.activityMonths)) {
      for (const month of meta.activityMonths) {
        const list = await getStorageValue(`migration_draft_activities:${month}`);
        if (Array.isArray(list)) totalActivities += list.length;
      }
    }
    if (confirmedMeta && Array.isArray(confirmedMeta.activityMonths)) {
      for (const month of confirmedMeta.activityMonths) {
        const list = await getStorageValue(`migration_confirmed_activities:${month}`);
        if (Array.isArray(list)) confirmedActivities += list.length;
      }
    }

    const internalList = await getStorageValue('migration_draft_internalActivities');
    const internalCount = Array.isArray(internalList) ? internalList.length : 0;

    const activityMonths = (meta && Array.isArray(meta.activityMonths)) ? meta.activityMonths.sort() : [];
    const monthsReverse = activityMonths.slice().reverse();

    return res.json({
      loaded: !!meta,
      accountCount: accountList.length,
      projectCount,
      activityCount: totalActivities,
      activityConfirmed: confirmedActivities,
      internalCount,
      confirmedAccountCount: Array.isArray(confirmedAccounts) ? confirmedAccounts.length : 0,
      importedAt: meta && meta.importedAt,
      activityMonths: monthsReverse
    });
  } catch (error) {
    logger.error('migration_stats_failed', { message: error.message, transactionId: req.transactionId });
    return res.status(500).json({ message: 'Failed to get migration stats.' });
  }
});

/** GET /api/migration/draft?keys=key1,key2 - returns draft data for given keys */
router.get('/draft', async (req, res) => {
  try {
    const keysParam = (req.query.keys || '').trim();
    const requested = keysParam ? keysParam.split(',').map(k => k.trim()).filter(Boolean) : [];
    const allowed = ['migration_draft_accounts', 'migration_draft_internalActivities', 'migration_draft_meta'];
    const activityKey = /^migration_draft_activities:\d{4}-\d{2}$/;
    const keys = requested.filter(k => allowed.includes(k) || activityKey.test(k));
    if (!keys.length) {
      return res.json({ items: [] });
    }
    const items = [];
    for (const key of keys) {
      const value = await getStorageValue(key);
      items.push({ key, value: value != null ? value : null });
    }
    return res.json({ items });
  } catch (error) {
    logger.error('migration_draft_failed', { message: error.message, transactionId: req.transactionId });
    return res.status(500).json({ message: 'Failed to get draft data.' });
  }
});

/** POST /api/migration/confirm - body: { action: 'copy_draft_to_confirmed' | 'promote_to_main' } (admin) */
router.post('/confirm', requireAdminAuth, async (req, res) => {
  try {
    const action = (req.body && req.body.action) || '';
    if (action === 'copy_draft_to_confirmed') {
      const draftAccounts = await getStorageValue('migration_draft_accounts');
      const draftMeta = await getStorageValue('migration_draft_meta');
      const draftInternal = await getStorageValue('migration_draft_internalActivities');
      if (!draftMeta || !Array.isArray(draftMeta.activityMonths)) {
        return res.status(400).json({ message: 'No draft data to confirm. Load migration CSV first.' });
      }
      await setStorageValue('migration_confirmed_accounts', Array.isArray(draftAccounts) ? draftAccounts : []);
      await setStorageValue('migration_confirmed_internalActivities', Array.isArray(draftInternal) ? draftInternal : []);
      for (const month of draftMeta.activityMonths) {
        const list = await getStorageValue(`migration_draft_activities:${month}`);
        await setStorageValue(`migration_confirmed_activities:${month}`, Array.isArray(list) ? list : []);
      }
      await setStorageValue('migration_confirmed_meta', {
        ...draftMeta,
        confirmedAt: new Date().toISOString()
      });
      logger.info('migration_copy_draft_to_confirmed', { transactionId: req.transactionId });
      return res.json({ message: 'Draft copied to confirmed.' });
    }

    if (action === 'promote_to_main') {
      const confirmedAccounts = await getStorageValue('migration_confirmed_accounts');
      const confirmedMeta = await getStorageValue('migration_confirmed_meta');
      const confirmedInternal = await getStorageValue('migration_confirmed_internalActivities');
      if (!confirmedMeta || !Array.isArray(confirmedMeta.activityMonths)) {
        return res.status(400).json({ message: 'No confirmed data to promote. Confirm draft first.' });
      }

      const pool = getPool();
      const write = (key, value) => {
        const serialized = typeof value === 'string' ? value : JSON.stringify(value);
        return pool.query(
          `INSERT INTO storage (key, value, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW();`,
          [key, serialized]
        );
      };

      const mainAccounts = await getStorageValue('accounts');
      const accountList = Array.isArray(mainAccounts) ? mainAccounts : [];
      const confirmedList = Array.isArray(confirmedAccounts) ? confirmedAccounts : [];
      const byId = new Map(accountList.map(a => [a.id, a]));
      for (const a of confirmedList) {
        if (a && a.id) byId.set(a.id, a);
      }
      await write('accounts', Array.from(byId.values()));

      const mainInternal = await getStorageValue('internalActivities');
      const internalList = Array.isArray(mainInternal) ? mainInternal : [];
      const confirmedInternalList = Array.isArray(confirmedInternal) ? confirmedInternal : [];
      const internalIds = new Set(internalList.map(i => i && i.id).filter(Boolean));
      for (const i of confirmedInternalList) {
        if (i && i.id && !internalIds.has(i.id)) {
          internalList.push(i);
          internalIds.add(i.id);
        }
      }
      await write('internalActivities', internalList);

      for (const month of confirmedMeta.activityMonths) {
        const key = `activities:${month}`;
        const main = await getStorageValue(key);
        const confirmed = await getStorageValue(`migration_confirmed_activities:${month}`);
        const mainList = Array.isArray(main) ? main : [];
        const confList = Array.isArray(confirmed) ? confirmed : [];
        const actIds = new Set(mainList.map(a => a && a.id).filter(Boolean));
        for (const a of confList) {
          if (a && a.id && !actIds.has(a.id)) {
            mainList.push(a);
            actIds.add(a.id);
          }
        }
        await write(key, mainList);
      }

      logger.info('migration_promote_to_main', { transactionId: req.transactionId });
      return res.json({ message: 'Confirmed migration data promoted to main storage.' });
    }

    return res.status(400).json({ message: 'Invalid action. Use copy_draft_to_confirmed or promote_to_main.' });
  } catch (error) {
    logger.error('migration_confirm_failed', { message: error.message, transactionId: req.transactionId });
    return res.status(500).json({ message: 'Confirm failed.', error: error.message });
  }
});

module.exports = router;
