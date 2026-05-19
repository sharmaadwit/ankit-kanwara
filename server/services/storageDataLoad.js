const zlib = require('zlib');
const LZString = require('lz-string');
const { getPool } = require('../db');
const { loadActivitiesAndUsersFromRemote } = require('./storageRemoteFetch');

const LZ_PREFIX = '__lz__';
const GZIP_PREFIX = '__gz__';

const maybeDecompress = (value) => {
  if (typeof value !== 'string') return value;
  if (value.startsWith(LZ_PREFIX)) {
    try {
      const restored = LZString.decompressFromBase64(value.slice(LZ_PREFIX.length));
      if (restored != null) return restored;
    } catch (_) {
      // fall through
    }
  }
  if (value.startsWith(GZIP_PREFIX)) {
    try {
      const buffer = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
      return zlib.gunzipSync(buffer).toString('utf8');
    } catch (_) {
      // fall through
    }
  }
  return value;
};

const parseJsonArray = (raw) => {
  if (raw == null || raw === '') return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
};

const getStorageValueFromDb = async (pool, key) => {
  const { rows } = await pool.query('SELECT value FROM storage WHERE key = $1;', [key]);
  if (!rows.length) return null;
  return maybeDecompress(rows[0].value);
};

const loadActivitiesAndUsersFromDb = async () => {
  const pool = getPool();
  if (!pool) return null;

  try {
  const { rows: keyRows } = await pool.query(
    `SELECT key FROM storage
     WHERE key = 'activities' OR key LIKE 'activities:%' OR key = 'users'
     ORDER BY key ASC;`
  );

  const activityKeys = [];
  let hasUsersKey = false;
  keyRows.forEach((r) => {
    if (r.key === 'users') hasUsersKey = true;
    else if (r.key === 'activities' || /^activities:\d{4}-\d{2}$/.test(r.key)) activityKeys.push(r.key);
  });
  if (!activityKeys.length) activityKeys.push('activities');

  const byId = new Map();
  for (const key of activityKeys) {
    const raw = await getStorageValueFromDb(pool, key);
    parseJsonArray(raw).forEach((row) => {
      if (!row || row.id == null) return;
      byId.set(String(row.id), row);
    });
  }

  let users = [];
  if (hasUsersKey) {
    const rawUsers = await getStorageValueFromDb(pool, 'users');
    users = parseJsonArray(rawUsers);
  }

  return {
    source: 'database',
    fetchedAt: new Date().toISOString(),
    activityKeys,
    activities: Array.from(byId.values()),
    users
  };
  } catch (_) {
    return null;
  }
};

/**
 * Load activities + users for export APIs: Postgres storage when available, else hosted HTTP.
 */
const loadActivitiesAndUsers = async (options = {}) => {
  if (!options.preferRemote) {
    const fromDb = await loadActivitiesAndUsersFromDb();
    if (fromDb) return fromDb;
  }
  return loadActivitiesAndUsersFromRemote(options);
};

module.exports = {
  loadActivitiesAndUsers,
  loadActivitiesAndUsersFromDb,
  maybeDecompress,
  parseJsonArray
};
