/**
 * One-off or scheduled cleanup: delete old log rows and storage_history to free disk.
 * Run from project root: node server/scripts/cleanup-logs-and-history.js
 *
 * Env (optional):
 *   DELETE_BEFORE_DATE           e.g. 2025-06-01 — delete all rows before this date (keeps from that date onward)
 *   LOGIN_LOGS_RETENTION_DAYS     default 90 — used only if DELETE_BEFORE_DATE not set
 *   ACTIVITY_LOGS_RETENTION_DAYS  default 14
 *   STORAGE_HISTORY_RETENTION_DAYS default 90
 *
 * Example (delete all data before June 2025): set DELETE_BEFORE_DATE=2025-06-01 then run this script.
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const { getPool } = require('../db');

// YYYY-MM-DD from env or first CLI arg (e.g. node cleanup-logs-and-history.js 2025-06-01)
const argDate = process.argv[2] && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[2].trim()) ? process.argv[2].trim() : null;
const DELETE_BEFORE_DATE = process.env.DELETE_BEFORE_DATE || argDate || null;
const LOGIN_RETENTION = Math.max(0, parseInt(process.env.LOGIN_LOGS_RETENTION_DAYS || '90', 10));
const ACTIVITY_RETENTION = Math.max(0, parseInt(process.env.ACTIVITY_LOGS_RETENTION_DAYS || '14', 10));
const STORAGE_HISTORY_RETENTION = Math.max(0, parseInt(process.env.STORAGE_HISTORY_RETENTION_DAYS || '90', 10));

const run = async () => {
  const pool = getPool();
  if (!pool) {
    console.error('No database pool. Set DATABASE_URL.');
    process.exit(1);
  }

  const useCutoff = DELETE_BEFORE_DATE && /^\d{4}-\d{2}-\d{2}$/.test(DELETE_BEFORE_DATE.trim());
  if (useCutoff) {
    console.log('Cutoff date: delete all rows before', DELETE_BEFORE_DATE, '\n');
  }

  try {
    let totalDeleted = 0;

    if (useCutoff) {
      // --- login_logs (before date) ---
      const loginResult = await pool.query(
        'DELETE FROM login_logs WHERE created_at < $1::date;',
        [DELETE_BEFORE_DATE]
      );
      const loginDeleted = loginResult.rowCount || 0;
      totalDeleted += loginDeleted;
      console.log('login_logs: deleted', loginDeleted, '(before', DELETE_BEFORE_DATE + ')');

      // --- activity_logs (before date) ---
      const activityResult = await pool.query(
        'DELETE FROM activity_logs WHERE created_at < $1::date;',
        [DELETE_BEFORE_DATE]
      );
      const activityDeleted = activityResult.rowCount || 0;
      totalDeleted += activityDeleted;
      console.log('activity_logs: deleted', activityDeleted, '(before', DELETE_BEFORE_DATE + ')');

      // --- storage_history (before date) ---
      const historyResult = await pool.query(
        'DELETE FROM storage_history WHERE archived_at < $1::date;',
        [DELETE_BEFORE_DATE]
      );
      const historyDeleted = historyResult.rowCount || 0;
      totalDeleted += historyDeleted;
      console.log('storage_history: deleted', historyDeleted, '(before', DELETE_BEFORE_DATE + ')');
    } else {
      // --- login_logs (retention days) ---
      const loginCondition = LOGIN_RETENTION === 0 ? '1=1' : `created_at < NOW() - INTERVAL '${LOGIN_RETENTION} days'`;
      const loginResult = await pool.query(`DELETE FROM login_logs WHERE ${loginCondition};`);
      const loginDeleted = loginResult.rowCount || 0;
      totalDeleted += loginDeleted;
      console.log('login_logs: deleted', loginDeleted, LOGIN_RETENTION === 0 ? '(all)' : `(older than ${LOGIN_RETENTION} days)`);

      // --- activity_logs ---
      const activityCondition = ACTIVITY_RETENTION === 0 ? '1=1' : `created_at < NOW() - INTERVAL '${ACTIVITY_RETENTION} days'`;
      const activityResult = await pool.query(`DELETE FROM activity_logs WHERE ${activityCondition};`);
      const activityDeleted = activityResult.rowCount || 0;
      totalDeleted += activityDeleted;
      console.log('activity_logs: deleted', activityDeleted, ACTIVITY_RETENTION === 0 ? '(all)' : `(older than ${ACTIVITY_RETENTION} days)`);

      // --- storage_history ---
      const historyCondition = STORAGE_HISTORY_RETENTION === 0 ? '1=1' : `archived_at < NOW() - INTERVAL '${STORAGE_HISTORY_RETENTION} days'`;
      const historyResult = await pool.query(`DELETE FROM storage_history WHERE ${historyCondition};`);
      const historyDeleted = historyResult.rowCount || 0;
      totalDeleted += historyDeleted;
      console.log('storage_history: deleted', historyDeleted, STORAGE_HISTORY_RETENTION === 0 ? '(all)' : `(older than ${STORAGE_HISTORY_RETENTION} days)`);
    }

    if (totalDeleted > 0) {
      console.log('\nRunning VACUUM on affected tables...');
      await pool.query('VACUUM login_logs;');
      await pool.query('VACUUM activity_logs;');
      await pool.query('VACUUM storage_history;');
      console.log('VACUUM done.');
    }

    console.log('\nTotal rows deleted:', totalDeleted, '\nDone.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
