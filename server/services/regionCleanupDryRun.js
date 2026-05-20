/**
 * Dry-run / apply: map activity salesRepRegion from PreSight users (email → defaultRegion).
 * Logger key: assignedUserEmail (then salesRepEmail, then username).
 */

const fs = require('fs');
const zlib = require('zlib');
const LZString = require('lz-string');

const GZIP_PREFIX = '__gz__';
const LZ_PREFIX = '__lz__';
const MANIFEST_KEY = '__shard_manifest:activities__';
const ACTIVITY_BUCKET_PREFIX = 'activities:';

function decompress(value) {
  if (typeof value !== 'string') return value;
  if (value.startsWith(LZ_PREFIX)) {
    return LZString.decompressFromBase64(value.slice(LZ_PREFIX.length));
  }
  if (value.startsWith(GZIP_PREFIX)) {
    const buf = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    return zlib.gunzipSync(buf).toString('utf8');
  }
  return value;
}

function parseJsonValue(raw) {
  if (raw == null) return null;
  const decoded = decompress(raw);
  try {
    return typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
  } catch (_) {
    return null;
  }
}

function normEmail(v) {
  return (v && typeof v === 'string' ? v : '').trim().toLowerCase();
}

function normRegion(v) {
  return (v && typeof v === 'string' ? v : '').trim();
}

function regionsEqual(a, b) {
  return normRegion(a).toLowerCase() === normRegion(b).toLowerCase();
}

function regionFromUser(user) {
  if (!user) return '';
  const d = normRegion(user.defaultRegion || user.default_region);
  if (d) return d;
  const regions = Array.isArray(user.regions) ? user.regions : [];
  return regions.map((r) => normRegion(r)).find(Boolean) || '';
}

async function loadPresalesUserMap(pool) {
  const byEmail = new Map();
  const byUsername = new Map();
  let source = 'db';

  try {
    const { rows } = await pool.query(
      `SELECT username, email, default_region, regions, is_active
       FROM users WHERE is_active = true`
    );
    for (const row of rows) {
      const region = regionFromUser({
        default_region: row.default_region,
        regions: row.regions
      });
      if (!region) continue;
      const entry = {
        email: normEmail(row.email),
        username: (row.username || '').trim().toLowerCase(),
        region
      };
      if (entry.email) byEmail.set(entry.email, entry);
      if (entry.username) byUsername.set(entry.username, entry);
    }
  } catch (e) {
    if (e.code !== '42P01') throw e;
    source = 'none';
  }

  if (byEmail.size === 0) {
    source = 'storage.users';
    const row = await pool.query(`SELECT value FROM storage WHERE key = 'users'`);
    if (row.rows.length) {
      const parsed = parseJsonValue(row.rows[0].value);
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.users) ? parsed.users : [];
      for (const u of list) {
        if (u && u.isActive === false) continue;
        const region = regionFromUser(u);
        if (!region) continue;
        const entry = {
          email: normEmail(u.email),
          username: (u.username || '').trim().toLowerCase(),
          region
        };
        if (entry.email) byEmail.set(entry.email, entry);
        if (entry.username) byUsername.set(entry.username, entry);
      }
    }
  }

  return { byEmail, byUsername, source, count: byEmail.size };
}

function lookupPresalesRegion(rawIdentifier, map) {
  const id = normEmail(rawIdentifier);
  if (!id) return { region: null, matchedBy: null, key: '' };
  if (map.byEmail.has(id)) {
    return { region: map.byEmail.get(id).region, matchedBy: 'email', key: id };
  }
  if (map.byUsername.has(id)) {
    return { region: map.byUsername.get(id).region, matchedBy: 'username', key: id };
  }
  return { region: null, matchedBy: null, key: id };
}

function activityLoggerKey(activity) {
  return (
    normEmail(activity.assignedUserEmail) ||
    normEmail(activity.salesRepEmail) ||
    normEmail(activity.userId) ||
    (activity.userName && typeof activity.userName === 'string'
      ? activity.userName.trim().toLowerCase()
      : '')
  );
}

function analyzeActivity(activity, map) {
  const key = activityLoggerKey(activity);
  const current = normRegion(activity.salesRepRegion);
  if (!key) {
    return { activity, changed: false, reason: 'no_logger_id' };
  }
  const lookup = lookupPresalesRegion(key, map);
  if (!lookup.region) {
    return {
      activity,
      changed: false,
      reason: 'unmapped',
      unmappedKey: key,
      current,
      accountName: activity.accountName || ''
    };
  }
  if (regionsEqual(current, lookup.region)) {
    return { activity, changed: false, reason: 'ok' };
  }
  return {
    activity: { ...activity, salesRepRegion: lookup.region },
    changed: true,
    reason: 'fix',
    unmappedKey: key,
    from: current || '(empty)',
    to: lookup.region,
    matchedBy: lookup.matchedBy,
    offIndiaSouth: current === 'India South' && lookup.region !== 'India South'
  };
}

