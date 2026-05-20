/**
 * GET /api/admin/region-cleanup/dry-run — map regions from users.email → default_region
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { requireAdminAuth } = require('../middleware/auth');
const { runRegionCleanupDryRun } = require('../services/regionCleanupDryRun');
const logger = require('../logger');

router.get('/dry-run', requireAdminAuth, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ message: 'Database not available' });
    }
    const report = await runRegionCleanupDryRun(pool);
    logger.info('region_cleanup_dry_run', {
      fixes: report.summary.totalActivityFixes,
      unmapped: report.summary.unmappedUnique
    });
    res.json({ ok: true, dryRun: true, ...report });
  } catch (err) {
    logger.error('region_cleanup_dry_run_failed', { message: err.message });
    res.status(500).json({ message: err.message || 'Dry-run failed' });
  }
});

module.exports = router;
