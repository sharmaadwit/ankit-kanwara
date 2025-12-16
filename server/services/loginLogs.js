const { getPool } = require('../db');

const VALID_STATUSES = new Set(['success', 'failure']);

const normalizeStatus = (status) => {
  if (!status) return 'unknown';
  const normalized = String(status).trim().toLowerCase();
  return VALID_STATUSES.has(normalized) ? normalized : 'unknown';
};

const logLoginAttempt = async ({
  username,
  status,
  message,
  userAgent,
  ipAddress
}) => {
  const pool = getPool();
  await pool.query(
    `
      INSERT INTO login_logs (username, status, message, user_agent, ip_address)
      VALUES ($1, $2, $3, $4, $5);
    `,
    [
      username ? String(username).trim() : null,
      normalizeStatus(status),
      message ? String(message).trim() : null,
      userAgent ? String(userAgent).trim() : null,
      ipAddress ? String(ipAddress).trim() : null
    ]
  );
};

const getRecentLoginLogs = async (limit = 100) => {
  const pool = getPool();
  const parsedLimit = Number.isFinite(Number(limit))
    ? Math.min(Math.max(parseInt(limit, 10), 1), 500)
    : 100;

  const { rows } = await pool.query(
    `
      SELECT
        id,
        COALESCE(NULLIF(username, ''), 'Unknown') AS username,
        status,
        message,
        user_agent AS "userAgent",
        ip_address AS "ipAddress",
        created_at AS "createdAt"
      FROM login_logs
      ORDER BY created_at DESC
      LIMIT $1;
    `,
    [parsedLimit]
  );
  return rows;
};

const getUsageMetrics = async () => {
  const pool = getPool();

  const { rows: summaryRows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') AS total_today,
      COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 day') AS total_7d,
      COUNT(DISTINCT username) FILTER (WHERE created_at >= NOW() - INTERVAL '7 day' AND username IS NOT NULL AND username <> '') AS unique_users_7d
    FROM login_logs;
  `);

  const summary = summaryRows[0] || {
    total_today: 0,
    total_7d: 0,
    unique_users_7d: 0
  };

  const { rows: perDay } = await pool.query(`
    SELECT
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
      COUNT(*) AS count
    FROM login_logs
    WHERE created_at >= NOW() - INTERVAL '14 day'
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 14;
  `);

  const { rows: perUser } = await pool.query(`
    SELECT
      COALESCE(NULLIF(username, ''), 'Unknown') AS username,
      COUNT(*) AS count
    FROM login_logs
    WHERE created_at >= NOW() - INTERVAL '7 day'
    GROUP BY username
    ORDER BY count DESC, username ASC
    LIMIT 10;
  `);

  return {
    summary: {
      totalToday: Number(summary.total_today) || 0,
      total7Days: Number(summary.total_7d) || 0,
      uniqueUsers7Days: Number(summary.unique_users_7d) || 0
    },
    activityByDate: perDay
      .map((row) => ({
        date: row.date,
        count: Number(row.count) || 0
      }))
      .reverse(),
    topUsers: perUser.map((row) => ({
      username: row.username,
      count: Number(row.count) || 0
    }))
  };
};

module.exports = {
  logLoginAttempt,
  getRecentLoginLogs,
  getUsageMetrics
};




