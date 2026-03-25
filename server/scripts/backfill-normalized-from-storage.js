/**
 * D-002: One-time backfill of normalized tables from storage.
 * Reads storage keys: accounts, activities, internalActivities.
 * Upserts into accounts, projects, activities, internal_activities.
 *
 * Usage: node server/scripts/backfill-normalized-from-storage.js
 * Optional: --dry-run (log counts only, no writes)
 */

const path = require('path');
const zlib = require('zlib');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const { getPool } = require('../db');
const { syncAccounts, syncActivities, syncInternalActivities } = require('../lib/normalizedDualWrite');

const GZIP_PREFIX = '__gz__';

function maybeDecompress(value) {
  if (typeof value !== 'string') return value;
  if (!value.startsWith(GZIP_PREFIX)) return value;
  try {
    const compressed = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    return zlib.gunzipSync(compressed).toString('utf8');
  } catch (_) {
    return value;
  }
}

async function loadStorage(key) {
  const pool = getPool();
  const { rows } = await pool.query('SELECT value FROM storage WHERE key = $1', [key]);
  if (!rows.length) return null;
  const raw = rows[0].value;
  const str = maybeDecompress(raw);
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const pool = getPool();

  const accounts = await loadStorage('accounts');
  const activities = await loadStorage('activities');
  const internalActivities = await loadStorage('internalActivities');

  const accArr = Array.isArray(accounts) ? accounts : [];
  const actArr = Array.isArray(activities) ? activities : [];
  const intArr = Array.isArray(internalActivities) ? internalActivities : [];

  console.log('Storage counts: accounts=%d, activities=%d, internalActivities=%d', accArr.length, actArr.length, intArr.length);

  if (dryRun) {
    console.log('Dry run: skipping writes.');
    process.exit(0);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (accArr.length) await syncAccounts(client, accArr);
    if (actArr.length) await syncActivities(client, actArr);
    if (intArr.length) await syncInternalActivities(client, intArr);
    await client.query('COMMIT');
    console.log('Backfill complete.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Backfill failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

run();
