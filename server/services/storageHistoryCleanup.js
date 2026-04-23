/**
 * Nightly auto-cleanup of storage_history.
 *
 * Every time a storage key is updated, the previous value is archived in
 * storage_history (the "undo log"). With no retention this table grows
 * unbounded and dominates Postgres disk usage. This module periodically
 * deletes old rows and runs a non-blocking VACUUM to keep growth in check.
 *
 * Tunables (env):
 *   STORAGE_HISTORY_CLEANUP_ENABLED  default "true". Set to "false" to disable.
 *   STORAGE_HISTORY_RETENTION_DAYS   default 30.
 *   STORAGE_HISTORY_CLEANUP_INTERVAL_HOURS  default 24 (run once per day).
 *   STORAGE_HISTORY_CLEANUP_INITIAL_DELAY_MS  default 60000 (1 min after startup).
 *
 * VACUUM (not VACUUM FULL) is used so the table is not exclusively locked —
 * dead tuple space is reclaimed for reuse within the table without blocking
 * writes. Disk is given back to the OS only on VACUUM FULL, which should be
 * run manually as a one-off when desired.
 */

const { getPool } = require('../db');
const logger = require('../logger');

const HOUR_MS = 60 * 60 * 1000;

const parseBool = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
};

const parseInt0 = (value, fallback) => {
  const n = parseInt(String(value || ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const config = () => ({
  enabled: parseBool(process.env.STORAGE_HISTORY_CLEANUP_ENABLED, true),
  retentionDays: parseInt0(process.env.STORAGE_HISTORY_RETENTION_DAYS, 30),
  intervalHours: parseInt0(process.env.STORAGE_HISTORY_CLEANUP_INTERVAL_HOURS, 24),
  initialDelayMs: parseInt0(process.env.STORAGE_HISTORY_CLEANUP_INITIAL_DELAY_MS, 60_000)
});

let timer = null;
let running = false;

const runOnce = async () => {
  if (running) {
    logger.info('storage_history_cleanup_skipped_overlap');
    return;
  }
  running = true;
  const cfg = config();
  const startedAt = Date.now();
  try {
    const pool = getPool();
    if (!pool) {
      logger.warn('storage_history_cleanup_no_pool');
      return;
    }
    const before = await pool.query(
      "SELECT count(*)::int AS rows, pg_total_relation_size('storage_history')::bigint AS bytes FROM storage_history;"
    );
    const beforeRows = (before.rows && before.rows[0] && before.rows[0].rows) || 0;
    const beforeBytes = (before.rows && before.rows[0] && Number(before.rows[0].bytes)) || 0;

    const del = await pool.query(
      "DELETE FROM storage_history WHERE archived_at < NOW() - ($1 || ' days')::interval;",
      [String(cfg.retentionDays)]
    );
    const deleted = del.rowCount || 0;

    if (deleted > 0) {
      // Plain VACUUM (not FULL) — non-blocking, reclaims space within the table.
      await pool.query('VACUUM storage_history;');
    }

    const after = await pool.query(
      "SELECT count(*)::int AS rows, pg_total_relation_size('storage_history')::bigint AS bytes FROM storage_history;"
    );
    const afterRows = (after.rows && after.rows[0] && after.rows[0].rows) || 0;
    const afterBytes = (after.rows && after.rows[0] && Number(after.rows[0].bytes)) || 0;

    logger.info('storage_history_cleanup_done', {
      retentionDays: cfg.retentionDays,
      deleted,
      beforeRows,
      afterRows,
      beforeMb: Math.round(beforeBytes / (1024 * 1024)),
      afterMb: Math.round(afterBytes / (1024 * 1024)),
      durationMs: Date.now() - startedAt
    });
  } catch (error) {
    logger.error('storage_history_cleanup_failed', {
      message: error && error.message,
      code: error && error.code,
      durationMs: Date.now() - startedAt
    });
  } finally {
    running = false;
  }
};

const start = () => {
  const cfg = config();
  if (!cfg.enabled) {
    logger.info('storage_history_cleanup_disabled');
    return { stop: () => {} };
  }
  if (timer) {
    return { stop: stopInternal };
  }
  logger.info('storage_history_cleanup_scheduled', {
    retentionDays: cfg.retentionDays,
    intervalHours: cfg.intervalHours,
    initialDelayMs: cfg.initialDelayMs
  });

  // First run after a short initial delay so we don't compete with startup.
  setTimeout(() => {
    void runOnce();
    timer = setInterval(() => {
      void runOnce();
    }, cfg.intervalHours * HOUR_MS);
    if (timer && typeof timer.unref === 'function') {
      timer.unref();
    }
  }, cfg.initialDelayMs);

  return { stop: stopInternal };
};

const stopInternal = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

module.exports = {
  start,
  runOnce
};
