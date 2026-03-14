const express = require('express');
const zlib = require('zlib');
const bcrypt = require('bcrypt');
const router = express.Router();

const { getPool } = require('../db');
const logger = require('../logger');

const USERS_KEY = 'users';

/** Shape expected by client (admin list, dropdowns). No password. */
function toPublicUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email || null,
    roles: Array.isArray(row.roles) ? row.roles : (row.roles || []),
    regions: Array.isArray(row.regions) ? row.regions : (row.regions || []),
    salesReps: Array.isArray(row.sales_reps) ? row.sales_reps : (row.sales_reps || []),
    defaultRegion: row.default_region || '',
    isActive: row.is_active,
    forcePasswordChange: Boolean(row.force_password_change),
    passwordUpdatedAt: row.password_updated_at || null
  };
}

/**
 * GET /api/admin/users
 * Returns all users from DB (active and inactive) for admin panel.
 * Use when storage key "users" is empty so the list is still visible.
 */
router.get('/', async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ message: 'Database not available' });
    }
    const { rows } = await pool.query(
      `SELECT id, username, email, roles, regions, sales_reps, default_region, is_active, force_password_change, password_updated_at
       FROM users ORDER BY username ASC;`
    );
    res.json(rows.map(toPublicUser));
  } catch (err) {
    if (err.code === '42P01') {
      return res.json([]);
    }
    logger.error('admin_users_list_failed', { message: err.message });
    res.status(500).json({ message: 'Failed to load users.' });
  }
});
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

/**
 * PATCH /api/admin/users/:id
 * Update one user (e.g. set force_password_change for next login).
 */
router.patch('/:id', async (req, res) => {
  try {
    const userId = (req.params.id || '').trim();
    if (!userId) return res.status(400).json({ message: 'User id is required' });
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const forcePasswordChange = body.forcePasswordChange === true;

    const pool = getPool();
    if (!pool) return res.status(503).json({ message: 'Database not available' });

    if (forcePasswordChange) {
      const { rowCount } = await pool.query(
        `UPDATE users SET force_password_change = true, updated_at = NOW() WHERE id = $1`,
        [userId]
      );
      if (rowCount === 0) return res.status(404).json({ message: 'User not found' });
      logger.info('admin_user_force_password_change', { userId, by: req.get('x-admin-user') || 'admin' });
      return res.json({ success: true, message: 'User will be prompted to change password on next login.' });
    }

    return res.status(400).json({ message: 'No supported update provided' });
  } catch (err) {
    logger.error('admin_users_patch_failed', { message: err.message });
    return res.status(500).json({ message: err.message || 'Failed to update user' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Deactivate or remove user from DB (soft-delete: set is_active = false to avoid breaking FK).
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = (req.params.id || '').trim();
    if (!userId) return res.status(400).json({ message: 'User id is required' });

    const pool = getPool();
    if (!pool) return res.status(503).json({ message: 'Database not available' });

    const { rowCount } = await pool.query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
    if (rowCount === 0) return res.status(404).json({ message: 'User not found' });
    logger.info('admin_user_deleted', { userId, by: req.get('x-admin-user') || 'admin' });
    return res.json({ success: true, message: 'User deactivated.' });
  } catch (err) {
    logger.error('admin_users_delete_failed', { message: err.message });
    return res.status(500).json({ message: err.message || 'Failed to delete user' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const username = (body.username != null ? String(body.username) : '').trim();
    const newPassword = (body.password != null ? String(body.password) : DEFAULT_PASSWORD).trim();

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

    // When storage has no users (e.g. DB-backed auth), update password in DB so reset still works
    if (!rows.length) {
      const { rows: dbUsers } = await pool.query(
        `SELECT id, username FROM users WHERE LOWER(username) = $1 OR LOWER(COALESCE(email, '')) = $1 LIMIT 1;`,
        [username.toLowerCase()]
      );
      if (dbUsers.length) {
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query(
          `UPDATE users SET password_hash = $1, force_password_change = false, password_updated_at = NOW(), updated_at = NOW() WHERE id = $2;`,
          [passwordHash, dbUsers[0].id]
        );
        logger.info('admin_user_password_reset_db', { username: dbUsers[0].username, by: req.get('x-admin-user') || 'admin' });
        return res.json({
          success: true,
          message: 'Password reset to default. User can log in with: ' + newPassword,
          username: dbUsers[0].username
        });
      }
      return res.status(404).json({ message: 'Users data not found and user not found in database.' });
    }

    let raw = rows[0].value;
    if (raw == null) {
      return res.status(404).json({ message: 'Users data not found' });
    }
    if (typeof raw !== 'string') {
      raw = String(raw);
    }
    const decoded = maybeDecompress(raw);
    let users;
    try {
      if (typeof decoded === 'object' && decoded !== null && Array.isArray(decoded)) {
        users = decoded;
      } else if (typeof decoded === 'string') {
        users = JSON.parse(decoded);
      } else {
        return res.status(500).json({ message: 'Invalid users data' });
      }
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
