#!/usr/bin/env node
/**
 * One-off recovery: restore the `accounts` storage key from `migration_draft_accounts`.
 *
 * Background: on 2026-04-15 the `accounts` key in storage was overwritten with `[]`
 * (an empty array). The pre-wipe value was archived to storage_history but later
 * purged when storage_history retention was reduced to 15 days. The data still
 * exists intact under `migration_draft_accounts` because that key is protected
 * from API deletion (see server/routes/storage.js isMigrationKey).
 *
 * This script:
 *   1. Reads `migration_draft_accounts` (the source).
 *   2. Strips the `_migrationDraft: true` flag from each account.
 *   3. Archives the current (empty) `accounts` value to storage_history.
 *   4. Replaces `accounts` with the cleaned list.
 *   5. Leaves `migration_draft_accounts` untouched as a safety copy.
 *
 * Refuses to run if the current `accounts` key already has > 0 entries
 * (so re-running this script later cannot wipe genuine data).
 *
 * Usage (live):
 *   railway ssh --service ankit-kanwara "node server/scripts/restore-accounts-from-migration-draft.js"
 *
 * Set DRY_RUN=true to print what would change without writing.
 */

const { getPool, initDb, closePool } = require('../db');

const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

const stripMigrationFlag = (account) => {
  if (account == null || typeof account !== 'object') return account;
  const out = { ...account };
  delete out._migrationDraft;
  delete out.migrationDraft;
  return out;
};

(async () => {
  await initDb();
  const pool = getPool();

  const cur = await pool.query(
    "SELECT value, updated_at FROM storage WHERE key = 'accounts';"
  );
  if (cur.rows.length === 0) {
    console.error('ABORT: storage.accounts row does not exist.');
    process.exit(1);
  }
  const curValue = cur.rows[0].value;
  let curList;
  try {
    const parsed = JSON.parse(curValue);
    curList = Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    curList = null;
  }
  if (curList == null) {
    console.error('ABORT: storage.accounts is not a JSON array. Aborting to avoid data loss.');
    process.exit(1);
  }
  if (curList.length > 0) {
    console.error(`ABORT: storage.accounts already has ${curList.length} entries; refusing to overwrite. Run only if accounts is empty.`);
    process.exit(1);
  }
  console.log(`Current storage.accounts: empty array (length 0), updated_at=${cur.rows[0].updated_at}`);

  const src = await pool.query(
    "SELECT value, updated_at FROM storage WHERE key = 'migration_draft_accounts';"
  );
  if (src.rows.length === 0) {
    console.error('ABORT: storage.migration_draft_accounts does not exist; nothing to restore from.');
    process.exit(1);
  }
  let srcList;
  try {
    const parsed = JSON.parse(src.rows[0].value);
    srcList = Array.isArray(parsed) ? parsed : null;
  } catch (e) {
    console.error('ABORT: migration_draft_accounts is not parseable JSON.');
    process.exit(1);
  }
  if (!Array.isArray(srcList) || srcList.length === 0) {
    console.error('ABORT: migration_draft_accounts is empty; nothing to restore.');
    process.exit(1);
  }
  console.log(`Source storage.migration_draft_accounts: ${srcList.length} accounts, updated_at=${src.rows[0].updated_at}`);

  const cleaned = srcList.map(stripMigrationFlag);
  const cleanedJson = JSON.stringify(cleaned);
  console.log(`Prepared cleaned list: ${cleaned.length} accounts, ${cleanedJson.length} bytes`);
  if (cleaned[0]) {
    console.log(`Sample[0]: id=${cleaned[0].id} name=${cleaned[0].name} industry=${cleaned[0].industry || ''} _migrationDraft=${cleaned[0]._migrationDraft === undefined ? 'absent ✓' : 'PRESENT ✗'}`);
  }

  if (DRY_RUN) {
    console.log('DRY_RUN=true — no changes written.');
    await closePool();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO storage_history (key, value, updated_at, archived_at) VALUES ($1, $2, $3, NOW());',
      ['accounts', curValue, cur.rows[0].updated_at]
    );
    await client.query(
      'UPDATE storage SET value = $1, updated_at = NOW() WHERE key = $2;',
      [cleanedJson, 'accounts']
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
  console.error('RESTORE_FAILED:', e.message, e.stack);
  process.exit(1);
});
