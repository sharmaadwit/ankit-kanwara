/**
 * Admin-only API: DB size visibility + cleanup.
 * GET  /api/admin/cleanup  — returns table sizes, top storage keys, row counts (what's using space).
 * POST /api/admin/cleanup  — run cleanup (logs, storage_history, optional mutations/pending + VACUUM).
 *   Body: { "deleteBeforeDate": "2025-06-01" } or { "full": true } to also clean storage_mutations and pending_storage_saves.
 *   Body: { "recompressMigration": true } — recompress all migration_* keys in storage (shrinks existing data, no deletion).
 */

const express = require('express');
const zlib = require('zlib');
const router = express.Router();
const { getPool } = require('../db');
const { requireAdminAuth } = require('../middleware/auth');
const logger = require('../logger');

const GZIP_PREFIX = '__gz__';
const compressValue = (str) => GZIP_PREFIX + zlib.gzipSync(Buffer.from(str, 'utf8')).toString('base64');

/** GET /api/admin/cleanup — storage visibility (table sizes, top keys, counts). */
const getDbSize = async () => {
  const pool = getPool();
  const tables = await pool.query(`
    SELECT tablename, pg_total_relation_size('public.' || tablename) AS total_bytes
    FROM pg_tables WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size('public.' || tablename) DESC;
  `);
  let totalBytes = 0;
  const tableSizes = (tables.rows || []).map((r) => {
    totalBytes += Number(r.total_bytes) || 0;
    return { table: r.tablename, size_bytes: Number(r.total_bytes) || 0, size_mb: ((Number(r.total_bytes) || 0) / (1024 * 1024)).toFixed(2) + ' MB' };
  });

  const topKeys = await pool.query(`
    SELECT key, length(value) AS value_bytes FROM storage ORDER BY length(value) DESC LIMIT 15;
  `);
  const storageKeys = (topKeys.rows || []).map((r) => ({ key: r.key, size_bytes: Number(r.value_bytes) || 0 }));

  const history = await pool.query(`
    SELECT count(*) AS cnt, coalesce(sum(length(value)), 0) AS bytes FROM storage_history;
  `);
  const h = (history.rows && history.rows[0]) || {};
  const mutations = await pool.query('SELECT count(*) AS cnt FROM storage_mutations;');
  const pending = await pool.query('SELECT count(*) AS cnt FROM pending_storage_saves;');

  return {
    tableSizes,
    total_mb: (totalBytes / (1024 * 1024)).toFixed(2),
    topStorageKeys: storageKeys,
    storage_history: { rows: Number(h.cnt) || 0, value_bytes: Number(h.bytes) || 0 },
    storage_mutations_rows: Number((mutations.rows && mutations.rows[0] && mutations.rows[0].cnt) || 0),
    pending_storage_saves_rows: Number((pending.rows && pending.rows[0] && pending.rows[0].cnt) || 0)
  };
};

