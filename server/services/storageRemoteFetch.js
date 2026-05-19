const zlib = require('zlib');
const { decompressFromBase64 } = require('../../pams-app/js/vendor/lz-string.js');

const DEFAULT_REMOTE_BASE = 'https://ankit-kanwara-production.up.railway.app/api/storage';

const normalizeBase = (value) => {
  if (!value) return '';
  let trimmed = String(value).trim();
  while (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1);
  return trimmed;
};

const buildHeaders = () => {
  const headers = { Accept: 'application/json' };
  if (process.env.REMOTE_STORAGE_USER) {
    headers['X-Admin-User'] = process.env.REMOTE_STORAGE_USER;
  }
  const apiKey = (process.env.REMOTE_STORAGE_API_KEY || process.env.STORAGE_API_KEY || '').trim();
  if (apiKey) headers['X-Api-Key'] = apiKey;
  if (process.env.REMOTE_STORAGE_HEADERS) {
    try {
      const parsed = JSON.parse(process.env.REMOTE_STORAGE_HEADERS);
      Object.entries(parsed).forEach(([key, value]) => {
        if (value != null && value !== '') headers[key] = String(value);
      });
    } catch (_) {
      // ignore
    }
  }
  return headers;
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

const parseStoredValue = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const decoded = decodeValue(payload.value);
  if (typeof decoded === 'string') {
    try {
      return JSON.parse(decoded);
    } catch (_) {
      return decoded;
    }
  }
  return decoded;
};

const resolveFetch = async () => {
  if (typeof fetch === 'function') return fetch;
  const { default: nodeFetch } = await import('node-fetch');
  return nodeFetch;
};

const fetchKeyList = async (base, fetchImpl, headers) => {
  const response = await fetchImpl(base, { headers });
  if (!response.ok) {
    let msg = `Storage list failed: ${response.status} ${response.statusText}`;
    if (response.status === 401) {
      msg += '. Set REMOTE_STORAGE_USER and/or STORAGE_API_KEY in .env.';
    }
    throw new Error(msg);
  }
  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.keys)) return payload.keys;
  throw new Error('Unexpected response when listing storage keys.');
};

const fetchRemoteKey = async (base, key, fetchImpl, headers) => {
  const response = await fetchImpl(`${base}/${encodeURIComponent(key)}`, { headers });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch "${key}": ${response.status} ${response.statusText}`);
  }
  const payload = await response.json();
  return parseStoredValue(payload);
};

const activityStorageKeys = (allKeys) => {
  const keys = new Set();
  (allKeys || []).forEach((k) => {
    if (k === 'activities' || /^activities:\d{4}-\d{2}$/.test(k)) keys.add(k);
  });
  if (!keys.size) keys.add('activities');
  return Array.from(keys).sort();
};

const loadActivitiesAndUsersFromRemote = async (options = {}) => {
  const base = normalizeBase(options.base || process.env.REMOTE_STORAGE_BASE) || DEFAULT_REMOTE_BASE;
  const fetchImpl = await resolveFetch();
  const headers = buildHeaders();
  const allKeys = await fetchKeyList(base, fetchImpl, headers);
  const actKeys = activityStorageKeys(allKeys);
  const byId = new Map();
  for (const key of actKeys) {
    const list = await fetchRemoteKey(base, key, fetchImpl, headers);
    if (!Array.isArray(list)) continue;
    list.forEach((row) => {
      if (!row || row.id == null) return;
      byId.set(String(row.id), row);
    });
  }
  let users = [];
  if (allKeys.includes('users')) {
    const rawUsers = await fetchRemoteKey(base, 'users', fetchImpl, headers);
    if (Array.isArray(rawUsers)) users = rawUsers;
  }
  return {
    source: base,
    fetchedAt: new Date().toISOString(),
    activityKeys: actKeys,
    activities: Array.from(byId.values()),
    users
  };
};

module.exports = {
  normalizeBase,
  buildHeaders,
  loadActivitiesAndUsersFromRemote,
  DEFAULT_REMOTE_BASE
};
