#!/usr/bin/env node
/**
 * Apply salesRepRegion fixes to migration_* activity keys only (Annual report PDF source).
 * Does NOT touch live activities:* or accounts. Presales logger email only.
 *
 * Dry-run:  node server/scripts/region-cleanup-apply-annual-remote.js
 * Apply:    DRY_RUN=false APPLY=true node server/scripts/region-cleanup-apply-annual-remote.js
 *
 * GitHub Actions: secrets REMOTE_STORAGE_BASE, REMOTE_STORAGE_USER, REMOTE_STORAGE_API_KEY
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { decompressFromBase64 } = require('../../pams-app/js/vendor/lz-string.js');
const { normalizeBase, buildHeaders, DEFAULT_REMOTE_BASE } = require('../services/storageRemoteFetch');
const { processBuckets } = require('../services/regionCleanupDryRun');
const { mergeManualIntoMap } = require('./lib/manualPresalesRegionByEmail');
const { mergeAnnualReportPresalesIntoMap } = require('./lib/annualReportPresalesRegions');

const GZIP_PREFIX = '__gz__';
const LZ_PREFIX = '__lz__';

const APPLY = String(process.env.APPLY || '').toLowerCase() === 'true';
const DRY_RUN_OVERRIDE = String(process.env.DRY_RUN || '').toLowerCase();
const DRY_RUN = DRY_RUN_OVERRIDE === '' ? !APPLY : DRY_RUN_OVERRIDE !== 'false';

const resolveFetch = async () => {
  if (typeof fetch === 'function') return fetch;
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
};

function decodeValue(value) {
  if (typeof value !== 'string') return value;
  if (value.startsWith(LZ_PREFIX)) {
    try {
      return decompressFromBase64(value.slice(LZ_PREFIX.length));
    } catch (_) {
      return value;
    }
  }
  if (value.startsWith(GZIP_PREFIX)) {
    try {
      const buf = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
      return zlib.gunzipSync(buf).toString('utf8');
    } catch (_) {
      return value;
    }
  }
  return value;
}

function parseStored(payload) {
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
}

function compressForStorage(jsonString) {
  if (jsonString.length > 50000) {
    return GZIP_PREFIX + zlib.gzipSync(Buffer.from(jsonString, 'utf8')).toString('base64');
  }
  return jsonString;
}

async function fetchKeyList(base, fetchImpl, headers) {
  const res = await fetchImpl(base, { headers });
  if (!res.ok) throw new Error(`List keys failed: ${res.status}`);
  const payload = await res.json();
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.keys)) return payload.keys;
  throw new Error('Unexpected key list');
}

async function fetchKey(base, key, fetchImpl, headers) {
  const res = await fetchImpl(`${base}/${encodeURIComponent(key)}`, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Fetch ${key}: ${res.status}`);
  }
  return parseStored(await res.json());
}

async function fetchRosterUsers(apiRoot, fetchImpl, headers) {
  const root = apiRoot.replace(/\/$/, '');
  const apiKey = (process.env.REMOTE_STORAGE_API_KEY || process.env.STORAGE_API_KEY || '').trim();
  const rosterHeaders = { ...headers };
  if (apiKey) {
    rosterHeaders['X-Api-Key'] = rosterHeaders['X-Api-Key'] || apiKey;
    rosterHeaders['X-Admin-Api-Key'] = apiKey;
  }
  for (const url of [`${root}/api/users`, `${root}/api/admin/users`]) {
    const res = await fetchImpl(url, { headers: rosterHeaders });
    if (res.ok) {
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    }
  }
  return [];
}

function buildUserMapFromList(users, sourceLabel) {
  const byEmail = new Map();
  const byUsername = new Map();
  for (const u of users || []) {
    if (u && u.isActive === false) continue;
    const d = (u.defaultRegion || u.default_region || '').trim();
    const regions = Array.isArray(u.regions) ? u.regions : [];
    const region = d || regions.map((r) => String(r).trim()).find(Boolean) || '';
    if (!region) continue;
    const email = (u.email || '').trim().toLowerCase();
    const username = (u.username || '').trim().toLowerCase();
    const entry = { region, email, username };
    if (email) byEmail.set(email, entry);
    if (username) byUsername.set(username, entry);
  }
  return { byEmail, byUsername, source: sourceLabel, count: byEmail.size };
}

function regionsEqual(a, b) {
  return (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();
}

async function archiveAndWrite(base, key, arr, fetchImpl, headers) {
  if (DRY_RUN) return;
  const compressed = compressForStorage(JSON.stringify(arr));
  const getRes = await fetchImpl(`${base}/${encodeURIComponent(key)}`, {
    headers: { ...headers, Accept: 'application/json' }
  });
  if (!getRes.ok) throw new Error(`Pre-read ${key}: ${getRes.status}`);
  const putRes = await fetchImpl(`${base}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ value: compressed })
  });
  if (!putRes.ok) {
    const t = await putRes.text();
    throw new Error(`PUT ${key}: ${putRes.status} ${t.slice(0, 200)}`);
  }
}

(async () => {
  console.log(`[config] ANNUAL_REPORT_ONLY DRY_RUN=${DRY_RUN} APPLY=${APPLY}`);
  const base = normalizeBase(process.env.REMOTE_STORAGE_BASE) || DEFAULT_REMOTE_BASE;
  const fetchImpl = await resolveFetch();
  const headers = buildHeaders();
  if (!headers['X-Admin-User'] && !headers['X-Api-Key']) {
    console.error('Set REMOTE_STORAGE_USER and/or REMOTE_STORAGE_API_KEY');
    process.exit(1);
  }

  const apiRoot = base.replace(/\/api\/storage\/?$/i, '') || 'https://ankit-kanwara-production.up.railway.app';
  let userMap = buildUserMapFromList(await fetchRosterUsers(apiRoot, fetchImpl, headers), 'api/users');
  try {
    const usersRaw = await fetchKey(base, 'users', fetchImpl, headers);
    if (Array.isArray(usersRaw) && usersRaw.length) {
      userMap = buildUserMapFromList(usersRaw, 'storage.users');
    }
  } catch (_) {
    /* optional */
  }
  mergeManualIntoMap(userMap);
  mergeAnnualReportPresalesIntoMap(userMap);
  console.log(`[map] ${userMap.count} presales emails (+ annual-report-only extras)`);

  const keys = await fetchKeyList(base, fetchImpl, headers);
  const migBuckets = new Map();
  const migBefore = new Map();
  for (const key of keys) {
    if (!/^migration_(?:draft|confirmed)_activities:/.test(key)) continue;
    const arr = await fetchKey(base, key, fetchImpl, headers);
    const list = Array.isArray(arr) ? arr : [];
    migBefore.set(key, list);
    migBuckets.set(key, list);
    process.stdout.write(`  ${key} ${list.length}\n`);
  }

  const migResult = processBuckets(migBuckets, userMap);
  console.log('\n========== ANNUAL REPORT (migration_*) ==========');
  console.log(`Would fix: ${migResult.stats.would_fix}  already_ok: ${migResult.stats.already_ok}`);
  console.log(`Unmapped: ${migResult.stats.unmapped.size} unique`);

  if (DRY_RUN) {
    console.log('\nDry-run only. Apply: DRY_RUN=false APPLY=true');
    process.exit(0);
  }

  if (!APPLY) {
    process.exit(0);
  }

  let wrote = 0;
  for (const [key, arr] of migResult.out) {
    const before = migBefore.get(key) || [];
    const changed = arr.some(
      (row, i) => before[i] && !regionsEqual(before[i].salesRepRegion, row.salesRepRegion)
    );
    if (!changed) continue;
    await archiveAndWrite(base, key, arr, fetchImpl, headers);
    console.log(`[wrote] ${key} (${arr.length} rows)`);
    wrote += 1;
  }
  console.log(`\nDone. ${wrote} migration activity bucket(s) updated (annual report source).`);
})().catch((e) => {
  console.error('[fatal]', e.message);
  process.exit(1);
});