function processBuckets(byBucket, map) {
  const stats = {
    would_fix: 0,
    already_ok: 0,
    no_logger_id: 0,
    off_india_south: 0,
    unmapped: new Map()
  };
  const out = new Map();
  for (const [bucketKey, arr] of byBucket) {
    const next = [];
    for (const act of arr) {
      const r = analyzeActivity(act, map);
      next.push(r.activity);
      if (r.reason === 'no_logger_id') stats.no_logger_id += 1;
      else if (r.reason === 'unmapped') {
        stats.unmapped.set(r.unmappedKey, (stats.unmapped.get(r.unmappedKey) || 0) + 1);
      } else if (r.reason === 'ok') stats.already_ok += 1;
      else if (r.reason === 'fix') {
        stats.would_fix += 1;
        if (r.offIndiaSouth) stats.off_india_south += 1;
      }
    }
    out.set(bucketKey, next);
  }
  return { stats, out };
}

async function loadStorageKey(pool, key) {
  const { rows } = await pool.query('SELECT value FROM storage WHERE key = $1', [key]);
  if (!rows.length) return [];
  const parsed = parseJsonValue(rows[0].value);
  return Array.isArray(parsed) ? parsed : [];
}

async function loadActivityBuckets(pool, keyPattern) {
  const { rows } = await pool.query(
    `SELECT key, value FROM storage WHERE key LIKE $1 ORDER BY key`,
    [keyPattern]
  );
  const byBucket = new Map();
  let total = 0;
  for (const r of rows) {
    const list = parseJsonValue(r.value);
    const arr = Array.isArray(list) ? list : [];
    byBucket.set(r.key, arr);
    total += arr.length;
  }
  return { byBucket, total };
}

async function loadLiveActivityBuckets(pool) {
  const byBucket = new Map();
  let total = 0;
  const manifest = await pool.query(`SELECT value FROM storage WHERE key = $1`, [MANIFEST_KEY]);
  if (manifest.rows.length) {
    const parsed = parseJsonValue(manifest.rows[0].value);
    if (parsed && Array.isArray(parsed.buckets)) {
      for (const k of parsed.buckets) {
        const arr = await loadStorageKey(pool, k);
        byBucket.set(k, arr);
        total += arr.length;
      }
    }
  }
  const extra = await loadActivityBuckets(pool, `${ACTIVITY_BUCKET_PREFIX}%`);
  for (const [k, arr] of extra.byBucket) {
    if (!byBucket.has(k)) {
      byBucket.set(k, arr);
      total += arr.length;
    }
  }
  return { byBucket, total };
}

/**
 * @param {import('pg').Pool} pool
 * @returns {Promise<object>} dry-run report
 */
async function runRegionCleanupDryRun(pool) {
  const userMap = await loadPresalesUserMap(pool);
  if (userMap.count === 0) {
    throw new Error('No active presales users with default_region in users table');
  }

  const liveActs = await loadLiveActivityBuckets(pool);
  const migActs = await loadActivityBuckets(pool, 'migration_%activities:%');

  const liveResult = processBuckets(liveActs.byBucket, userMap);
  const migResult = processBuckets(migActs.byBucket, userMap);

  const mergeUnmapped = new Map();
  for (const s of [liveResult.stats, migResult.stats]) {
    for (const [k, n] of s.unmapped) {
      mergeUnmapped.set(k, (mergeUnmapped.get(k) || 0) + n);
    }
  }

  const unmapped = [...mergeUnmapped.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([identifier, rowCount]) => ({ identifier, rowCount }));

  return {
    userMapSource: userMap.source,
    presalesUsersWithRegion: userMap.count,
    live: {
      buckets: liveActs.byBucket.size,
      rows: liveActs.total,
      fixes: liveResult.stats.would_fix,
      alreadyOk: liveResult.stats.already_ok,
      noLoggerId: liveResult.stats.no_logger_id,
      offIndiaSouth: liveResult.stats.off_india_south
    },
    migration: {
      buckets: migActs.byBucket.size,
      rows: migActs.total,
      fixes: migResult.stats.would_fix,
      alreadyOk: migResult.stats.already_ok,
      noLoggerId: migResult.stats.no_logger_id,
      offIndiaSouth: migResult.stats.off_india_south
    },
    summary: {
      totalActivityFixes: liveResult.stats.would_fix + migResult.stats.would_fix,
      totalOffIndiaSouth: liveResult.stats.off_india_south + migResult.stats.off_india_south,
      unmappedUnique: unmapped.length,
      unmappedRows: unmapped.reduce((s, u) => s + u.rowCount, 0)
    },
    unmapped
  };
}

module.exports = {
  runRegionCleanupDryRun,
  loadPresalesUserMap,
  analyzeActivity,
  activityLoggerKey,
  parseJsonValue,
  processBuckets
};
