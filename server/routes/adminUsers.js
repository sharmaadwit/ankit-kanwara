const express = require('express');
const zlib = require('zlib');
const router = express.Router();

const { getPool } = require('../db');
const logger = require('../logger');

const USERS_KEY = 'users';
const DEFAULT_PASSWORD = 'Welcome@Gupshup1';
const GZIP_PREFIX = '__gz__';

let decompressLz;
try {
  decompressLz = require('../../pams-app/js/vendor/lz-string.js').decompressFromBase64;
} catch {
  decompressLz = null;
}

function maybeDecompress(raw) {
  if (raw == null || typeof raw !== 'string') return raw;
  if (raw.startsWith(GZIP_PREFIX)) {
    try {
      const buf = Buffer.from(raw.slice(GZIP_PREFIX.length), 'base64');
      return zlib.gunzipSync(buf).toString('utf8');
    } catch (err) {
      logger.warn('admin_users_decompress_gz_failed', { message: err.message });
      return raw;
    }
  }
  if (raw.startsWith('__lz__') && decompressLz) {
    try {
      return decompressLz(raw.slice('__lz__'.length)) || raw;
    } catch (err) {
      logger.warn('admin_users_decompress_lz_failed', { message: err.message });
      return raw;
    }
  }
  return raw;
}

router.post('/reset-password', async (req, res) => {
  try {
    const username = (req.body?.username || '').trim();
    const newPassword = (req.body?.password || DEFAULT_PASSWORD).trim();

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ message: 'Database not available' });
    }

    const { rows } = await pool.query(
      'SELECT value FROM storage WHERE key = $1 LIMIT 1;',
      [USERS_KEY]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Users data not found' });
    }

    const raw = rows[0].value;
    const decoded = maybeDecompress(raw);
    let users;
    try {
      users = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
    } catch (err) {
      logger.warn('admin_users_parse_failed', { message: err.message });
      return res.status(500).json({ message: 'Invalid users data' });
    }

    if (!Array.isArray(users)) {
      return res.status(500).json({ message: 'Users data is not an array' });
    }

    const lower = username.toLowerCase();
    const index = users.findIndex(
      (u) =>
        (u.username || '').toLowerCase() === lower ||
        (u.email || '').toLowerCase() === lower ||
        (String(u.name || '').toLowerCase()).includes(lower) ||
        (String(u.username || '').toLowerCase()).replace(/\./g, ' ').includes(lower)
    );

    if (index === -1) {
      return res.status(404).json({ message: 'User not found: ' + username });
    }

    const user = users[index];
    user.password = newPassword || DEFAULT_PASSWORD;
    user.forcePasswordChange = false;
    user.passwordUpdatedAt = new Date().toISOString();
    users[index] = user;

    const serialized = JSON.stringify(users);
    await pool.query(
      `
      INSERT INTO storage (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = excluded.value, updated_at = NOW();
      `,
      [USERS_KEY, serialized]
    );

    logger.info('admin_user_password_reset', {
      username: user.username,
      by: req.get('x-admin-user') || 'admin'
    });

    return res.json({
      success: true,
      message: 'Password reset to default. User can log in with: ' + (newPassword || DEFAULT_PASSWORD),
      username: user.username
    });
  } catch (error) {
    logger.error('admin_users_reset_password_failed', { message: error.message });
    return res.status(500).json({ message: error.message || 'Failed to reset password' });
  }
});

module.exports = router;
