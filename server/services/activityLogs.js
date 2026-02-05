const { getPool } = require('../db');
const { getTransactionId } = require('../middleware/requestContext');
const logger = require('../logger');

const RETENTION_DAYS = 14;
const CLEANUP_INTERVAL_MS = 1000 * 60 * 60; // 1 hour

let lastCleanupAt = 0;

const sanitizeText = (value) =>
  value === undefined || value === null ? null : String(value).trim() || null;
const sanitizeTransactionId = (value) =>
  value === undefined || value === null ? null : String(value).trim() || null;

const parseDetail = (raw) => {
  if (!raw) {
    return {};
  }
  if (typeof raw === 'object') {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
};

const enforceRetention = async (pool) => {
  const now = Date.now();
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  try {
    await pool.query(
      `DELETE FROM activity_logs WHERE created_at < NOW() - $1::interval;`,
      [`${RETENTION_DAYS} days`]
    );
    lastCleanupAt = now;
  } catch (error) {
    logger.warn('activity_log_retention_failed', { message: error.message });
  }
};

const logActivity = async ({
  username,
  action,
  entity,
  entityId,
  detail,
  ipAddress,
  transactionId
}) => {
  const pool = getPool();
  await enforceRetention(pool);
  await pool.query(
    `
      INSERT INTO activity_logs (transaction_id, username, action, entity, entity_id, detail, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `,
    [
      sanitizeTransactionId(transactionId || getTransactionId()),
      sanitizeText(username),
      sanitizeText(action) || 'unknown',
      sanitizeText(entity),
      sanitizeText(entityId),
      detail ? JSON.stringify(detail) : null,
      sanitizeText(ipAddress)
    ]
  );
};

const getActivityLogs = async ({ limit = 200, hours } = {}) => {
  const pool = getPool();
  const parsedLimit = Number.isFinite(Number(limit))
    ? Math.min(Math.max(parseInt(limit, 10), 1), 500)
    : 200;
  const parsedHours = Number.isFinite(Number(hours)) && Number(hours) > 0
    ? Math.min(Math.max(parseInt(Number(hours), 10), 1), 24 * RETENTION_DAYS)
    : null;
  const interval = parsedHours ? `${parsedHours} hours` : `${RETENTION_DAYS} days`;

  const { rows } = await pool.query(
    `
      SELECT
        id,
        COALESCE(NULLIF(username, ''), 'Unknown') AS username,
        action,
        entity,
        entity_id AS "entityId",
        transaction_id AS "transactionId",
        detail,
        ip_address AS "ipAddress",
        created_at AS "createdAt"
      FROM activity_logs
      WHERE created_at >= NOW() - $2::interval
      ORDER BY created_at DESC
      LIMIT $1;
    `,
    [parsedLimit, interval]
  );

  return rows.map((row) => ({
    ...row,
    detail: parseDetail(row.detail)
  }));
};

module.exports = {
  logActivity,
  getActivityLogs
};
