/**
 * App config: single query + in-memory cache.
 * Reduces DB load when many users load the app at once.
 * Config changes rarely; 30s cache is safe.
 */
const { getPool } = require('../db');
const logger = require('../logger');

const CONFIG_KEYS = ['feature_flags', 'dashboardVisibility', 'dashboardMonth'];

const defaultFeatureFlags = {
  csvImport: true,
  csvExport: true,
  winLoss: true,
  adminCsvExport: true
};

const defaultDashboardVisibility = {
  dashboard: true,
  csvImport: true,
  winLoss: true,
  reports: true,
  admin: true,
  activities: true,
  accounts: true,
  projectHealth: true,
  sfdcCompliance: true,
  logActivity: true,
  adminLogin: true,
  adminPoc: true
};

const CACHE_TTL_MS = 30 * 1000;
let cache = null;
let cacheExpiry = 0;

const parseFeatureFlags = (raw) => {
  if (!raw) return { ...defaultFeatureFlags };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const merged = { ...defaultFeatureFlags };
    Object.keys(defaultFeatureFlags).forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(parsed, k)) {
        merged[k] = Boolean(parsed[k]);
      }
    });
    return merged;
  } catch (e) {
    return { ...defaultFeatureFlags };
  }
};

const parseDashboardVisibility = (raw) => {
  if (!raw) return { ...defaultDashboardVisibility };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const merged = { ...defaultDashboardVisibility };
    Object.keys(parsed).forEach((k) => {
      if (Object.prototype.hasOwnProperty.call(merged, k)) {
        merged[k] = Boolean(parsed[k]);
      }
    });
    return merged;
  } catch (e) {
    return { ...defaultDashboardVisibility };
  }
};

const parseDashboardMonth = (raw) => {
  if (raw == null) return 'last';
  try {
    let s = raw;
    if (typeof s === 'string' && (s.startsWith('"') || s.startsWith('{'))) {
      const parsed = JSON.parse(s);
      s = typeof parsed === 'string' ? parsed : String(parsed);
    } else {
      s = String(s);
    }
    const trimmed = s.trim();
    return trimmed || 'last';
  } catch (e) {
    return 'last';
  }
};

/**
 * Get app config (feature flags, dashboard visibility, dashboard month).
 * Single DB query + 30s in-memory cache.
 */
const getAppConfig = async () => {
  const now = Date.now();
  if (cache && cacheExpiry > now) {
    return cache;
  }

  const pool = getPool();
  if (!pool) {
    return {
      featureFlags: { ...defaultFeatureFlags },
      dashboardVisibility: { ...defaultDashboardVisibility },
      dashboardMonth: 'last'
    };
  }

  try {
    const { rows } = await pool.query(
      'SELECT key, value FROM storage WHERE key = ANY($1::text[]);',
      [CONFIG_KEYS]
    );

    const byKey = {};
    (rows || []).forEach((r) => {
      byKey[r.key] = r.value;
    });

    const result = {
      featureFlags: parseFeatureFlags(byKey.feature_flags),
      dashboardVisibility: parseDashboardVisibility(byKey.dashboardVisibility),
      dashboardMonth: parseDashboardMonth(byKey.dashboardMonth)
    };

    cache = result;
    cacheExpiry = now + CACHE_TTL_MS;

    return result;
  } catch (error) {
    logger.warn('app_config_fetch_failed', { message: error.message });
    return {
      featureFlags: { ...defaultFeatureFlags },
      dashboardVisibility: { ...defaultDashboardVisibility },
      dashboardMonth: 'last'
    };
  }
};

/** Invalidate cache when admin updates config (call from admin config routes). */
const invalidateConfigCache = () => {
  cache = null;
  cacheExpiry = 0;
};

module.exports = {
  getAppConfig,
  invalidateConfigCache
};
