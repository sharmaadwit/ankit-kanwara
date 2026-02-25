/**
 * Remove old rows from storage_history to free disk space.
 * Every time a storage key is updated, the previous value is archived here; there is no
 * automatic retention, so this table can grow very large (especially for "activities").
 *
 * Run from project root: node server/scripts/cleanup-storage-history.js
 * Optional env: STORAGE_HISTORY_RETENTION_DAYS=90 (default: 90 = keep last 90 days).
 *
 * For a full cleanup (login_logs + activity_logs + storage_history + VACUUM), use:
 *   node server/scripts/cleanup-logs-and-history.js
 */

const { getPool } = require('../db');

const RETENTION_DAYS = parseInt(process.env.STORAGE_HISTORY_RETENTION_DAYS || '90', 10) || 90;

const run = async () => {
  const pool = getPool();
  if (!pool) {
    console.error('No database pool. Set DATABASE_URL.');
    process.exit(1);
  }

  try {
    const before = await pool.query(`
      SELECT count(*) AS cnt, pg_size_pretty(pg_total_relation_size('storage_history')) AS size
      FROM storage_history;
    `);
    const beforeRow = (before.rows && before.rows[0]) || {};
    console.log('storage_history before: rows =', beforeRow.cnt, ', table size =', beforeRow.size);

    const result = await pool.query(
      `DELETE FROM storage_history WHERE archived_at < NOW() - $1::interval;`,
      [`${RETENTION_DAYS} days`]
    );
    const deleted = result.rowCount || 0;

    const after = await pool.query(`
      SELECT count(*) AS cnt, pg_size_pretty(pg_total_relation_size('storage_history')) AS size
      FROM storage_history;
    `);
    const afterRow = (after.rows && after.rows[0]) || {};
    console.log('Deleted', deleted, 'rows (older than', RETENTION_DAYS, 'days).');
    console.log('storage_history after:  rows =', afterRow.cnt, ', table size =', afterRow.size);

    if (deleted > 0) {
      await pool.query('VACUUM storage_history;');
      console.log('VACUUM storage_history done.');
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