const runCleanup = async (deleteBeforeDate, full = false) => {
  const pool = getPool();
  const useCutoff = deleteBeforeDate && /^\d{4}-\d{2}-\d{2}$/.test(String(deleteBeforeDate).trim());
  const date = useCutoff ? String(deleteBeforeDate).trim() : null;

  let loginDeleted = 0;
  let activityDeleted = 0;
  let historyDeleted = 0;
  let mutationsDeleted = 0;
  let pendingDeleted = 0;

  if (useCutoff) {
    const r1 = await pool.query('DELETE FROM login_logs WHERE created_at < $1::date;', [date]);
    const r2 = await pool.query('DELETE FROM activity_logs WHERE created_at < $1::date;', [date]);
    const r3 = await pool.query('DELETE FROM storage_history WHERE archived_at < $1::date;', [date]);
    loginDeleted = r1.rowCount || 0;
    activityDeleted = r2.rowCount || 0;
    historyDeleted = r3.rowCount || 0;
  } else {
    const loginDays = Math.max(0, parseInt(process.env.LOGIN_LOGS_RETENTION_DAYS || '90', 10));
    const activityDays = Math.max(0, parseInt(process.env.ACTIVITY_LOGS_RETENTION_DAYS || '14', 10));
    const historyDays = Math.max(0, parseInt(process.env.STORAGE_HISTORY_RETENTION_DAYS || '90', 10));
    const lc = loginDays === 0 ? '1=1' : `created_at < NOW() - INTERVAL '${loginDays} days'`;
    const ac = activityDays === 0 ? '1=1' : `created_at < NOW() - INTERVAL '${activityDays} days'`;
    const hc = historyDays === 0 ? '1=1' : `archived_at < NOW() - INTERVAL '${historyDays} days'`;
    const r1 = await pool.query(`DELETE FROM login_logs WHERE ${lc};`);
    const r2 = await pool.query(`DELETE FROM activity_logs WHERE ${ac};`);
    const r3 = await pool.query(`DELETE FROM storage_history WHERE ${hc};`);
    loginDeleted = r1.rowCount || 0;
    activityDeleted = r2.rowCount || 0;
    historyDeleted = r3.rowCount || 0;
  }

  if (full) {
    const mutDays = Math.max(7, parseInt(process.env.STORAGE_MUTATIONS_RETENTION_DAYS || '30', 10));
    const pendDays = Math.max(1, parseInt(process.env.PENDING_STORAGE_RETENTION_DAYS || '7', 10));
    const r4 = await pool.query(`DELETE FROM storage_mutations WHERE created_at < NOW() - INTERVAL '${mutDays} days';`);
    const r5 = await pool.query(`DELETE FROM pending_storage_saves WHERE created_at < NOW() - INTERVAL '${pendDays} days';`);
    mutationsDeleted = r4.rowCount || 0;
    pendingDeleted = r5.rowCount || 0;
  }

  const total = loginDeleted + activityDeleted + historyDeleted + mutationsDeleted + pendingDeleted;
  if (total > 0 || full) {
    await pool.query('VACUUM login_logs;');
    await pool.query('VACUUM activity_logs;');
    await pool.query('VACUUM storage_history;');
    if (full) {
      await pool.query('VACUUM storage_mutations;');
      await pool.query('VACUUM pending_storage_saves;');
    }
  }

  return {
    login_logs: loginDeleted,
    activity_logs: activityDeleted,
    storage_history: historyDeleted,
    storage_mutations: mutationsDeleted,
    pending_storage_saves: pendingDeleted,
    total,
    mode: useCutoff ? `before ${date}` : (full ? 'retention + full (mutations, pending)' : 'retention days')
  };
};

router.get(['/', ''], requireAdminAuth, async (req, res) => {
  try {
    const size = await getDbSize();
    res.json(size);
  } catch (err) {
    logger.error('admin_db_size_failed', { message: err.message });
    res.status(500).json({ error: err.message });
  }
});

/** Recompress migration_* keys in storage: read each, if not already __gz__, compress and write back. Saves space without deleting data. */
const recompressMigrationKeys = async () => {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT key, value FROM storage WHERE key LIKE 'migration_%'"
  );
  let recompressed = 0;
  for (const row of rows || []) {
    const raw = row.value;
    if (typeof raw !== 'string' || raw.startsWith(GZIP_PREFIX)) continue;
    const compressed = compressValue(raw);
    await pool.query(
      'UPDATE storage SET value = $2, updated_at = NOW() WHERE key = $1',
      [row.key, compressed]
    );
    recompressed += 1;
  }
  return recompressed;
};

router.post('/', requireAdminAuth, async (req, res) => {
  try {
    const body = req.body || {};
    if (body.sizeOnly === true || (req.query && req.query.sizeOnly === 'true')) {
      const size = await getDbSize();
      return res.json(size);
    }
    if (body.recompressMigration === true || (req.query && req.query.recompressMigration === 'true')) {
      const recompressed = await recompressMigrationKeys();
      logger.info('admin_recompress_migration', { recompressed });
      return res.json({ ok: true, recompressed });
    }
    const deleteBeforeDate = body.deleteBeforeDate || (req.query && req.query.deleteBeforeDate) || null;
    const full = body.full === true || (req.query && req.query.full === 'true');
    const result = await runCleanup(deleteBeforeDate, full);
    logger.info('admin_cleanup_run', { ...result, deleteBeforeDate: deleteBeforeDate || undefined, full });
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('admin_cleanup_failed', { message: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
