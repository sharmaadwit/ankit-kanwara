/**
 * Admin-only API to run DB cleanup (logs + storage_history + VACUUM).
 * POST /api/admin/cleanup
 * Body: { "deleteBeforeDate": "2025-06-01" }  (optional — if set, deletes all rows before this date)
 * Without body: uses retention (90/14/90 days).
 * Requires admin auth (cookie/session).
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { requireAdminAuth } = require('../middleware/auth');
const logger = require('../logger');

const runCleanup = async (deleteBeforeDate) => {
  const pool = getPool();
  const useCutoff = deleteBeforeDate && /^\d{4}-\d{2}-\d{2}$/.test(String(deleteBeforeDate).trim());
  const date = useCutoff ? String(deleteBeforeDate).trim() : null;

  let loginDeleted = 0;
  let activityDeleted = 0;
  let historyDeleted = 0;

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

  const total = loginDeleted + activityDeleted + historyDeleted;
  if (total > 0) {
    await pool.query('VACUUM login_logs;');
    await pool.query('VACUUM activity_logs;');
    await pool.query('VACUUM storage_history;');
  }

  return {
    login_logs: loginDeleted,
    activity_logs: activityDeleted,
    storage_history: historyDeleted,
    total,
    mode: useCutoff ? `before ${date}` : 'retention days'
  };
};

router.post('/', requireAdminAuth, async (req, res) => {
  try {
    const deleteBeforeDate = (req.body && req.body.deleteBeforeDate) || (req.query && req.query.deleteBeforeDate) || null;
    const result = await runCleanup(deleteBeforeDate);
    logger.info('admin_cleanup_run', { ...result, deleteBeforeDate: deleteBeforeDate || undefined });
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error('admin_cleanup_failed', { message: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
