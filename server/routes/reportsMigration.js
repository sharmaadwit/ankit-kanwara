/**
 * Migrated (pre-2026) activity data for Annual report (PDF) only.
 *
 * GET /api/reports/migrated-activities?year=2025
 * GET /api/reports/migrated-activity-years
 */

const express = require('express');
const {
  loadMigratedActivitiesForYear,
  loadMigratedActivitiesForMonthRange,
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

const isValidYm = (s) => typeof s === 'string' && /^\d{4}-\d{2}$/.test(s.trim());

router.get('/migrated-activities', async (req, res) => {
  const fromMonth = String(req.query.from || '').trim();
  const toMonth = String(req.query.to || '').trim();
  if (isValidYm(fromMonth) && isValidYm(toMonth)) {
    if (fromMonth > toMonth) {
      return res.status(400).json({ ok: false, error: 'from must be on or before to (YYYY-MM)' });
    }
    try {
      const payload = await loadMigratedActivitiesForMonthRange(fromMonth, toMonth);
      return res.json({ ok: true, ...payload });
    } catch (error) {
      logger.warn('reports_migrated_activities_range_failed', { message: error.message, fromMonth, toMonth });
      return res.status(500).json({ ok: false, error: error.message || 'Failed to load migrated activities' });
    }
  }

  const year = String(req.query.year || '').trim();
  if (!/^\d{4}$/.test(year)) {
    return res.status(400).json({ ok: false, error: 'year must be YYYY, or use from=YYYY-MM&to=YYYY-MM' });
  }
  if (year >= '2026') {
    return res.json({
      ok: true,
      year,
      months: [],
      activities: [],
      externalCount: 0,
      internalCount: 0,
      note: 'Use from/to month range for fiscal annual windows; calendar year 2026+ live data is in activity shards.'
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
