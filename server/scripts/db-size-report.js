/**
 * Report what is using Postgres disk: table sizes and (optionally) storage key sizes.
 * Run from project root: node server/scripts/db-size-report.js
 * Uses DATABASE_URL / POSTGRES_URL / DATABASE_PUBLIC_URL from env (e.g. Railway or .env).
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const { getPool } = require('../db');

const run = async () => {
  const pool = getPool();
  if (!pool) {
    console.error('No database pool. Set DATABASE_URL (or POSTGRES_URL / DATABASE_PUBLIC_URL).');
    process.exit(1);
  }

  try {
    // Table sizes (total + index)
    const tablesResult = await pool.query(`
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
        pg_total_relation_size(schemaname || '.' || tablename) AS total_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
    `);

    console.log('\n--- Table sizes (public schema) ---\n');
    let totalBytes = 0;
    for (const row of (tablesResult.rows || [])) {
      totalBytes += Number(row.total_bytes) || 0;
      console.log(`${row.tablename.padEnd(28)} ${row.total_size}`);
    }
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    console.log('\nTotal (tables + indexes):', totalMB, 'MB');

    // Per-key size for storage (the main key/value table)
    const keySizesResult = await pool.query(`
      SELECT
        key,
        length(value) AS value_bytes,
        pg_size_pretty(length(value)::bigint) AS value_size
      FROM storage
      ORDER BY length(value) DESC
      LIMIT 20;
    `);

    console.log('\n--- Top 20 storage keys by value size ---\n');
    for (const row of (keySizesResult.rows || [])) {
      console.log(`${(row.key || '').padEnd(32)} ${row.value_size.padEnd(12)} (${row.value_bytes} bytes)`);
    }

    // storage_history row count and total size (often the hidden growth)
    const historyResult = await pool.query(`
      SELECT
        count(*) AS row_count,
        pg_size_pretty(sum(length(value))::bigint) AS values_size,
        sum(length(value)) AS values_bytes
      FROM storage_history;
    `);
    const h = (historyResult.rows && historyResult.rows[0]) || {};
    const historyTableResult = await pool.query(`
      SELECT pg_size_pretty(pg_total_relation_size('storage_history')) AS table_size;
    `);
    const historyTableSize = (historyTableResult.rows && historyTableResult.rows[0] && historyTableResult.rows[0].table_size) || '?';

    console.log('\n--- storage_history (archives on every PUT; no retention) ---');
    console.log('Rows:', h.row_count || 0);
    console.log('Approx. value data:', h.values_size || '0');
    console.log('Table total size:', historyTableSize);

    console.log('\nDone.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

run();
