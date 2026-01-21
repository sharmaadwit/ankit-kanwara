#!/usr/bin/env node

/**
 * Offline migration cleanup utility
 *
 * - Downloads hosted `activities` (handling legacy or sharded layouts)
 * - Normalises migrated records
 * - Deduplicates the known duplicate patterns
 * - Re-uploads a sharded, compressed payload
 *
 * Usage:
 *
 *   setx RAILWAY_TOKEN "<api-token>"
 *   setx REMOTE_STORAGE_BASE "https://<app>.up.railway.app/api/storage"
 *   node server/scripts/cleanup-hosted-activities.js
 */

const path = require('path');
const zlib = require('zlib');

const {
  compressToBase64,
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
    throw new Error(
      'Global fetch API unavailable. Use Node 18+ or install "node-fetch".'
    );
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
const ACTIVITIES_MANIFEST_KEY = '__shard_manifest:activities__';
const ACTIVITY_BUCKET_PREFIX = 'activities:';
const SHARD_POINTER_TOKEN = '__shards__:activities';
const GZIP_PREFIX = '__gz__';
const LZ_PREFIX = '__lz__';

const MIGRATION_DUPLICATE_PATTERNS = [
  { accountName: 'Daikin', type: 'sow', date: '2025-12-31' },
  { accountName: 'Money Control', type: 'customerCall', date: '2025-12-31' },
  { accountName: 'parse-ai', type: 'customerCall', date: '2025-12-31' },
  { accountName: 'colmexpro', type: 'customerCall', date: '2025-12-31' },
  { accountName: 'Solar Square', type: 'customerCall', date: '2025-12-31' }
].map((pattern) => ({
  ...pattern,
  accountNameLower: pattern.accountName.toLowerCase(),
  typeLower: pattern.type.toLowerCase()
}));

const normalizeIsoString = (value) => {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const resolveBucketId = (activity) => {
  const month = (activity && activity.monthOfActivity) || '';
  if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
    return `${ACTIVITY_BUCKET_PREFIX}${month}`;
  }
  const dateString =
    normalizeIsoString(activity?.date) ||
    normalizeIsoString(activity?.createdAt);
  if (!dateString) {
    return `${ACTIVITY_BUCKET_PREFIX}unknown`;
  }
  const year = dateString.slice(0, 4);
  const monthPart = dateString.slice(5, 7);
  if (!year || !monthPart) {
    return `${ACTIVITY_BUCKET_PREFIX}unknown`;
  }
  return `${ACTIVITY_BUCKET_PREFIX}${year}-${monthPart}`;
};

const decodeValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.startsWith(LZ_PREFIX)) {
    try {
      return decompressFromBase64(value.slice(LZ_PREFIX.length));
    } catch (error) {
      console.warn('Failed to LZ decompress payload. Returning raw string.');
      return value;
    }
  }
  if (value.startsWith(GZIP_PREFIX)) {
    try {
      return zlib
        .gunzipSync(Buffer.from(value.slice(GZIP_PREFIX.length), 'base64'))
        .toString('utf8');
    } catch (error) {
      console.warn('Failed to gunzip payload. Returning raw string.');
      return value;
    }
  }
  return value;
};

const encodeValue = (raw) => {
  if (typeof raw !== 'string' || !raw.length) {
    return raw;
  }
  try {
    const lz = compressToBase64(raw);
    if (lz && lz.length < raw.length) {
      return `${LZ_PREFIX}${lz}`;
    }
  } catch (error) {
    console.warn('Failed to LZ compress payload. Falling back to gzip.');
  }

  try {
    return `${GZIP_PREFIX}${zlib.gzipSync(Buffer.from(raw, 'utf8')).toString(
      'base64'
    )}`;
  } catch (error) {
    console.warn('Failed to gzip payload. Storing raw string.');
  }

  return raw;
};

