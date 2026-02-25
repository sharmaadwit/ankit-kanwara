/**
 * Auth routes for Phase 3 server-side auth.
 * POST /api/auth/login  - validate credentials, create session, set cookie, return user (no password).
 * POST /api/auth/logout - destroy session, clear cookie.
 * GET  /api/auth/me     - return current user from session (optional).
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getPool } = require('../db');
const { createSession, getSession, destroySession } = require('../services/session');
const { logLoginAttempt, logLogoutEvent } = require('../services/loginLogs');
const logger = require('../logger');
const crypto = require('crypto');
const zlib = require('zlib');

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'pams_sid';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: parseInt(process.env.SESSION_TTL_SEC || '86400', 10) * 1000,
  path: '/'
};

/** Return user shape for client (no password_hash). */
const toPublicUser = (row) => ({
  id: row.id,
  username: row.username,
  email: row.email || null,
  roles: Array.isArray(row.roles) ? row.roles : (row.roles || []),
  regions: Array.isArray(row.regions) ? row.regions : (row.regions || []),
  salesReps: Array.isArray(row.sales_reps) ? row.sales_reps : (row.sales_reps || []),
  defaultRegion: row.default_region || '',
  isActive: row.is_active,
  forcePasswordChange: row.force_password_change || false
});

const GZIP_PREFIX = '__gz__';
let decompressLz;
try {
  decompressLz = require('../../pams-app/js/vendor/lz-string.js').decompressFromBase64;
} catch {
  decompressLz = null;
}

const maybeDecompressLegacy = (raw) => {
  if (raw == null || typeof raw !== 'string') return raw;
  if (raw.startsWith(GZIP_PREFIX)) {
    try {
      return zlib.gunzipSync(Buffer.from(raw.slice(GZIP_PREFIX.length), 'base64')).toString('utf8');
    } catch {
      return raw;
    }
  }
  if (raw.startsWith('__lz__') && decompressLz) {
    try {
      return decompressLz(raw.slice('__lz__'.length)) || raw;
    } catch {
      return raw;
    }
  }
  return raw;
};

