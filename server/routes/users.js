/**
 * Roster API for Phase 3 (S3.7).
 * GET /api/users - returns user list for dropdowns/assignments (same shape as client expects).
 * Source of truth: DB users table. No passwords.
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

function coerceRoles(roles) {
  if (roles == null) return [];
  if (Array.isArray(roles)) return roles.map((r) => String(r).trim()).filter(Boolean);
  if (typeof roles === 'string') {
    const s = roles.trim();
    if (!s) return [];
    try {
      const p = JSON.parse(s);
      if (Array.isArray(p)) return p.map((r) => String(r).trim()).filter(Boolean);
    } catch (_) {
      /* not JSON */
    }
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  }
  return [];
}

const toPublicUser = (row) => ({
  id: row.id,
  username: row.username,
  email: row.email || null,
  roles: coerceRoles(row.roles),
  regions: Array.isArray(row.regions) ? row.regions : (row.regions || []),
  salesReps: Array.isArray(row.sales_reps) ? row.sales_reps : (row.sales_reps || []),
  defaultRegion: row.default_region || '',
  isActive: row.is_active
});

/**
 * GET /api/users
 * Returns active users for roster/dropdowns. No auth required for now (optional: add requireSession later).
 */
router.get('/', async (req, res) => {
  try {
    const { rows } = await getPool().query(
      `SELECT id, username, email, roles, regions, sales_reps, default_region, is_active
       FROM users WHERE is_active = true ORDER BY username ASC;`
    );
    res.json(rows.map(toPublicUser));
  } catch (error) {
    if (error.code === '42P01') {
      return res.json([]);
    }
    const logger = require('../logger');
    logger.error('users_roster_failed', { message: error.message, transactionId: req.transactionId });
    res.status(500).json({ message: 'Failed to load users.' });
  }
});

module.exports = router;