const normalizeActivity = (activity = {}) => {
  const original = activity || {};
  const normalized = { ...original };

  const trim = (field) => {
    if (typeof normalized[field] === 'string') {
      normalized[field] = normalized[field].trim();
    }
  };

  ['summary', 'salesRep', 'accountName', 'userName', 'assignedUserEmail'].forEach(
    trim
  );

  const candidate =
    normalized.date || normalized.createdAt || normalized.monthOfActivity;
  if (candidate) {
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      const iso = parsed.toISOString();
      normalized.date = iso;
      if (!normalized.createdAt) {
        normalized.createdAt = iso;
      }
      if (!normalized.monthOfActivity) {
        normalized.monthOfActivity = iso.slice(0, 7);
      }
    }
  }

  if (!normalized.source) {
    normalized.source = 'migration';
  }

  if (normalized.source === 'migration' && !normalized.isMigrated) {
    normalized.isMigrated = true;
  }

  return normalized;
};

const buildSignature = (activity) => {
  const normalize = (value) =>
    (value || '')
      .toString()
      .trim()
      .toLowerCase();
  const summarySnippet = normalize(activity.summary).slice(0, 280);
  const datePart = normalize(activity.date || activity.createdAt).slice(0, 10);
  return [
    normalize(activity.accountId || activity.accountName),
    normalize(activity.projectId || activity.projectName),
    normalize(activity.type),
    datePart,
    normalize(activity.assignedUserEmail || activity.userId),
    normalize(activity.salesRep),
    summarySnippet
  ].join('|');
};

const buildUserSummarySignature = (activity) => {
  const normalize = (value) =>
    (value || '')
      .toString()
      .trim()
      .toLowerCase();
  const datePart = normalize(activity.date || activity.createdAt).slice(0, 10);
  return [
    normalize(activity.accountId || activity.accountName),
    normalize(activity.projectId || activity.projectName),
    normalize(activity.type),
    datePart,
    normalize(activity.summary),
    normalize(
      activity.assignedUserEmail ||
        activity.userId ||
        activity.userName ||
        ''
    )
  ].join('|');
};

const removePatternDuplicates = (records) => {
  const working = records.map((activity) => ({ ...activity }));
  let changed = false;

  MIGRATION_DUPLICATE_PATTERNS.forEach((pattern) => {
    const matches = [];
    working.forEach((activity, index) => {
      if (!activity || activity.source !== 'migration') return;
      const account = (activity.accountName || '').trim().toLowerCase();
      const type = (activity.type || '').trim().toLowerCase();
      const date = (activity.date || activity.createdAt || '').slice(0, 10);
      if (
        account === pattern.accountNameLower &&
        type === pattern.typeLower &&
        date === pattern.date
      ) {
        matches.push({ index });
      }
    });

    if (matches.length > 1) {
      matches
        .slice(1)
        .forEach(({ index }) => {
          working[index] = null;
          changed = true;
        });
    }
  });

  return {
    records: working.filter(Boolean),
    changed
  };
};

const buildBuckets = (records) => {
  const buckets = new Map();
  records.forEach((record) => {
    const bucketKey = resolveBucketId(record);
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, []);
    }
    buckets.get(bucketKey).push(record);
  });
  return buckets;
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
      `Failed to load key "${key}": ${response.status} ${response.statusText}`
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

