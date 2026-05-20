#!/usr/bin/env node
/**
 * Dry-run / apply: salesRepRegion from PreSight users (assignedUserEmail → defaultRegion).
 *
 * Dry-run:
 *   railway ssh --service ankit-kanwara "node server/scripts/cleanup-sales-rep-regions.js"
 *
 * Apply:
 *   railway ssh --service ankit-kanwara "DRY_RUN=false APPLY=true node server/scripts/cleanup-sales-rep-regions.js"
 *
 * Or (after deploy) as admin in browser console:
 *   fetch('/api/admin/region-cleanup/dry-run', { credentials: 'include' }).then(r=>r.json()).then(console.log)
 */

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { getPool, initDb, closePool } = require('../db');
const { runRegionCleanupDryRun } = require('../services/regionCleanupDryRun');

const APPLY = String(process.env.APPLY || '').toLowerCase() === 'true';
const DRY_RUN_OVERRIDE = String(process.env.DRY_RUN || '').toLowerCase();
const DRY_RUN = DRY_RUN_OVERRIDE === '' ? !APPLY : DRY_RUN_OVERRIDE !== 'false';

(async () => {
  console.log(`[config] DRY_RUN=${DRY_RUN} APPLY=${APPLY}`);
  await initDb();
  const pool = getPool();
  const report = await runRegionCleanupDryRun(pool);

  console.log('\n========== DRY-RUN SUMMARY ==========');
  console.log(`Users map: ${report.presalesUsersWithRegion} (${report.userMapSource})`);
  console.log(
    `Live activities:     ${report.live.rows} rows, fix=${report.live.fixes}, ok=${report.live.alreadyOk}, no_logger=${report.live.noLoggerId}`
  );
  console.log(
    `Migration activities: ${report.migration.rows} rows, fix=${report.migration.fixes}, ok=${report.migration.alreadyOk}, no_logger=${report.migration.noLoggerId}`
  );
  console.log(`India South → other: ${report.summary.totalOffIndiaSouth}`);
  console.log(`TOTAL fixes:         ${report.summary.totalActivityFixes}`);
  console.log(
    `UNMAPPED:            ${report.summary.unmappedUnique} unique identifiers (${report.summary.unmappedRows} rows)`
  );

  console.log('\n--- UNMAPPED (fix email or defaultRegion in PreSight Users) ---');
  if (!report.unmapped.length) {
    console.log('  (none)');
  } else {
    for (const u of report.unmapped) {
      console.log(`  ${u.rowCount}x  ${u.identifier}`);
    }
  }

  const reportPath = path.join(
    __dirname,
    `region-cleanup-dryrun-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n[report] ${reportPath}`);

  if (DRY_RUN) {
    console.log('\nDry-run only. Apply with DRY_RUN=false APPLY=true after unmapped users are fixed.');
    await closePool();
    return;
  }

  if (!APPLY) {
    await closePool();
    return;
  }

  console.log('\n[apply] Not implemented in this script revision — use a follow-up apply pass or ask for APPLY wiring.');
  await closePool();
})().catch((err) => {
  console.error('[fatal]', err.message || err);
  process.exit(1);
});
