#!/usr/bin/env node
/**
 * Comprehensive accounts recovery merge.
 *
 * Background
 * ----------
 * After the May 6 wipe at 10:19:39 UTC, accounts went from 1868 → ~empty.
 * The user then re-created 9 accounts manually over the next ~4 hours.
 * On May 7 we restored 1789 (migration_draft_accounts) and merged the 9 →
 * `storage.accounts` now has 1798 entries.
 *
 * BUT: the actual last-good live state (storage_history id=7438, archived at
 * 2026-05-06T10:19:38Z) contained 1868 accounts. We are missing ~70 accounts
 * that were edited or created between the migration (Mar 2) and May 6.
 *
 * What this script does
 * ---------------------
 * 1. Loads `storage_history` row 7438 (1868 accounts) — the live-good baseline.
 * 2. Loads `migration_draft_accounts` (1789, Mar 2 frozen).
 * 3. Loads the current `storage.accounts` (1798, includes 9 new May 6 entries).
 * 4. Merges by `id` with the rule:
 *      - If id is present in multiple sources, prefer the record with the
 *        most non-empty fields (richer wins).
 *      - Tie-break by latest `updatedAt`/`updated_at`/`modifiedAt` if present.
 * 5. Refuses to write a result smaller than the largest source (1868 today).
 * 6. Refuses to write unless DRY_RUN=false AND APPLY=true are both set.
 * 7. Archives the current `storage.accounts` value into `storage_history`
 *    via a transactional UPDATE so we can undo if needed.
 *
 * Run
 * ---
 *   DRY_RUN preview (default):
 *     railway ssh --service ankit-kanwara "node server/scripts/comprehensive-accounts-merge.js"
 *
 *   Live apply (only after reviewing dry-run output):
 *     railway ssh --service ankit-kanwara "DRY_RUN=false APPLY=true node server/scripts/comprehensive-accounts-merge.js"
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const zlib = require('zlib');
const LZString = require('lz-string');
const { getPool, initDb, closePool } = require('../db');

const HISTORY_ROW_ID = parseInt(process.env.MERGE_HISTORY_ROW_ID || '7438', 10);
const TARGET_KEY = 'accounts';
const FALLBACK_HISTORICAL_KEY = 'migration_draft_accounts';

const APPLY = String(process.env.APPLY || '').toLowerCase() === 'true';
const DRY_RUN_OVERRIDE = String(process.env.DRY_RUN || '').toLowerCase();
const DRY_RUN = DRY_RUN_OVERRIDE === '' ? !APPLY : DRY_RUN_OVERRIDE !== 'false';

const GZIP_PREFIX = '__gz__';
const LZ_PREFIX = '__lz__';

function decompress(value) {
  if (typeof value !== 'string') return value;
  if (value.startsWith(LZ_PREFIX)) {
    return LZString.decompressFromBase64(value.slice(LZ_PREFIX.length));
  }
  if (value.startsWith(GZIP_PREFIX)) {
    const buf = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    return zlib.gunzipSync(buf).toString('utf8');
  }
  return value;
}

function parseArrayOrEmpty(rawValue, label) {
  if (rawValue == null) {
    console.warn(`[parseArrayOrEmpty] ${label}: rawValue is null/undefined`);
    return [];
  }
  let decoded;
  try {
    decoded = decompress(rawValue);
  } catch (err) {
    console.warn(`[parseArrayOrEmpty] ${label}: decompress failed:`, err.message);
    return [];
  }
  if (decoded == null) {
    console.warn(`[parseArrayOrEmpty] ${label}: decoded is null`);
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(decoded);
  } catch (err) {
    console.warn(`[parseArrayOrEmpty] ${label}: JSON parse failed:`, err.message);
    return [];
  }
  return Array.isArray(parsed) ? parsed : [];
}

function nonEmptyFieldCount(rec) {
  if (!rec || typeof rec !== 'object') return 0;
  let n = 0;
  for (const k of Object.keys(rec)) {
    if (k === '_migrationDraft' || k === 'migrationDraft') continue;
    const v = rec[k];
    if (v == null) continue;
    if (typeof v === 'string' && v.trim() === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    n += 1;
  }
  return n;
}

function timestampMs(rec) {
  if (!rec || typeof rec !== 'object') return 0;
  const candidates = [
    rec.updatedAt,
    rec.updated_at,
    rec.modifiedAt,
    rec.modified_at,
    rec.lastModified,
    rec.createdAt,
    rec.created_at
  ];
  for (const c of candidates) {
    if (!c) continue;
    const ms = typeof c === 'number' ? c : Date.parse(c);
    if (!Number.isNaN(ms) && ms > 0) return ms;
  }
  return 0;
}

function pickRicher(a, b) {
  if (!a) return b;
  if (!b) return a;
  const fa = nonEmptyFieldCount(a);
  const fb = nonEmptyFieldCount(b);
  if (fa !== fb) return fa > fb ? a : b;
  const ta = timestampMs(a);
  const tb = timestampMs(b);
  if (ta !== tb) return ta > tb ? a : b;
  return a;
}

function buildById(list, label) {
  const idx = new Map();
  let withoutId = 0;
  for (const rec of list) {
    if (!rec || typeof rec !== 'object') continue;
    const id = rec.id != null ? String(rec.id) : null;
    if (!id) {
      withoutId += 1;
      continue;
    }
    idx.set(id, rec);
  }
  console.log(
    `[buildById] ${label}: ${idx.size} unique ids (${withoutId} without id, total entries ${list.length})`
  );
  return idx;
}

(async () => {
  if (typeof initDb === 'function') {
    await initDb();
  }
  const pool = getPool();

  console.log(`[config] DRY_RUN=${DRY_RUN}  APPLY=${APPLY}  HISTORY_ROW_ID=${HISTORY_ROW_ID}`);

  // SOURCE A: storage_history row N (e.g. 7438 → 1868 accounts)
  const histQ = await pool.query(
    'SELECT id, key, archived_at, length(value) AS bytes, value FROM storage_history WHERE id=$1',
    [HISTORY_ROW_ID]
  );
  if (histQ.rows.length === 0) {
    console.error(`[fatal] storage_history id=${HISTORY_ROW_ID} not found`);
    process.exit(2);
  }
  const histRow = histQ.rows[0];
  if (histRow.key !== TARGET_KEY) {
    console.error(
      `[fatal] storage_history id=${HISTORY_ROW_ID} is for key="${histRow.key}", expected "${TARGET_KEY}"`
    );
    process.exit(2);
  }
  const histList = parseArrayOrEmpty(histRow.value, `history#${HISTORY_ROW_ID}`);
  console.log(
    `[A] history#${HISTORY_ROW_ID} archived_at=${
      histRow.archived_at?.toISOString?.() ?? histRow.archived_at
    } count=${histList.length}`
  );

  // SOURCE B: migration_draft_accounts (Mar 2 frozen)
  const draftQ = await pool.query('SELECT value, updated_at FROM storage WHERE key=$1', [
    FALLBACK_HISTORICAL_KEY
  ]);
  const draftList = draftQ.rows.length
    ? parseArrayOrEmpty(draftQ.rows[0].value, FALLBACK_HISTORICAL_KEY)
    : [];
  console.log(`[B] ${FALLBACK_HISTORICAL_KEY} count=${draftList.length}`);

  // SOURCE C: current storage.accounts (1798)
  const liveQ = await pool.query('SELECT value, updated_at FROM storage WHERE key=$1', [
    TARGET_KEY
  ]);
  if (liveQ.rows.length === 0) {
    console.error(`[fatal] storage.${TARGET_KEY} row missing`);
    process.exit(2);
  }
  const liveRaw = liveQ.rows[0].value;
  const liveUpdatedAt = liveQ.rows[0].updated_at;
  const liveList = parseArrayOrEmpty(liveRaw, TARGET_KEY);
  console.log(`[C] storage.${TARGET_KEY} count=${liveList.length}`);

  const idxA = buildById(histList, 'A history');
  const idxB = buildById(draftList, 'B migration_draft');
  const idxC = buildById(liveList, 'C current live');

  const allIds = new Set([...idxA.keys(), ...idxB.keys(), ...idxC.keys()]);
  let aOnly = 0,
    bOnly = 0,
    cOnly = 0,
    inAll = 0;
  const merged = [];
  for (const id of allIds) {
    const a = idxA.get(id);
    const b = idxB.get(id);
    const c = idxC.get(id);
    const present = [a, b, c].filter(Boolean).length;
    if (present === 1) {
      if (a) aOnly += 1;
      else if (b) bOnly += 1;
      else cOnly += 1;
    } else if (present === 3) inAll += 1;

    let winner = pickRicher(a, b);
    winner = pickRicher(winner, c);
    if (winner) merged.push(winner);
  }

  for (const rec of merged) {
    if (rec && rec._migrationDraft === true) delete rec._migrationDraft;
    if (rec && rec.migrationDraft === true) delete rec.migrationDraft;
  }

  console.log('---');
  console.log(`Source A (history#${HISTORY_ROW_ID}): ${idxA.size} ids`);
  console.log(`Source B (migration_draft):        ${idxB.size} ids`);
  console.log(`Source C (live storage.accounts):  ${idxC.size} ids`);
  console.log(
    `A-only ids: ${aOnly}, B-only ids: ${bOnly}, C-only ids: ${cOnly}, in-all-three: ${inAll}`
  );
  console.log(`MERGED: ${merged.length} unique account ids`);
  console.log('---');

  const cOnlyIds = [...idxC.keys()].filter((id) => !idxA.has(id) && !idxB.has(id));
  if (cOnlyIds.length) {
    console.log(`Live-only ids (May 6 net-new from current): ${cOnlyIds.length}`);
    for (const id of cOnlyIds.slice(0, 30)) {
      const r = idxC.get(id);
      console.log(`  - ${id}  name="${r?.name ?? r?.accountName ?? '?'}"`);
    }
    if (cOnlyIds.length > 30) console.log(`  ... and ${cOnlyIds.length - 30} more`);
  }

  const recoveredIds = [...idxA.keys()].filter((id) => !idxC.has(id));
  console.log(`Recovered ids (in A but NOT in current live): ${recoveredIds.length}`);
  for (const id of recoveredIds.slice(0, 15)) {
    const r = idxA.get(id);
    console.log(`  + ${id}  name="${r?.name ?? r?.accountName ?? '?'}"`);
  }
  if (recoveredIds.length > 15) console.log(`  ... and ${recoveredIds.length - 15} more`);

  const safetyFloor = Math.max(idxA.size, idxB.size, idxC.size);
  if (merged.length < safetyFloor) {
    console.error(
      `[fatal] merged size (${merged.length}) is smaller than max source (${safetyFloor}) — refusing`
    );
    process.exit(3);
  }

  if (DRY_RUN) {
    console.log('[DRY_RUN] No write performed. Set DRY_RUN=false APPLY=true to apply.');
    await closePool();
    return;
  }

  console.log(`[APPLY] writing merged list (${merged.length} entries) to storage.${TARGET_KEY}`);
  const mergedJson = JSON.stringify(merged);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO storage_history (key, value, updated_at, archived_at) VALUES ($1, $2, $3, NOW());',
      [TARGET_KEY, liveRaw, liveUpdatedAt]
    );
    await client.query(
      'UPDATE storage SET value=$1, updated_at=NOW() WHERE key=$2;',
      [mergedJson, TARGET_KEY]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }

  const verify = await pool.query(
    "SELECT length(value) AS bytes, jsonb_array_length(value::jsonb) AS rows, updated_at FROM storage WHERE key=$1",
    [TARGET_KEY]
  );
  console.log(
    `AFTER storage.${TARGET_KEY}: ${verify.rows[0].rows} accounts, ${verify.rows[0].bytes} bytes, updated_at=${verify.rows[0].updated_at}`
  );

  await closePool();
  console.log('Done.');
})().catch(async (err) => {
  console.error('comprehensive-accounts-merge failed:', err.message, err.stack);
  try {
    await closePool();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