const putJson = async (fetchImpl, key, value) => {
  const encoded =
    typeof value === 'string'
      ? encodeValue(value)
      : encodeValue(JSON.stringify(value));

  const response = await fetchImpl(`${STORAGE_BASE}/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Admin-User': STORAGE_USER,
      ...(RAILWAY_TOKEN ? { Authorization: `Bearer ${RAILWAY_TOKEN}` } : {})
    },
    body: JSON.stringify({ value: encoded })
  });
  if (!response.ok) {
    throw new Error(
      `Failed to store key "${key}": ${response.status} ${response.statusText}`
    );
  }
};

const deleteKey = async (fetchImpl, key) => {
  const response = await fetchImpl(`${STORAGE_BASE}/${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'X-Admin-User': STORAGE_USER,
      ...(RAILWAY_TOKEN ? { Authorization: `Bearer ${RAILWAY_TOKEN}` } : {})
    }
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Failed to delete key "${key}": ${response.status} ${response.statusText}`
    );
  }
};

const loadActivities = async (fetchImpl) => {
  const pointer = await fetchJson(fetchImpl, ACTIVITIES_KEY);
  if (pointer === SHARD_POINTER_TOKEN) {
    const manifestRaw = await fetchJson(fetchImpl, ACTIVITIES_MANIFEST_KEY);
    const manifest =
      typeof manifestRaw === 'string' ? JSON.parse(manifestRaw) : manifestRaw;
    if (!manifest || !Array.isArray(manifest.buckets)) {
      return [];
    }
    const aggregated = [];
    for (const bucketKey of manifest.buckets) {
      const bucketRaw = await fetchJson(fetchImpl, bucketKey);
      if (!bucketRaw) continue;
      const bucket =
        typeof bucketRaw === 'string' ? JSON.parse(bucketRaw) : bucketRaw;
      if (Array.isArray(bucket)) {
        aggregated.push(...bucket);
      }
    }
    return aggregated;
  }

  if (typeof pointer === 'string') {
    return JSON.parse(pointer);
  }

  return Array.isArray(pointer) ? pointer : [];
};

const orchestrate = async () => {
  const fetchImpl = await resolveFetch();

  console.log('Downloading hosted activities…');
  const activities = await loadActivities(fetchImpl);
  console.log(`Loaded ${activities.length} records`);

  const normalised = activities.map(normalizeActivity);

  const signatures = new Set();
  const userSummarySignatures = new Set();
  const deduped = [];
  normalised.forEach((activity) => {
    const signature = buildSignature(activity);
    if (signatures.has(signature)) {
      return;
    }
    signatures.add(signature);

    const userSummarySignature = buildUserSummarySignature(activity);
    if (userSummarySignatures.has(userSummarySignature)) {
      return;
    }
    userSummarySignatures.add(userSummarySignature);
    deduped.push(activity);
  });

  const patternResult = removePatternDuplicates(deduped);
  const cleaned = patternResult.records;

  console.log(
    `Deduplicated ${activities.length - cleaned.length} records. Uploading ${cleaned.length} activities…`
  );

  const bucketMap = buildBuckets(cleaned);
  const bucketKeys = Array.from(bucketMap.keys()).sort((a, b) =>
    b.localeCompare(a)
  );

  for (const bucketKey of bucketKeys) {
    const payload = JSON.stringify(bucketMap.get(bucketKey));
    await putJson(fetchImpl, bucketKey, payload);
    console.log(`  ✓ Wrote ${bucketKey} (${bucketMap.get(bucketKey).length})`);
  }

  const manifest = {
    version: Date.now(),
    buckets: bucketKeys
  };

  const staleManifestRaw = await fetchJson(fetchImpl, ACTIVITIES_MANIFEST_KEY);
  if (staleManifestRaw) {
    const staleManifest =
      typeof staleManifestRaw === 'string'
        ? JSON.parse(staleManifestRaw)
        : staleManifestRaw;
    const staleBuckets = (staleManifest?.buckets || []).filter(
      (bucketKey) => !bucketMap.has(bucketKey)
    );
    for (const staleBucket of staleBuckets) {
      await deleteKey(fetchImpl, staleBucket);
      console.log(`  • Removed stale bucket ${staleBucket}`);
    }
  }

  await putJson(fetchImpl, ACTIVITIES_MANIFEST_KEY, JSON.stringify(manifest));
  await putJson(fetchImpl, ACTIVITIES_KEY, SHARD_POINTER_TOKEN);

  console.log('Cleanup complete.');
};

orchestrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
