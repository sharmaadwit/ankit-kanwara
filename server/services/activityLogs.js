const { getPool } = require('../db');

const RETENTION_DAYS = 14;
const CLEANUP_INTERVAL_MS = 1000 * 60 * 60; // 1 hour

let lastCleanupAt = 0;

const sanitizeText = (value) =>
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
    console.warn('activity_log_retention_failed', error.message);
  }
};

const logActivity = async ({
  username,
  action,
  entity,
  entityId,
  detail,
  ipAddress
}) => {
  const pool = getPool();
  await enforceRetention(pool);
  await pool.query(
    `
      INSERT INTO activity_logs (username, action, entity, entity_id, detail, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6);
    `,
    [
      sanitizeText(username),
      sanitizeText(action) || 'unknown',
      sanitizeText(entity),
      sanitizeText(entityId),
      detail ? JSON.stringify(detail) : null,
      sanitizeText(ipAddress)
    ]
  );
};

const getActivityLogs = async ({ limit = 200 }) => {
  const pool = getPool();
  const parsedLimit = Number.isFinite(Number(limit))
    ? Math.min(Math.max(parseInt(limit, 10), 1), 500)
    : 200;

  const { rows } = await pool.query(
    `
      SELECT
        id,
        COALESCE(NULLIF(username, ''), 'Unknown') AS username,
        action,
        entity,
        entity_id AS "entityId",
        detail,
        ip_address AS "ipAddress",
        created_at AS "createdAt"
      FROM activity_logs
      WHERE created_at >= NOW() - $2::interval
      ORDER BY created_at DESC
      LIMIT $1;
    `,
    [parsedLimit, `${RETENTION_DAYS} days`]
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
