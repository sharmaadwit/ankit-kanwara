#!/usr/bin/env node
/**
 * One-off recovery #2: merge migration_draft_accounts INTO the current storage.accounts
 * instead of replacing it.
 *
 * Background: on 2026-04-15 storage.accounts was wiped to []. We restored 1,789 entries
 * on 2026-04-30 from migration_draft_accounts. On 2026-05-06 14:48 UTC the same key was
 * overwritten *again* — this time with only 9 entries (newly created accounts via the UI).
 * Those 9 are real and must be preserved; we want to add them on top of the 1,789 so
 * the user keeps both their historical book and yesterday's new entries.
 *
 * Strategy:
 *   1. Read current storage.accounts (the 9 new entries).
 *   2. Read migration_draft_accounts (the 1,789 historical entries).
 *   3. Strip _migrationDraft flag from the historical set.
 *   4. Build merged list:
 *        - Start from historical
 *        - For each current account: if its id is NOT in the historical set, append it
 *          (preserves user's new May 6 work)
 *        - If its id IS in the historical set, keep the current version (it is fresher
 *          than the March 2 snapshot)
 *   5. Archive the current (small) value to storage_history.
 *   6. Write merged list back to storage.accounts.
 *
 * Refuses to run if either source is missing or the merged result would be SMALLER
 * than the current value (defensive — we only ever grow with this script).
 *
 * Usage:
 *   railway ssh --service ankit-kanwara "DRY_RUN=true node server/scripts/merge-accounts-from-migration-draft.js"
 *   railway ssh --service ankit-kanwara "node server/scripts/merge-accounts-from-migration-draft.js"
 */

const LZString = require('lz-string');
const zlib = require('zlib');
const { getPool, initDb, closePool } = require('../db');

const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const LZ_PREFIX = '__lz__';
const GZ_PREFIX = '__gz__';

const maybeDecompress = (raw) => {
  if (typeof raw !== 'string') return raw;
  if (raw.startsWith(LZ_PREFIX)) {
    try {
      const restored = LZString.decompressFromBase64(raw.slice(LZ_PREFIX.length));
      if (restored != null) return restored;
    } catch (_) { /* fall through */ }
    return raw;
  }
  if (raw.startsWith(GZ_PREFIX)) {
    try {
      return zlib.gunzipSync(Buffer.from(raw.slice(GZ_PREFIX.length), 'base64')).toString('utf8');
    } catch (_) { return raw; }
  }
  return raw;
};

const stripMigrationFlag = (a) => {
  if (a == null || typeof a !== 'object') return a;
  const out = { ...a };
  delete out._migrationDraft;
  delete out.migrationDraft;
  return out;
};

const parseArrayOrFail = (raw, label) => {
  if (raw == null) {
    throw new Error(`${label}: storage row missing or null`);
  }
  const decompressed = maybeDecompress(raw);
  let parsed;
  try {
    parsed = typeof decompressed === 'string' ? JSON.parse(decompressed) : decompressed;
  } catch (e) {
    throw new Error(`${label}: JSON parse failed (${e.message})`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${label}: parsed value is not an array (type=${typeof parsed})`);
  }
  return parsed;
};

(async () => {
  await initDb();
  const pool = getPool();

  const cur = await pool.query("SELECT value, updated_at FROM storage WHERE key = 'accounts';");
  if (cur.rows.length === 0) {
    console.error('ABORT: storage.accounts row does not exist.');
    process.exit(1);
  }
  const currentList = parseArrayOrFail(cur.rows[0].value, 'storage.accounts');
  console.log(`CURRENT storage.accounts: ${currentList.length} accounts (updated_at=${cur.rows[0].updated_at?.toISOString?.() || cur.rows[0].updated_at})`);

  const src = await pool.query("SELECT value, updated_at FROM storage WHERE key = 'migration_draft_accounts';");
  if (src.rows.length === 0) {
    console.error('ABORT: storage.migration_draft_accounts does not exist.');
    process.exit(1);
  }
  const historicalListRaw = parseArrayOrFail(src.rows[0].value, 'migration_draft_accounts');
  const historicalList = historicalListRaw.map(stripMigrationFlag);
  console.log(`SOURCE migration_draft_accounts: ${historicalList.length} accounts (updated_at=${src.rows[0].updated_at?.toISOString?.() || src.rows[0].updated_at})`);

  const idOf = (a) => (a && a.id != null ? String(a.id) : null);

  const currentById = new Map();
  for (const a of currentList) {
    const id = idOf(a);
    if (id) currentById.set(id, a);
  }

  const merged = [];
  const historicalIds = new Set();
  for (const a of historicalList) {
    const id = idOf(a);
    if (id) historicalIds.add(id);
    merged.push(currentById.has(id) ? currentById.get(id) : a);
  }

  let appendedFromCurrent = 0;
  for (const a of currentList) {
    const id = idOf(a);
    if (!id || !historicalIds.has(id)) {
      merged.push(a);
      appendedFromCurrent++;
    }
  }

  console.log(`MERGED: ${merged.length} accounts (historical=${historicalList.length}, kept-from-current=${appendedFromCurrent})`);
  if (merged.length < currentList.length) {
    console.error(`ABORT: merged length ${merged.length} < current ${currentList.length}. Refusing to shrink.`);
    process.exit(1);
  }

  const sample = merged.find((a) => idOf(a) && currentById.has(idOf(a))) || merged[merged.length - 1];
  if (sample) {
    console.log(`Sample preserved-from-current: id=${sample.id} name=${sample.name}`);
  }
  const sampleHist = merged.find((a) => idOf(a) && !currentById.has(idOf(a))) || merged[0];
  if (sampleHist) {
    console.log(`Sample historical: id=${sampleHist.id} name=${sampleHist.name} _migrationDraft=${sampleHist._migrationDraft === undefined ? 'absent ✓' : 'PRESENT ✗'}`);
  }

  if (DRY_RUN) {
    console.log('DRY_RUN=true — no changes written.');
    await closePool();
    return;
  }

  const mergedJson = JSON.stringify(merged);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO storage_history (key, value, updated_at, archived_at) VALUES ($1, $2, $3, NOW());',
      ['accounts', cur.rows[0].value, cur.rows[0].updated_at]
    );
    await client.query(
      'UPDATE storage SET value = $1, updated_at = NOW() WHERE key = $2;',
      [mergedJson, 'accounts']
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  const verify = await pool.query(
    "SELECT length(value) AS bytes, jsonb_array_length(value::jsonb) AS rows, updated_at FROM storage WHERE key = 'accounts';"
  );
  console.log(`AFTER storage.accounts: ${verify.rows[0].rows} accounts, ${verify.rows[0].bytes} bytes, updated_at=${verify.rows[0].updated_at}`);

  await closePool();
})().catch((e) => {
  console.error('MERGE_FAILED:', e.message, e.stack);
  process.exit(1);
});
