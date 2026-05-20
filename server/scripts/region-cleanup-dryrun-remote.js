#!/usr/bin/env node
/**
 * Dry-run region cleanup using production storage HTTP API (no DB).
 * Requires REMOTE_STORAGE_BASE + REMOTE_STORAGE_USER and/or STORAGE_API_KEY (or REMOTE_STORAGE_API_KEY).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { decompressFromBase64 } = require('../../pams-app/js/vendor/lz-string.js');
const {
  normalizeBase,
  buildHeaders,
  DEFAULT_REMOTE_BASE
} = require('../services/storageRemoteFetch');
const { processBuckets } = require('../services/regionCleanupDryRun');

const resolveFetch = async () => {
  if (typeof fetch === 'function') return fetch;
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
};

const decodeValue = (value) => {
  if (typeof value !== 'string') return value;
  if (value.startsWith('__lz__')) {
    try {
      return decompressFromBase64(value.slice('__lz__'.length));
    } catch (_) {
      return value;
    }
  }
  if (value.startsWith('__gz__')) {
    try {
      const buffer = Buffer.from(value.slice('__gz__'.length), 'base64');
      return zlib.gunzipSync(buffer).toString('utf8');
    } catch (_) {
      return value;
    }
  }
  return value;
};

const parseStored = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const decoded = decodeValue(payload.value);
  if (typeof decoded === 'string') {
    try {
      return JSON.parse(decoded);
    } catch (_) {
      return null;
    }
  }
  return decoded;
};

async function fetchKeyList(base, fetchImpl, headers) {
  const response = await fetchImpl(base, { headers });
  if (!response.ok) throw new Error(`List keys failed: ${response.status}`);
  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.keys)) return payload.keys;
  throw new Error('Unexpected key list response');
}

async function fetchKey(base, key, fetchImpl, headers) {
  const response = await fetchImpl(`${base}/${encodeURIComponent(key)}`, { headers });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Fetch ${key}: ${response.status}`);
  }
  return parseStored(await response.json());
}

function normEmail(v) {
  return (v && typeof v === 'string' ? v : '').trim().toLowerCase();
}

function regionFromUser(user) {
  const d = (user.defaultRegion || user.default_region || '').trim();
  if (d) return d;
  const regions = Array.isArray(user.regions) ? user.regions : [];
  return regions.map((r) => String(r).trim()).find(Boolean) || '';
}

function buildUserMapFromList(users, sourceLabel) {
  const byEmail = new Map();
  const byUsername = new Map();
  const list = Array.isArray(users) ? users : [];
  for (const u of list) {
    if (u && u.isActive === false) continue;
    const region = regionFromUser(u);
    if (!region) continue;
    const email = normEmail(u.email);
    const username = (u.username || '').trim().toLowerCase();
    const entry = { region, email, username };
    if (email) byEmail.set(email, entry);
    if (username) byUsername.set(username, entry);
  }
  return { byEmail, byUsername, source: sourceLabel, count: byEmail.size };
}

async function fetchAdminUsers(apiRoot, fetchImpl, headers) {
  const adminHeaders = { ...headers };
  const apiKey = (process.env.REMOTE_STORAGE_API_KEY || process.env.STORAGE_API_KEY || '').trim();
  if (apiKey && !adminHeaders['X-Admin-Api-Key']) {
    adminHeaders['X-Admin-Api-Key'] = apiKey;
  }
  const url = `${apiRoot.replace(/\/$/, '')}/api/admin/users`;
  const res = await fetchImpl(url, { headers: adminHeaders });
  if (!res.ok) {
    throw new Error(`GET /api/admin/users failed: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

(async () => {
  const base = normalizeBase(process.env.REMOTE_STORAGE_BASE) || DEFAULT_REMOTE_BASE;
  const fetchImpl = await resolveFetch();
  const headers = buildHeaders();
  if (!headers['X-Admin-User'] && !headers['X-Api-Key']) {
    console.error('Set REMOTE_STORAGE_USER and/or STORAGE_API_KEY (or REMOTE_STORAGE_API_KEY) in .env');
    process.exit(1);
  }

  console.log(`[remote] ${base}`);
  const keys = await fetchKeyList(base, fetchImpl, headers);
  console.log(`[keys] ${keys.length}`);

  const apiRoot = base.replace(/\/api\/storage\/?$/i, '') || 'https://ankit-kanwara-production.up.railway.app';
  let userMap;
  try {
    const adminUsers = await fetchAdminUsers(apiRoot, fetchImpl, headers);
    userMap = buildUserMapFromList(adminUsers, 'postgres.api/admin/users');
    console.log(`[users] admin API: ${adminUsers.length} rows, ${userMap.count} with defaultRegion`);
  } catch (adminErr) {
    console.warn(`[users] admin API failed (${adminErr.message}); falling back to storage.users`);
    const usersRaw = await fetchKey(base, 'users', fetchImpl, headers);
    userMap = buildUserMapFromList(usersRaw, 'storage.users');
  }
  if (userMap.count === 0) {
    console.error('[fatal] No presales users with defaultRegion (admin API + storage.users)');
    process.exit(2);
  }

  const liveBuckets = new Map();
  const migBuckets = new Map();
  for (const key of keys) {
    if (/^activities:\d{4}-\d{2}$/.test(key)) {
      const arr = await fetchKey(base, key, fetchImpl, headers);
      liveBuckets.set(key, Array.isArray(arr) ? arr : []);
      process.stdout.write(`  ${key} ${(arr || []).length}\n`);
    } else if (/^migration_(?:draft|confirmed)_activities:/.test(key)) {
      const arr = await fetchKey(base, key, fetchImpl, headers);
      migBuckets.set(key, Array.isArray(arr) ? arr : []);
      process.stdout.write(`  ${key} ${(arr || []).length}\n`);
    }
  }

  const liveResult = processBuckets(liveBuckets, userMap);
  const migResult = processBuckets(migBuckets, userMap);

  const mergeUnmapped = new Map();
  for (const s of [liveResult.stats, migResult.stats]) {
    for (const [k, n] of s.unmapped) mergeUnmapped.set(k, (mergeUnmapped.get(k) || 0) + n);
  }

  const unmapped = [...mergeUnmapped.entries()].sort((a, b) => b[1] - a[1]);

  console.log('\n========== DRY-RUN SUMMARY (remote storage) ==========');
  console.log(`Live fixes: ${liveResult.stats.would_fix}  migration fixes: ${migResult.stats.would_fix}`);
  console.log(`India South → other: ${liveResult.stats.off_india_south + migResult.stats.off_india_south}`);
  console.log(`UNMAPPED: ${unmapped.length} unique (${unmapped.reduce((s, [, n]) => s + n, 0)} rows)`);
  console.log('\n--- UNMAPPED ---');
  for (const [id, count] of unmapped) {
    console.log(`  ${count}x  ${id}`);
  }
  if (!unmapped.length) console.log('  (none)');

  const reportPath = path.join(
    __dirname,
    `region-cleanup-dryrun-remote-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );
  const unmappedRows = unmapped.reduce((s, [, n]) => s + n, 0);
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        source: base,
        userMapSource: userMap.source,
        presalesUsersWithRegion: userMap.count,
        summary: {
          liveActivityFixes: liveResult.stats.would_fix,
          migrationActivityFixes: migResult.stats.would_fix,
          totalOffIndiaSouth: liveResult.stats.off_india_south + migResult.stats.off_india_south,
          unmappedUnique: unmapped.length,
          unmappedRows
        },
        live: liveResult.stats,
        migration: migResult.stats,
        unmapped: unmapped.map(([identifier, rowCount]) => ({ identifier, rowCount }))
      },
      null,
      2
    )
  );
  console.log(`\n[report] ${reportPath}`);
})().catch((e) => {
  console.error('[fatal]', e.message);
  process.exit(1);
});
