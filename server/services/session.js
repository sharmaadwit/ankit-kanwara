/**
 * Session store for server-side auth (Phase 3).
 * Create/destroy sessions; resolve session id to user.
 * Stub: implement createSession, getSession, destroySession using DB sessions table.
 */

const crypto = require('crypto');
const { getPool } = require('../db');

const SESSION_TTL_SEC = parseInt(process.env.SESSION_TTL_SEC || '86400', 10); // 24h default

const generateSessionId = () => crypto.randomBytes(32).toString('hex');

/**
 * Create a session for the given user. Returns session id and expiry.
 * @param {string} userId - users.id
 * @returns {Promise<{ sessionId: string, expiresAt: Date }>}
 */
const createSession = async (userId) => {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000);
  await getPool().query(
    `INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3);`,
    [sessionId, userId, expiresAt]
  );
  return { sessionId, expiresAt };
};

/**
 * Get session and user. Returns null if not found or expired.
 * @param {string} sessionId
 * @returns {Promise<{ userId: string, username: string, email?: string, roles: string[], regions: string[] } | null>}
 */
const getSession = async (sessionId) => {
  if (!sessionId || typeof sessionId !== 'string') return null;
  const { rows } = await getPool().query(
    `SELECT s.user_id, s.expires_at, u.username, u.email, u.roles, u.regions, u.sales_reps, u.default_region
     FROM sessions s
     JOIN users u ON u.id = s.user_id AND u.is_active = true
     WHERE s.id = $1 AND s.expires_at > NOW();`,
    [sessionId.trim()]
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    userId: r.user_id,
    username: r.username,
    email: r.email || null,
    roles: Array.isArray(r.roles) ? r.roles : [],
    regions: Array.isArray(r.regions) ? r.regions : [],
    salesReps: Array.isArray(r.sales_reps) ? r.sales_reps : [],
    defaultRegion: r.default_region || ''
  };
};

/**
 * Destroy a session by id.
 * @param {string} sessionId
 */
const destroySession = async (sessionId) => {
  if (!sessionId) return;
  await getPool().query('DELETE FROM sessions WHERE id = $1;', [sessionId.trim()]);
};

/**
 * Optional: cleanup expired sessions (call from cron or on startup).
 */
const cleanupExpiredSessions = async () => {
  const { rowCount } = await getPool().query('DELETE FROM sessions WHERE expires_at <= NOW();');
  return rowCount;
};

module.exports = {
  createSession,
  getSession,
  destroySession,
  cleanupExpiredSessions,
  SESSION_TTL_SEC
};
