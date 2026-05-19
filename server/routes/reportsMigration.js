/**
 * Migrated (pre-2026) activity data for Annual report (PDF) only.
 *
 * GET /api/reports/migrated-activities?year=2025
 * GET /api/reports/migrated-activity-years
 */

const express = require('express');
const {
  loadMigratedActivitiesForYear,
  listMigratedActivityYears
} = require('../services/migrationActivitiesLoad');
const logger = require('../logger');

const router = express.Router();

router.get('/migrated-activity-years', async (req, res) => {
  try {
    const years = await listMigratedActivityYears();
    return res.json({ ok: true, years });
  } catch (error) {
    logger.warn('reports_migrated_years_failed', { message: error.message });
    return res.status(500).json({ ok: false, error: error.message || 'Failed to list migration years' });
  }
});

router.get('/migrated-activities', async (req, res) => {
  const year = String(req.query.year || '').trim();
  if (!/^\d{4}$/.test(year)) {
    return res.status(400).json({ ok: false, error: 'year must be YYYY (e.g. 2025)' });
  }
  if (year >= '2026') {
    return res.json({
      ok: true,
      year,
      months: [],
      activities: [],
      externalCount: 0,
      internalCount: 0,
      note: 'Live activity storage covers 2026+; migration merge applies to years before 2026.'
    });
  }

  try {
    const payload = await loadMigratedActivitiesForYear(year);
    return res.json({ ok: true, ...payload });
  } catch (error) {
    logger.warn('reports_migrated_activities_failed', { message: error.message, year });
    return res.status(500).json({ ok: false, error: error.message || 'Failed to load migrated activities' });
  }
});

module.exports = router;
