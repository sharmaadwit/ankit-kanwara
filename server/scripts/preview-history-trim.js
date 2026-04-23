#!/usr/bin/env node
/**
 * One-off diagnostic: how many rows & bytes sit in various retention windows
 * in storage_history. Helps decide what retention value is worth it.
 * Safe: read-only.
 */
const { getPool } = require('../db');

const WINDOWS = [7, 15, 21, 30, 60];

(async () => {
  const pool = getPool();
  console.log('Retention window -> rows kept vs. rows we would delete vs. table size');
  for (const days of WINDOWS) {
    const q = await pool.query(
      `SELECT
         SUM(CASE WHEN archived_at >= NOW() - ($1::int || ' days')::interval THEN 1 ELSE 0 END)::int AS keep_rows,
         SUM(CASE WHEN archived_at <  NOW() - ($1::int || ' days')::interval THEN 1 ELSE 0 END)::int AS delete_rows,
         pg_size_pretty(COALESCE(SUM(CASE WHEN archived_at >= NOW() - ($1::int || ' days')::interval THEN pg_column_size(value) ELSE 0 END), 0))::text AS keep_bytes,
         pg_size_pretty(COALESCE(SUM(CASE WHEN archived_at <  NOW() - ($1::int || ' days')::interval THEN pg_column_size(value) ELSE 0 END), 0))::text AS delete_bytes
       FROM storage_history;`,
      [days]
    );
    const r = q.rows[0];
    console.log(`  ${days}d: keep ${r.keep_rows} rows (${r.keep_bytes}), delete ${r.delete_rows} rows (${r.delete_bytes})`);
  }
  const total = await pool.query(
    "SELECT count(*)::int AS rows, pg_size_pretty(pg_total_relation_size('storage_history')) AS total FROM storage_history;"
  );
  console.log(`Total storage_history: ${total.rows[0].rows} rows, on-disk ${total.rows[0].total}`);
  await pool.end();
})().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
