#!/usr/bin/env node
/**
 * Diagnostic: replay what GET /api/entities/accounts does — read storage,
 * decompress, parse — and print what we get at each step. Read-only.
 */
const zlib = require('zlib');
const { getPool, initDb, closePool } = require('../db');

const GZIP_PREFIX = '__gz__';
const maybeDecompress = (value) => {
  if (typeof value !== 'string') return value;
  if (!value.startsWith(GZIP_PREFIX)) return value;
  try {
    const compressed = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    return zlib.gunzipSync(compressed).toString('utf8');
  } catch (e) {
    return value;
  }
};

const parseJsonArray = (raw) => {
  if (raw == null || raw === '') return { ok: false, reason: 'null or empty', list: [] };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return { ok: true, reason: 'array', list: parsed };
    return { ok: false, reason: `parsed type=${typeof parsed} (not array)`, list: [], parsed };
  } catch (e) {
    return { ok: false, reason: `parse error: ${e.message}`, list: [] };
  }
};

(async () => {
  await initDb();
  const pool = getPool();

  const { rows } = await pool.query("SELECT value, updated_at FROM storage WHERE key = 'accounts';");
  if (rows.length === 0) {
    console.log('NO ROW for storage.accounts');
    await closePool();
    return;
  }
  const raw = rows[0].value;
  console.log(`raw type: ${typeof raw}`);
  console.log(`raw length: ${raw == null ? 0 : raw.length}`);
  console.log(`raw first 80 chars: ${JSON.stringify(raw == null ? '' : raw.slice(0, 80))}`);
  console.log(`updated_at: ${rows[0].updated_at?.toISOString?.() || rows[0].updated_at}`);

  const decompressed = maybeDecompress(raw);
  console.log(`\nafter maybeDecompress:`);
  console.log(`  type: ${typeof decompressed}`);
  console.log(`  length: ${decompressed == null ? 0 : decompressed.length}`);
  console.log(`  first 80: ${JSON.stringify(decompressed == null ? '' : String(decompressed).slice(0, 80))}`);

  const parsed = parseJsonArray(decompressed);
  console.log(`\nparseJsonArray:`);
  console.log(`  ok: ${parsed.ok}`);
  console.log(`  reason: ${parsed.reason}`);
  console.log(`  list.length: ${parsed.list.length}`);
  if (parsed.parsed != null && parsed.list.length === 0 && typeof parsed.parsed === 'string') {
    const second = parseJsonArray(parsed.parsed);
    console.log(`\n  Re-parsed once (in case of double-encoding):`);
    console.log(`    ok: ${second.ok}`);
    console.log(`    list.length: ${second.list.length}`);
    if (second.list[0]) {
      console.log(`    sample[0]: ${JSON.stringify(Object.keys(second.list[0]).slice(0, 8))}`);
    }
  }

  await closePool();
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
