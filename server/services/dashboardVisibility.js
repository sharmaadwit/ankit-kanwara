const { getPool } = require('../db');
const logger = require('../logger');

const STORAGE_KEY = 'dashboardVisibility';

const defaultVisibility = {
  csvImport: true,
  winLoss: true,
  reports: true,
  dashboard: true,
  admin: true
};

const normalizeVisibility = (input = {}) => {
  const normalized = { ...defaultVisibility };
  Object.keys(defaultVisibility).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      normalized[key] = Boolean(input[key]);
    }
  });
  return normalized;
};

const getDashboardVisibility = async () => {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT value FROM storage WHERE key = $1 LIMIT 1;',
    [STORAGE_KEY]
  );

  if (!rows.length) {
    return { ...defaultVisibility };
  }

  try {
    const parsed = JSON.parse(rows[0].value);
    return normalizeVisibility(parsed);
  } catch (error) {
    logger.warn('dashboard_visibility_parse_failed', { message: error.message });
    return { ...defaultVisibility };
  }
};

const setDashboardVisibility = async (visibility = {}) => {
  const pool = getPool();
  const normalized = normalizeVisibility(visibility);

  await pool.query(
    `
      INSERT INTO storage (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = excluded.value,
                    updated_at = NOW();
    `,
    [STORAGE_KEY, JSON.stringify(normalized)]
  );

  logger.info('dashboard_visibility_updated', normalized);
  return normalized;
};

module.exports = {
  defaultDashboardVisibility: { ...defaultVisibility },
  getDashboardVisibility,
  setDashboardVisibility
};


