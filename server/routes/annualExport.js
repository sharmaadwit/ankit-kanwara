/**
 * Annual user activity export API
 *
 * GET /api/export/annual-user-activity
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   &format=json|summary-csv|detail-csv|bundle
 *
 * GET /api/export/annual-user-activity/schema
 *   Returns defaults and format list (no data load).
 *
 * Auth: session, X-Admin-User, or X-Api-Key / ?apiKey= (STORAGE_API_KEY).
 */

const express = require('express');
const {
  loadAndBuildAnnualExport,
  rowsToCsv,
  defaultAnnualFromDate,
  defaultAnnualToDate
} = require('../services/annualUserActivityExport');
const logger = require('../logger');

const router = express.Router();

const isValidYmd = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());

const parseDateRange = (query) => {
  const fromDate = isValidYmd(query.from) ? query.from.trim() : defaultAnnualFromDate();
  const toDate = isValidYmd(query.to) ? query.to.trim() : defaultAnnualToDate();
  if (fromDate > toDate) {
    const err = new Error('from must be on or before to');
    err.statusCode = 400;
    throw err;
  }
  return { fromDate, toDate };
};

const SUMMARY_HEADERS = [
  'user',
  'totalActivities',
  'internal',
  'external',
  'customerCall',
  'sow',
  'poc',
  'rfx',
  'pricing',
  'other',
  'firstActivityDate',
  'lastActivityDate'
];

const DETAIL_HEADERS = [
  'activityId',
  'activityDate',
  'month',
  'user',
  'isInternal',
  'type',
  'callType',
  'accountName',
  'accountId',
  'salesRep',
  'region',
  'durationHours',
  'projectId'
];

router.get('/annual-user-activity/schema', (req, res) => {
  const fromDate = defaultAnnualFromDate();
  const toDate = defaultAnnualToDate();
  res.json({
    ok: true,
    description: 'Presales activity export from 1 July through today (defaults adjust by calendar year).',
    defaults: { from: fromDate, to: toDate },
    formats: [
      { id: 'json', description: 'Full JSON: meta, summaryByUser, activities' },
      { id: 'bundle', description: 'JSON with relative CSV download URLs' },
      { id: 'summary-csv', description: 'CSV: one row per user' },
      { id: 'detail-csv', description: 'CSV: one row per activity' }
    ],
    endpoints: {
      export: '/api/export/annual-user-activity',
      schema: '/api/export/annual-user-activity/schema'
    },
    auth: 'X-Api-Key header, ?apiKey= query, X-Admin-User, or logged-in session'
  });
});

router.get('/annual-user-activity', async (req, res) => {
  let fromDate;
  let toDate;
  try {
    ({ fromDate, toDate } = parseDateRange(req.query));
  } catch (err) {
    return res.status(err.statusCode || 400).json({ ok: false, message: err.message });
  }

  const format = String(req.query.format || 'json').toLowerCase();
  const allowed = new Set(['json', 'bundle', 'summary-csv', 'detail-csv']);
  if (!allowed.has(format)) {
    return res.status(400).json({
      ok: false,
      message: `Invalid format "${format}". Use: ${Array.from(allowed).join(', ')}`
    });
  }

  const started = Date.now();
  try {
    const payload = await loadAndBuildAnnualExport({ fromDate, toDate });

    logger.info('annual_export_ok', {
      fromDate,
      toDate,
      format,
      activities: payload.meta.totalActivitiesInRange,
      users: payload.meta.userCount,
      durationMs: Date.now() - started
    });

    if (format === 'summary-csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="annual-user-activity-summary_${fromDate}_to_${toDate}.csv"`
      );
      return res.send(rowsToCsv(SUMMARY_HEADERS, payload.summaryByUser));
    }

    if (format === 'detail-csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="annual-user-activity-detail_${fromDate}_to_${toDate}.csv"`
      );
      return res.send(rowsToCsv(DETAIL_HEADERS, payload.activities));
    }

    if (format === 'bundle') {
      const q = `from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;
      return res.json({
        ok: true,
        meta: payload.meta,
        summaryByUser: payload.summaryByUser,
        activities: payload.activities,
        downloads: {
          summaryCsv: `/api/export/annual-user-activity?${q}&format=summary-csv`,
          detailCsv: `/api/export/annual-user-activity?${q}&format=detail-csv`
        }
      });
    }

    return res.json({ ok: true, ...payload });
  } catch (error) {
    logger.error('annual_export_failed', {
      message: error.message,
      fromDate,
      toDate,
      format,
      durationMs: Date.now() - started
    });
    return res.status(502).json({
      ok: false,
      message: error.message || 'Failed to build annual export'
    });
  }
});

module.exports = router;
