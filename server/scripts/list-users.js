#!/usr/bin/env node
/**
 * List all users from the database (for checking presales roster).
 * Usage: node server/scripts/list-users.js
 */
require('dotenv').config();
const { getPool } = require('../db');

async function run() {
  const pool = getPool();
  if (!pool) {
    console.log('No database connection. Set DATABASE_URL or PG* in .env');
    process.exit(1);
  }
  const { rows } = await pool.query(
    `SELECT id, username, email, roles, is_active, default_region
     FROM users ORDER BY username ASC`
  );
  console.log('Users in DB (total: ' + rows.length + '):\n');
  rows.forEach((r, i) => {
    const roles = Array.isArray(r.roles) ? r.roles.join(', ') : (r.roles || '');
    console.log((i + 1) + '. ' + (r.username || '') + ' | ' + (r.email || '') + ' | ' + roles + ' | active=' + r.is_active + ' | region=' + (r.default_region || ''));
  });
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
