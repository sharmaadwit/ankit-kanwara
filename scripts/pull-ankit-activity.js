const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  connectionTimeoutMillis: 90000,
  ssl: url.includes('localhost') ? false : { rejectUnauthorized: false }
});

const {
  buildAnnualUserActivityExport
} = require('../server/services/annualUserActivityExport');
const { maybeDecompress, parseJsonArray } = require('../server/services/storageDataLoad');

async function getStorageValue(key) {
  const { rows } = await pool.query('SELECT value FROM storage WHERE key = $1', [key]);
  if (!rows.length) return null;
  return maybeDecompress(rows[0].value);
}

async function loadAll() {
  const { rows: keyRows } = await pool.query(
    `SELECT key FROM storage WHERE key = 'activities' OR key LIKE 'activities:%' OR key = 'users' ORDER BY key`
  );
  const byId = new Map();
  for (const { key } of keyRows) {
    const raw = await getStorageValue(key);
    parseJsonArray(raw).forEach((row) => {
      if (row && row.id != null) byId.set(String(row.id), row);
    });
  }
  const usersRaw = await getStorageValue('users');
  const users = parseJsonArray(usersRaw);
  return { activities: Array.from(byId.values()), users };
}

(async () => {
  try {
    console.log('Connecting to database...');
    const { activities, users } = await loadAll();
    console.log('Loaded', activities.length, 'activities', users.length, 'users');
    const payload = buildAnnualUserActivityExport({
      activities,
      users,
      fromDate: '2025-07-01',
      toDate: '2026-05-19',
      source: 'database',
      fetchedAt: new Date().toISOString()
    });
    const out = path.join(__dirname, '..', '..', 'Review', 'annual-activity-export.json');
    fs.writeFileSync(out, JSON.stringify(payload, null, 2));
    console.log('Wrote', out);
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
