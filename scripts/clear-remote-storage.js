#!/usr/bin/env node
/**
 * Clear all storage on a remote (e.g. staging) environment.
 * Uses same auth as export-storage-snapshot (REMOTE_STORAGE_BASE, REMOTE_STORAGE_USER, REMOTE_STORAGE_API_KEY).
 *
 * Usage:
 *   REMOTE_STORAGE_BASE=https://staging-app.up.railway.app/api/storage REMOTE_STORAGE_USER=admin@example.com node scripts/clear-remote-storage.js
 *   (Optional: --confirm to skip the prompt)
 *
 * Note: Fails with 403 if migration_* keys exist (retain those or clear them manually first).
 */
const base = (process.env.REMOTE_STORAGE_BASE || '').trim().replace(/\/+$/, '');
if (!base) {
  console.error('Set REMOTE_STORAGE_BASE (e.g. https://staging-app.up.railway.app/api/storage)');
  process.exit(1);
}

const headers = {
  Accept: 'application/json'
};
if (process.env.REMOTE_STORAGE_USER) headers['X-Admin-User'] = process.env.REMOTE_STORAGE_USER;
const apiKey = (process.env.REMOTE_STORAGE_API_KEY || process.env.STORAGE_API_KEY || '').trim();
if (apiKey) headers['X-Api-Key'] = apiKey;

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.log('This will DELETE all storage at:', base);
    console.log('Run with --confirm to proceed.');
    process.exit(0);
  }
  const res = await fetch(base, { method: 'DELETE', headers });
  if (res.status === 204) {
    console.log('Storage cleared.');
    return;
  }
  const body = await res.text();
  console.error('Clear failed:', res.status, res.statusText, body || '');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
