#!/usr/bin/env node
/**
 * Export presales activity for all users from 1 July through today (configurable).
 *
 * Usage (from Project PAT folder):
 *   REMOTE_STORAGE_BASE=https://your-app.up.railway.app/api/storage \
 *   REMOTE_STORAGE_USER=your@email.com \
 *   STORAGE_API_KEY=... \
 *   node server/scripts/export-annual-user-activity.js
 *
 * Optional:
 *   ANNUAL_EXPORT_FROM=2025-07-01 ANNUAL_EXPORT_TO=2026-05-19
 *   ANNUAL_EXPORT_DIR=exports
 */

const path = require('path');

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
} catch (_) {
  // optional
}

const {
  loadAndBuildAnnualExport,
  writeAnnualExportFiles,
  defaultAnnualFromDate,
  defaultAnnualToDate
} = require('../services/annualUserActivityExport');

const main = async () => {
  const fromDate = process.env.ANNUAL_EXPORT_FROM || defaultAnnualFromDate();
  const toDate = process.env.ANNUAL_EXPORT_TO || defaultAnnualToDate();
  console.log(`Annual user activity export: ${fromDate} → ${toDate}`);
  console.log('Fetching from hosted storage…');

  const payload = await loadAndBuildAnnualExport({ fromDate, toDate });
  const outDir = process.env.ANNUAL_EXPORT_DIR || path.join(__dirname, '..', '..', 'exports');
  const paths = writeAnnualExportFiles(payload, outDir);

  console.log(`Activities in range: ${payload.meta.totalActivitiesInRange}`);
  console.log(`Users: ${payload.meta.userCount}`);
  console.log(`JSON:    ${paths.jsonPath}`);
  console.log(`Summary: ${paths.summaryCsvPath}`);
  console.log(`Detail:  ${paths.detailCsvPath}`);
};

main().catch((err) => {
  console.error('Export failed:', err.message);
  process.exit(1);
});
