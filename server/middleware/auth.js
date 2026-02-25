const logger = require('../logger');
const { getSession } = require('../services/session');
const { getPool } = require('../db');

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'pams_sid';

/**
 * Cookie-first auth: if session cookie is present and valid, set req.user and req.headers['x-admin-user']
 * so requireStorageAuth passes. If no cookie or invalid, next(); requireStorageAuth still allows X-Admin-User or API key.
 */
const sessionMiddleware = async (req, res, next) => {
  try {
    const sessionId = req.cookies && req.cookies[SESSION_COOKIE_NAME];
    if (!sessionId) return next();
    const session = await getSession(sessionId);
    if (!session) return next();
    req.user = {
      id: session.userId,
      username: session.username,
      email: session.email,
      roles: session.roles,
      regions: session.regions,
      salesReps: session.salesReps,
      defaultRegion: session.defaultRegion
    };
    req.headers['x-admin-user'] = session.username;
    return next();
  } catch (err) {
    logger.warn('session_middleware_error', { message: err.message });
    return next();
  }
};

const extractHeaderToken = (req, headerName) =>
  (req.get(headerName) || '').trim();

const isAdminRequest = (req) => {
  const sessionHeader = extractHeaderToken(req, 'x-admin-user');
  return !!sessionHeader;
};

const extractApiKey = () => (process.env.STORAGE_API_KEY || '').trim();

const requireStorageAuth = (req, res, next) => {
  const sessionHeader = extractHeaderToken(req, 'x-admin-user');
  if (sessionHeader) {
    return next();
  }

  const expectedKey = extractApiKey();
  if (!expectedKey) {
    return next();
  }

  const providedKey =
    extractHeaderToken(req, 'x-api-key') ||
    req.query.apiKey ||
    req.query.api_key ||
    '';

  if (providedKey && providedKey === expectedKey) {
    return next();
  }

  logger.warn('storage_auth_failed', {
    path: req.originalUrl || req.url,
    remoteAddress: req.ip
  });
  return res.status(401).json({ message: 'Unauthorized' });
};

/** Verify username is admin in DB (for X-Admin-User header when no cookie). */
const verifyAdminUserInDb = async (username) => {
  if (!username || typeof username !== 'string') return false;
  const pool = getPool();
  if (!pool) return false;
  try {
    const { rows } = await pool.query(
      "SELECT 1 FROM users WHERE username = $1 AND is_active = true AND $2 = ANY(roles)",
      [username.trim(), 'Admin']
    );
    return rows && rows.length > 0;
  } catch {
    return false;
  }
};

const requireAdminAuth = (req, res, next) => {
  const providedKey = extractHeaderToken(req, 'x-admin-api-key');
  const expectedKey = extractApiKey();

  if (providedKey && expectedKey && providedKey === expectedKey) {
    return next();
  }

  const adminUser = extractHeaderToken(req, 'x-admin-user');
  if (adminUser) {
    verifyAdminUserInDb(adminUser)
      .then((ok) => {
        if (ok) return next();
        logger.warn('admin_auth_failed', { path: req.originalUrl || req.url, reason: 'user_not_admin' });
        res.status(401).json({ message: 'Admin authentication required' });
      })
      .catch((err) => {
        logger.warn('admin_auth_failed', { path: req.originalUrl || req.url, message: err.message });
        res.status(401).json({ message: 'Admin authentication required' });
      });
    return;
  }

  logger.warn('admin_auth_failed', {
    path: req.originalUrl || req.url,
    remoteAddress: req.ip
  });

  return res.status(401).json({ message: 'Admin authentication required' });
};

module.exports = {
  sessionMiddleware,
  requireStorageAuth,
  requireAdminAuth
};

