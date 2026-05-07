'use strict';

/*
 * Reads a row out of storage_history by id (or top-N by size for a key)
 * and decompresses + parses, reporting:
 *   - byte size on disk (compressed)
 *   - byte size after decompression
 *   - how many array entries / object keys
 *   - the first id and last id (for accounts) so the user can sanity check
 *
 * READ-ONLY. Never writes.
 *
 * Examples:
 *   node server/scripts/inspect-history-snapshot.js --id=7438
 *   node server/scripts/inspect-history-snapshot.js --key=accounts --top=5
 *   node server/scripts/inspect-history-snapshot.js --key=accounts --between="2026-05-06 09:00,2026-05-06 15:00" --limit=50
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const zlib = require('zlib');
const LZString = require('lz-string');
const { getPool } = require('../db');

const GZIP_PREFIX = '__gz__';
const LZ_PREFIX = '__lz__';

function decompress(value) {
  if (typeof value !== 'string') return { decoded: value, encoding: 'plain' };
  if (value.startsWith(LZ_PREFIX)) {
    const decoded = LZString.decompressFromBase64(value.slice(LZ_PREFIX.length));
    return { decoded, encoding: 'lz' };
  }
  if (value.startsWith(GZIP_PREFIX)) {
    const buf = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    const decoded = zlib.gunzipSync(buf).toString('utf8');
    return { decoded, encoding: 'gz' };
  }
  return { decoded: value, encoding: 'plain' };
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (a.startsWith('--')) out[a.slice(2)] = true;
  }
  return out;
}

function summarize(decoded, label) {
  const compressedLen = label?.compressedLen ?? '?';
  const enc = label?.encoding ?? '?';
  const id = label?.id ?? '?';
  const at = label?.archived_at ?? '?';

  if (decoded == null) {
    console.log(`  [decompress failed] id=${id} archived_at=${at} enc=${enc} bytes=${compressedLen}`);
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(decoded);
  } catch (e) {
    console.log(
      `  [parse failed] id=${id} archived_at=${at} enc=${enc} bytes_compressed=${compressedLen} bytes_decompressed=${decoded.length} error=${e.message}`
    );
    return null;
  }
  const decompLen = decoded.length;
  const isArr = Array.isArray(parsed);
  const len = isArr ? parsed.length : Object.keys(parsed || {}).length;
  const idsPreview = isArr
    ? `firstId=${parsed[0]?.id ?? '(none)'} lastId=${parsed[len - 1]?.id ?? '(none)'}`
    : '';
  console.log(
    `  id=${id}  archived_at=${at}  enc=${enc}  ${isArr ? 'arrayLen' : 'keys'}=${len}  bytes_compressed=${compressedLen}  bytes_decompressed=${decompLen}  ${idsPreview}`
  );
  return { parsed, len, isArr };
}

async function main() {
  const args = parseArgs(process.argv);
  const pool = getPool();

  let rows;
  if (args.id) {
    const r = await pool.query(
      'SELECT id, key, archived_at, value FROM storage_history WHERE id = $1',
      [args.id]
    );
    rows = r.rows;
  } else if (args.key && args.between) {
    const [start, end] = String(args.between).split(',');
    const limit = Math.max(1, parseInt(args.limit || '50', 10));
    const r = await pool.query(
      `SELECT id, key, archived_at, value
         FROM storage_history
        WHERE key = $1 AND archived_at BETWEEN $2 AND $3
        ORDER BY archived_at ASC
        LIMIT $4`,
      [args.key, start, end, limit]
    );
    rows = r.rows;
  } else if (args.key) {
    const top = Math.max(1, parseInt(args.top || '5', 10));
    const r = await pool.query(
      `SELECT id, key, archived_at, value
         FROM storage_history
        WHERE key = $1
        ORDER BY length(value) DESC
        LIMIT $2`,
      [args.key, top]
    );
    rows = r.rows;
  } else {
    console.error('Pass --id=N or --key=accounts [--top=5 | --between="ts1,ts2" --limit=50]');
    process.exit(1);
  }

  console.log(`Inspecting ${rows.length} row(s):`);
  for (const row of rows) {
    const { decoded, encoding } = decompress(row.value);
    summarize(decoded, {
      id: row.id,
      archived_at: row.archived_at?.toISOString?.() ?? row.archived_at,
      compressedLen: row.value.length,
      encoding
    });
  }

  await pool.end();
}

main().catch((err) => {
  console.error('inspect-history-snapshot failed:', err.message);
  process.exit(2);
});
