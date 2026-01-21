#!/usr/bin/env node

/**
 * Reports hosted activity groups that the UI flags as duplicates.
 *
 * Output: a JSON array (top 200 groups by default) showing account, project,
 * date, type, occurrence count, and sample activities.
 *
 * Usage:
 *   setx REMOTE_STORAGE_BASE "https://<app>.up.railway.app/api/storage"
 *   node server/scripts/report-hosted-duplicate-groups.js [limit]
 */

const zlib = require('zlib');
const path = require('path');

const {
  decompressFromBase64
} = require('../../pams-app/js/vendor/lz-string.js');

const resolveFetch = async () => {
  if (typeof fetch === 'function') {
    return fetch;
  }
  try {
    const { default: nodeFetch } = await import('node-fetch');
    return nodeFetch;
  } catch (error) {
    throw new Error('Install "node-fetch" or use Node 18+ with global fetch');
  }
};

const STORAGE_BASE =
  process.env.REMOTE_STORAGE_BASE && process.env.REMOTE_STORAGE_BASE.trim()
    ? process.env.REMOTE_STORAGE_BASE.trim().replace(/\/+$/, '')
    : '';
const STORAGE_USER =
  process.env.REMOTE_STORAGE_USER && process.env.REMOTE_STORAGE_USER.trim()
    ? process.env.REMOTE_STORAGE_USER.trim()
    : 'migration-cleanup';
const RAILWAY_TOKEN =
  process.env.RAILWAY_TOKEN && process.env.RAILWAY_TOKEN.trim()
    ? process.env.RAILWAY_TOKEN.trim()
    : '';

if (!STORAGE_BASE) {
  console.error(
    '⚠️  Missing REMOTE_STORAGE_BASE. Set it to the Railway storage API.'
  );
  process.exit(1);
}

const ACTIVITIES_KEY = 'activities';
const MANIFEST_KEY = '__shard_manifest:activities__';
const SHARD_TOKEN = '__shards__:activities';

const decodeValue = (value) => {
  if (typeof value !== 'string') return value;
  if (value.startsWith('__lz__')) {
    try {
      return decompressFromBase64(value.slice('__lz__'.length));
    } catch (error) {
      console.warn('Failed to LZ decompress value, returning raw string.');
      return value;
    }
  }
  if (value.startsWith('__gz__')) {
    try {
      return zlib
        .gunzipSync(Buffer.from(value.slice('__gz__'.length), 'base64'))
        .toString('utf8');
    } catch (error) {
      console.warn('Failed to gunzip value, returning raw string.');
      return value;
    }
  }
  return value;
};

const fetchJson = async (fetchImpl, key) => {
  const response = await fetchImpl(`${STORAGE_BASE}/${encodeURIComponent(key)}`, {
    headers: {
      Accept: 'application/json',
      'X-Admin-User': STORAGE_USER,
      ...(RAILWAY_TOKEN ? { Authorization: `Bearer ${RAILWAY_TOKEN}` } : {})
    }
  });
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(
      `Failed to fetch key "${key}": ${response.status} ${response.statusText}`
    );
  }
  const payload = await response.json();
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  if (typeof payload.value === 'string') {
    return decodeValue(payload.value);
  }
  return payload.value;
};

const loadActivities = async (fetchImpl) => {
  const pointer = await fetchJson(fetchImpl, ACTIVITIES_KEY);
  if (!pointer) return [];
  if (pointer === SHARD_TOKEN) {
    const manifestRaw = await fetchJson(fetchImpl, MANIFEST_KEY);
    const manifest =
      typeof manifestRaw === 'string' ? JSON.parse(manifestRaw) : manifestRaw;
    const aggregated = [];
    for (const bucket of manifest?.buckets || []) {
      const bucketRaw = await fetchJson(fetchImpl, bucket);
      if (!bucketRaw) continue;
      const arr =
        typeof bucketRaw === 'string' ? JSON.parse(bucketRaw) : bucketRaw;
      if (Array.isArray(arr)) {
        aggregated.push(...arr);
      }
    }
    return aggregated;
  }
  return typeof pointer === 'string' ? JSON.parse(pointer) : pointer;
};

const buildDuplicateReport = (activities, options = {}) => {
  const { includeSummary = false, includeUser = false } = options;
  const groups = new Map();
  activities.forEach((activity) => {
    if (!activity || activity.isInternal) return;
    const account = (activity.accountName || '').trim().toLowerCase();
    const project = (activity.projectName || '').trim().toLowerCase();
    const date = (activity.date || activity.createdAt || '').slice(0, 10);
    const type = activity.type || '';
    if (!account || !date || !type) return;
    const summary = includeSummary
      ? (activity.summary || '').trim().toLowerCase()
      : '';
    const user = includeUser
      ? (activity.userId || activity.userName || '').toLowerCase()
      : '';
    const key = `${account}|${project}|${date}|${type}|${summary}|${user}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(activity);
  });

  const duplicates = [];
  groups.forEach((list, key) => {
    if (list.length <= 1) return;
    const [account, project, date, type] = key.split('|');
    duplicates.push({
      accountKey: account,
      projectKey: project,
      date,
      type,
      count: list.length,
      samples: list.slice(0, 10).map((activity) => ({
        id: activity.id,
        accountName: activity.accountName,
        projectId: activity.projectId,
        projectName: activity.projectName,
        date: activity.date || activity.createdAt,
        type: activity.type,
        user: activity.userName || activity.userId,
        summary: (activity.summary || '').slice(0, 200)
      }))
    });
  });

  duplicates.sort((a, b) => b.count - a.count);
  return duplicates;
};

const main = async () => {
  const args = process.argv.slice(2);
  let limit = 200;
  let includeSummary = false;
  let includeUser = false;

  args.forEach((arg) => {
    if (/^\d+$/.test(arg)) {
      limit = Number(arg);
    } else if (arg === '--summary') {
      includeSummary = true;
    } else if (arg === '--user') {
      includeUser = true;
    }
  });

  const fetchImpl = await resolveFetch();
  console.log('Downloading hosted activities…');
  const activities = await loadActivities(fetchImpl);
  console.log(`Loaded ${activities.length} records`);

  const report = buildDuplicateReport(activities, {
    includeSummary,
    includeUser
  });
  console.log(`Found ${report.length} potential duplicate groups.`);
  console.log(
    JSON.stringify(
      report.slice(0, limit),
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
