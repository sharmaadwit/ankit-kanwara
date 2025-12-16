const { getPool } = require('../db');

const FEATURE_FLAGS_KEY = 'feature_flags';

const defaultFlags = {
  csvImport: true,
  csvExport: true,
  winLoss: true,
  adminCsvExport: true
};

const sanitizeFlags = (flags = {}) => {
  const sanitized = {};
  Object.keys(defaultFlags).forEach((flag) => {
    if (Object.prototype.hasOwnProperty.call(flags, flag)) {
      sanitized[flag] = Boolean(flags[flag]);
    }
  });
  return sanitized;
};

const getFeatureFlags = async () => {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT value FROM storage WHERE key = $1;',
    [FEATURE_FLAGS_KEY]
  );

  if (!rows.length || !rows[0].value) {
    return { ...defaultFlags };
  }

  try {
    const parsed = JSON.parse(rows[0].value);
    return { ...defaultFlags, ...sanitizeFlags(parsed) };
  } catch (error) {
    console.warn('Failed to parse feature flags; falling back to defaults.', error);
    return { ...defaultFlags };
  }
};

const setFeatureFlags = async (flags = {}) => {
  const pool = getPool();
  const merged = { ...defaultFlags, ...sanitizeFlags(flags) };

  await pool.query(
    `
      INSERT INTO storage (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = excluded.value, updated_at = NOW();
    `,
    [FEATURE_FLAGS_KEY, JSON.stringify(merged)]
  );

  return merged;
};

const isFeatureEnabled = async (flagName) => {
  const flags = await getFeatureFlags();
  return flags[flagName] !== false;
};

module.exports = {
  defaultFlags,
  getFeatureFlags,
  setFeatureFlags,
  isFeatureEnabled
};


