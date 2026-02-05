#!/usr/bin/env node
/**
 * List who logged in during the last N hours (for correlating with 404/unknown in storage logs).
 * Usage: node server/scripts/logins-last-hour.js [hours] [exclude_username]
 * Example: node server/scripts/logins-last-hour.js 2 ankit.kanwara
 *   → lists all logins in last 2 hours except ankit.kanwara.
 * Example: node server/scripts/logins-last-hour.js ankit.kanwara  (default 1 hour)
 * Requires: DATABASE_URL (or PG* env) set.
 */
const path = require('path');
const projectRoot = path.resolve(__dirname, '..', '..');
require('dotenv').config({ path: path.join(projectRoot, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { getPool } = require('../db');

const arg1 = process.argv[2] ? process.argv[2].trim() : null;
const arg2 = process.argv[3] ? process.argv[3].trim() : null;
const hoursNum = /^\d+$/.test(arg1) ? parseInt(arg1, 10) : 1;
const excludeUsername = (arg1 && !/^\d+$/.test(arg1) ? arg1 : arg2) ? (arg1 && !/^\d+$/.test(arg1) ? arg1 : arg2).toLowerCase() : null;

async function run() {
  const pool = getPool();
  const since = new Date(Date.now() - hoursNum * 60 * 60 * 1000).toISOString();

  console.log('\nLogin activity in the last ' + hoursNum + ' hour(s) (UTC):');
  if (excludeUsername) {
    console.log('  (excluding username containing "' + excludeUsername + '")\n');
  } else {
    console.log('  (pass hours then exclude_username, e.g. logins-last-hour.js 2 ankit.kanwara)\n');
  }

  const { rows } = await pool.query(
    `
    SELECT
      username,
      status,
      message,
      ip_address AS "ipAddress",
      created_at AS "createdAt"
    FROM login_logs
    WHERE created_at >= $1::timestamptz
    ORDER BY created_at DESC;
    `,
    [since]
  );

  const filtered = excludeUsername
    ? rows.filter((r) => !(r.username && r.username.toLowerCase().includes(excludeUsername)))
    : rows;

  if (filtered.length === 0) {
    console.log('  No logins in the last ' + hoursNum + ' hour(s).');
    if (rows.length > 0 && excludeUsername) {
      console.log('  (' + rows.length + ' login(s) were excluded by filter.)');
    }
    console.log('');
    process.exit(0);
    return;
  }

  const byUser = {};
  filtered.forEach((r) => {
    const u = r.username || 'Unknown';
    if (!byUser[u]) byUser[u] = { count: 0, lastAt: r.createdAt, statuses: new Set(), ips: new Set() };
    byUser[u].count += 1;
    if (new Date(r.createdAt) > new Date(byUser[u].lastAt)) byUser[u].lastAt = r.createdAt;
    byUser[u].statuses.add(r.status);
    if (r.ipAddress) byUser[u].ips.add(r.ipAddress);
  });

  console.log('  User (or Unknown)     | Logins | Last seen (UTC)        | Status(es) | IP(s)');
  console.log('  ' + '-'.repeat(90));
  Object.entries(byUser)
    .sort((a, b) => b[1].lastAt.localeCompare(a[1].lastAt))
    .forEach(([user, info]) => {
      const lastAt = new Date(info.lastAt).toISOString().replace('T', ' ').slice(0, 19);
      const statuses = [...info.statuses].join(', ');
      const ips = [...info.ips].slice(0, 2).join(', ') || '—';
      const userPad = (user + ' ').padEnd(22).slice(0, 22);
      console.log(`  ${userPad} | ${String(info.count).padStart(6)} | ${lastAt} | ${(statuses || '—').padEnd(10).slice(0, 10)} | ${ips}`);
    });

  console.log('\n  If storage_get_404 shows username "unknown", the request had no X-Admin-User header.');
  console.log('  Correlate by time: check which of the users above was active when the 404 was logged.\n');
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
