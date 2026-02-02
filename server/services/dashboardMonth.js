const { getPool } = require('../db');
const logger = require('../logger');

const STORAGE_KEY = 'dashboardMonth';
const DEFAULT_MONTH = 'last'; // so "most people enter activities up to 5th" — default to last month

const getDashboardMonth = async () => {
  const pool = getPool();
  if (!pool) {
    return DEFAULT_MONTH;
  }
  try {
    const { rows } = await pool.query(
      'SELECT value FROM storage WHERE key = $1 LIMIT 1;',
      [STORAGE_KEY]
    );
    if (!rows.length) {
      return DEFAULT_MONTH;
    }
    const raw = rows[0].value;
    if (typeof raw === 'string') {
      try {
        const parsed = (raw.startsWith('"') || raw.startsWith('{')) ? JSON.parse(raw) : raw;
        return typeof parsed === 'string' ? parsed : DEFAULT_MONTH;
      } catch {
        return raw.trim() || DEFAULT_MONTH;
      }
    }
    if (typeof raw === 'object' && raw !== null) return DEFAULT_MONTH;
    return DEFAULT_MONTH;
  } catch (error) {
    logger.warn('dashboard_month_get_failed', { message: error.message });
    return DEFAULT_MONTH;
  }
};

const setDashboardMonth = async (value) => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database not available');
  }
  const normalized = typeof value === 'string' && value.trim() ? value.trim() : DEFAULT_MONTH;
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
  logger.info('dashboard_month_updated', { dashboardMonth: normalized });
  return normalized;
};

module.exports = {
  DEFAULT_DASHBOARD_MONTH: DEFAULT_MONTH,
  getDashboardMonth,
  setDashboardMonth
};
