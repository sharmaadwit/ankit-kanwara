const { getPool } = require('../db');

const sanitizeText = (value) =>
  value === undefined || value === null ? null : String(value).trim() || null;

const logActivity = async ({
  username,
  action,
  entity,
  entityId,
  detail,
  ipAddress
}) => {
  const pool = getPool();
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
      ORDER BY created_at DESC
      LIMIT $1;
    `,
    [parsedLimit]
  );

  return rows.map((row) => ({
    ...row,
    detail: row.detail || {}
  }));
};

module.exports = {
  logActivity,
  getActivityLogs
};


