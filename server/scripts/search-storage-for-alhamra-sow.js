#!/usr/bin/env node
/**
 * Search storage_history and pending_storage_saves for any "activities" payload
 * that contains alhamra.ae + SOW + Siddharth (to find when/if that data was lost).
 *
 * Run from repo root with DATABASE_URL (or PG* env) set:
 *   node server/scripts/search-storage-for-alhamra-sow.js
 */

const path = require('path');
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
} catch (_) {}

const { getPool } = require('../db');

function parseActivitiesFromValue(value) {
  if (value == null || value === '') return [];
  try {
    const str = typeof value === 'string' ? value : String(value);
    const decoded = str.startsWith('__gz__') ? require('zlib').gunzipSync(Buffer.from(str.slice(6), 'base64')).toString('utf8') : str;
    const parsed = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function findAlhamraSowSiddharth(activities) {
  return activities.filter((a) => {
    const account = (a.accountName || '').toLowerCase();
    const type = (a.type || '').toLowerCase();
    const user = ((a.userName || '') + ' ' + (a.assignedUserEmail || '')).toLowerCase();
    const hasAlhamra = account.includes('alhamra');
    const hasSow = type === 'sow';
    const hasSiddharth = user.includes('siddharth') || user.includes('sign');
    return hasAlhamra && hasSow && hasSiddharth;
  });
}

async function main() {
  const pool = getPool();

  console.log('--- storage_history (key = activities) ---');
  const { rows: historyRows } = await pool.query(
    `SELECT id, key, length(value) as len, updated_at, archived_at
     FROM storage_history WHERE key = 'activities' ORDER BY archived_at DESC LIMIT 100`
  );
  console.log('Rows in storage_history for activities:', historyRows.length);

  let foundInHistory = [];
  for (const row of historyRows) {
    const { rows: full } = await pool.query(
      'SELECT value FROM storage_history WHERE id = $1',
      [row.id]
    );
    const value = full[0] && full[0].value;
    const activities = parseActivitiesFromValue(value);
    const matches = findAlhamraSowSiddharth(activities);
    if (matches.length > 0) {
      foundInHistory.push({
        id: row.id,
        archived_at: row.archived_at,
        updated_at: row.updated_at,
        activityCount: activities.length,
        matches: matches.length,
        sample: matches[0]
      });
    }
  }
  if (foundInHistory.length > 0) {
    console.log('FOUND alhamra + SOW + Siddharth in storage_history:');
    foundInHistory.forEach((r) => console.log(JSON.stringify(r, null, 2)));
  } else {
    console.log('No alhamra + SOW + Siddharth in last 100 storage_history rows for activities.');
  }

  console.log('\n--- pending_storage_saves (storage_key = activities) ---');
  const { rows: pendingRows } = await pool.query(
    `SELECT id, storage_key, length(value) as len, reason, username, created_at
     FROM pending_storage_saves WHERE storage_key = 'activities' ORDER BY created_at DESC LIMIT 50`
  );
  console.log('Rows in pending_storage_saves for activities:', pendingRows.length);

  let foundInPending = [];
  for (const row of pendingRows) {
    const { rows: full } = await pool.query(
      'SELECT value FROM pending_storage_saves WHERE id = $1',
      [row.id]
    );
    const value = full[0] && full[0].value;
    const activities = parseActivitiesFromValue(value);
    const matches = findAlhamraSowSiddharth(activities);
    if (matches.length > 0) {
      foundInPending.push({
        id: row.id,
        username: row.username,
        created_at: row.created_at,
        reason: row.reason,
        activityCount: activities.length,
        matches: matches.length,
        sample: matches[0]
      });
    }
  }
  if (foundInPending.length > 0) {
    console.log('FOUND alhamra + SOW + Siddharth in pending_storage_saves:');
    foundInPending.forEach((r) => console.log(JSON.stringify(r, null, 2)));
  } else {
    console.log('No alhamra + SOW + Siddharth in pending_storage_saves for activities.');
  }

  console.log('\n--- Current storage.activities (for reference) ---');
  const { rows: current } = await pool.query(
    "SELECT key, length(value) as len, updated_at FROM storage WHERE key = 'activities'"
  );
  if (current.length > 0) {
    const { rows: curVal } = await pool.query(
      "SELECT value FROM storage WHERE key = 'activities'"
    );
    const activities = parseActivitiesFromValue(curVal[0] && curVal[0].value);
    const alhamraAny = activities.filter((a) => (a.accountName || '').toLowerCase().includes('alhamra'));
    const alhamraSowSiddharth = findAlhamraSowSiddharth(activities);
    console.log('Current activities count:', activities.length);
    console.log('alhamra.ae activities in current:', alhamraAny.length);
    console.log('alhamra.ae + SOW + Siddharth in current:', alhamraSowSiddharth.length);
    if (alhamraAny.length > 0) {
      alhamraAny.forEach((a) => console.log('  ', a.type, a.date, a.userName || a.assignedUserEmail, a.id));
    }
  } else {
    console.log('No current row for activities.');
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
