/**
 * POST /api/admin/presales-regions/sync — upsert confirmed presales users + default_region in Postgres.
 */

const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const router = express.Router();
const { getPool } = require('../db');
const { requireAdminAuth } = require('../middleware/auth');
const { MANUAL_PRESALES_USERS } = require('../scripts/lib/manualPresalesRegionByEmail');
const logger = require('../logger');

const DEFAULT_PASSWORD = 'Welcome@Gupshup1';

router.post('/sync', requireAdminAuth, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ message: 'Database not available' });

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    let updated = 0;
    let inserted = 0;

    for (const template of MANUAL_PRESALES_USERS) {
      const username = (template.username || '').trim().toLowerCase();
      const email = (template.email || '').trim().toLowerCase();
      const defaultRegion = (template.defaultRegion || '').trim();
      const regions = Array.isArray(template.regions)
        ? template.regions
        : defaultRegion
          ? [defaultRegion]
          : [];
      if (!username || !email) continue;

      const id = crypto.randomUUID();
      const result = await pool.query(
        `INSERT INTO users (
          id, username, email, password_hash, roles, regions, sales_reps, default_region,
          is_active, force_password_change, password_updated_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true, NULL, NOW(), NOW())
        ON CONFLICT (username) DO UPDATE SET
          email = EXCLUDED.email,
          default_region = EXCLUDED.default_region,
          regions = EXCLUDED.regions,
          is_active = true,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted`,
        [
          id,
          username,
          email,
          passwordHash,
          ['Presales User'],
          regions,
          [],
          defaultRegion
        ]
      );
      if (result.rows[0]?.inserted) inserted += 1;
      else updated += 1;
    }

    logger.info('presales_regions_sync', { inserted, updated, total: MANUAL_PRESALES_USERS.length });
    res.json({
      ok: true,
      inserted,
      updated,
      total: MANUAL_PRESALES_USERS.length
    });
  } catch (err) {
    logger.error('presales_regions_sync_failed', { message: err.message });
    res.status(500).json({ message: err.message || 'Sync failed' });
  }
});

module.exports = router;