const parseLegacyUsersArray = (raw) => {
  try {
    const decoded = maybeDecompressLegacy(raw);
    if (Array.isArray(decoded)) return decoded;
    if (typeof decoded === 'string') {
      const parsed = JSON.parse(decoded);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
};

const findLegacyUser = (legacyUsers, identityLower) =>
  (legacyUsers || []).find((u) => {
    const username = String((u && u.username) || '').trim().toLowerCase();
    const email = String((u && u.email) || '').trim().toLowerCase();
    const active = u && Object.prototype.hasOwnProperty.call(u, 'isActive') ? !!u.isActive : true;
    return active && (username === identityLower || email === identityLower);
  });

const safeLogLoginAttempt = async (payload, transactionId) => {
  try {
    await logLoginAttempt(payload);
  } catch (error) {
    logger.warn('auth_login_log_failed', {
      message: error.message,
      transactionId
    });
  }
};

const migrateLegacyUserToDb = async (pool, legacyUser) => {
  const username = String(legacyUser.username || legacyUser.email || '').trim().toLowerCase();
  if (!username) return null;

  const legacyPassword = String(legacyUser.password || '').trim();
  if (!legacyPassword) return null;

  const passwordHash = await bcrypt.hash(legacyPassword, 10);
  const preferredId = String(legacyUser.id || '').trim() || crypto.randomUUID();
  const email = legacyUser.email ? String(legacyUser.email).trim().toLowerCase() : null;
  const roles = Array.isArray(legacyUser.roles) ? legacyUser.roles : [];
  const regions = Array.isArray(legacyUser.regions) ? legacyUser.regions : [];
  const salesReps = Array.isArray(legacyUser.salesReps) ? legacyUser.salesReps : [];
  const defaultRegion = legacyUser.defaultRegion ? String(legacyUser.defaultRegion) : '';
  const isActive = legacyUser.isActive !== false;
  const forcePasswordChange = !!legacyUser.forcePasswordChange;
  const passwordUpdatedAt = legacyUser.passwordUpdatedAt ? new Date(legacyUser.passwordUpdatedAt) : new Date();

  const { rows } = await pool.query(
    `
      INSERT INTO users (
        id, username, email, password_hash, roles, regions, sales_reps, default_region,
        is_active, force_password_change, password_updated_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (username)
      DO UPDATE SET
        email = COALESCE(EXCLUDED.email, users.email),
        password_hash = EXCLUDED.password_hash,
        roles = EXCLUDED.roles,
        regions = EXCLUDED.regions,
        sales_reps = EXCLUDED.sales_reps,
        default_region = EXCLUDED.default_region,
        is_active = EXCLUDED.is_active,
        force_password_change = EXCLUDED.force_password_change,
        password_updated_at = EXCLUDED.password_updated_at,
        updated_at = NOW()
      RETURNING id, username, email, password_hash, roles, regions, sales_reps, default_region, is_active, force_password_change;
    `,
    [
      preferredId,
      username,
      email,
      passwordHash,
      roles,
      regions,
      salesReps,
      defaultRegion,
      isActive,
      forcePasswordChange,
      passwordUpdatedAt
    ]
  );
  return rows[0] || null;
};

/**
 * POST /api/auth/login
 * Body: { username: string, password: string }
 * Success: 200, Set-Cookie, { user }
 * Failure: 401 { message }
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const trimmedUsername = (username || '').trim().toLowerCase();
    if (!trimmedUsername || typeof password !== 'string') {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const pool = getPool();
    let { rows } = await pool.query(
      `SELECT id, username, email, password_hash, roles, regions, sales_reps, default_region, is_active, force_password_change
       FROM users
       WHERE (LOWER(username) = $1 OR LOWER(COALESCE(email, '')) = $1) AND is_active = true
       LIMIT 1;`,
      [trimmedUsername]
    );
    if (!rows.length) {
      // Legacy fallback: if DB user does not exist yet, try migrating from storage.users.
      try {
        const legacyRaw = await pool.query(
          'SELECT value FROM storage WHERE key = $1 LIMIT 1;',
          ['users']
        );
        const legacyUsers = parseLegacyUsersArray(legacyRaw.rows[0] && legacyRaw.rows[0].value);
        const legacyUser = findLegacyUser(legacyUsers, trimmedUsername);
        if (legacyUser) {
          // Validate legacy password before migration.
          const legacyPassword = String(legacyUser.password || '').trim();
          if (legacyPassword && legacyPassword === password) {
            const migrated = await migrateLegacyUserToDb(pool, legacyUser);
            if (migrated) {
              rows = [migrated];
              logger.info('auth_legacy_user_migrated', {
                username: migrated.username,
                transactionId: req.transactionId
              });
            }
          }
        }
      } catch (fallbackError) {
        logger.warn('auth_legacy_fallback_failed', {
          message: fallbackError.message,
          transactionId: req.transactionId
        });
      }
    }

    if (!rows.length) {
      // Log failed login attempt
      await safeLogLoginAttempt({
        username: trimmedUsername,
        status: 'failure',
        message: 'User not found',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        transactionId: req.transactionId
      }, req.transactionId);
      logger.warn('auth_login_failed', { username: trimmedUsername, reason: 'user_not_found', transactionId: req.transactionId });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      // Log failed login attempt
      await safeLogLoginAttempt({
        username: trimmedUsername,
        status: 'failure',
        message: 'Invalid password',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        transactionId: req.transactionId
      }, req.transactionId);
      logger.warn('auth_login_failed', { username: trimmedUsername, reason: 'bad_password', transactionId: req.transactionId });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate session ID for tracking
    const trackingSessionId = crypto.randomUUID();

    // Create server session
    const { sessionId, expiresAt } = await createSession(user.id);

    // Log successful login with session ID
    await safeLogLoginAttempt({
      username: trimmedUsername,
      status: 'success',
      message: 'Login successful',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      transactionId: req.transactionId,
      sessionId: trackingSessionId
    }, req.transactionId);

    res.cookie(SESSION_COOKIE_NAME, sessionId, { ...COOKIE_OPTIONS, expires: expiresAt });
    res.status(200).json({
      user: toPublicUser(user),
      forcePasswordChange: user.force_password_change || false,
      sessionId: trackingSessionId // Return session ID to client for logout tracking
    });
  } catch (error) {
    logger.error('auth_login_error', { message: error.message, transactionId: req.transactionId });
    res.status(500).json({ message: 'Login failed. Try again.' });
  }
});

/**
 * POST /api/auth/logout
 * Clear cookie and destroy session.
 */
router.post('/logout', async (req, res) => {
  const sessionId = req.cookies && req.cookies[SESSION_COOKIE_NAME];
  const trackingSessionId = req.body?.sessionId; // Get tracking session ID from request body

  if (sessionId) {
    try {
      await destroySession(sessionId);
    } catch (e) {
      logger.warn('auth_logout_destroy_failed', { message: e.message });
    }
  }

  // Log logout event if tracking session ID provided
  if (trackingSessionId) {
    try {
      await logLogoutEvent({
        sessionId: trackingSessionId,
        transactionId: req.transactionId
      });
    } catch (e) {
      logger.warn('auth_logout_log_failed', { message: e.message });
    }
  }

  res.clearCookie(SESSION_COOKIE_NAME, { path: '/', httpOnly: true });
  res.status(204).send();
});

/**
 * GET /api/auth/me
 * Return current user from session cookie. 401 if no session.
 */
router.get('/me', async (req, res) => {
  const meStart = Date.now();
  const sessionId = req.cookies && req.cookies[SESSION_COOKIE_NAME];
  if (!sessionId) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  const session = await getSession(sessionId);
  if (!session) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/', httpOnly: true });
    return res.status(401).json({ message: 'Session expired.' });
  }
  const durationMs = Date.now() - meStart;
  logger.info('auth_me', { durationMs });
  res.json({
    userId: session.userId,
    username: session.username,
    email: session.email,
    roles: session.roles,
    regions: session.regions,
    salesReps: session.salesReps,
    defaultRegion: session.defaultRegion
  });
});

module.exports = router;
