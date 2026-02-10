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
    const { rows } = await pool.query(
      'SELECT id, username, email, password_hash, roles, regions, sales_reps, default_region, is_active, force_password_change FROM users WHERE LOWER(username) = $1 AND is_active = true;',
      [trimmedUsername]
    );
    if (!rows.length) {
      // Log failed login attempt
      await logLoginAttempt({
        username: trimmedUsername,
        status: 'failure',
        message: 'User not found',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        transactionId: req.transactionId
      });
      logger.warn('auth_login_failed', { username: trimmedUsername, reason: 'user_not_found', transactionId: req.transactionId });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      // Log failed login attempt
      await logLoginAttempt({
        username: trimmedUsername,
        status: 'failure',
        message: 'Invalid password',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
        transactionId: req.transactionId
      });
      logger.warn('auth_login_failed', { username: trimmedUsername, reason: 'bad_password', transactionId: req.transactionId });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Generate session ID for tracking
    const trackingSessionId = crypto.randomUUID();

    // Create server session
    const { sessionId, expiresAt } = await createSession(user.id);

    // Log successful login with session ID
    await logLoginAttempt({
      username: trimmedUsername,
      status: 'success',
      message: 'Login successful',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.connection.remoteAddress,
      transactionId: req.transactionId,
      sessionId: trackingSessionId
    });

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
  const sessionId = req.cookies && req.cookies[SESSION_COOKIE_NAME];
  if (!sessionId) {
    return res.status(401).json({ message: 'Not authenticated.' });
  }
  const session = await getSession(sessionId);
  if (!session) {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/', httpOnly: true });
    return res.status(401).json({ message: 'Session expired.' });
  }
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
