/**
 * Load pre-2026 migrated activities from protected migration_* storage keys.
 * Used by the Annual report (PDF) tab only — live activity shards stay Jan 2026+.
 */

const { getPool } = require('../db');
const { maybeDecompress, parseJsonArray } = require('./storageDataLoad');

const monthFromActivityKey = (key) => {
  const m = String(key || '').match(/migration_(?:confirmed|draft)_activities:(\d{4}-\d{2})$/);
  return m ? m[1] : null;
};

const monthFromActivity = (activity) => {
  if (!activity || typeof activity !== 'object') return null;
  const raw = activity.monthOfActivity || activity.date || activity.createdAt;
  if (!raw) return null;
  const s = typeof raw === 'string' ? raw : (raw.toISOString && raw.toISOString()) || '';
  return s.length >= 7 ? s.slice(0, 7) : null;
};

const normalizeMigratedRow = (activity, { isInternal }) => {
  if (!activity || activity.id == null) return null;
  return {
    ...activity,
    isInternal: isInternal === true,
    source: activity.source || 'migration',
    isMigrated: true
  };
};

/**
 * @param {string|number} year - calendar year e.g. 2025
 * @returns {{ year: string, months: string[], activities: object[], externalCount: number, internalCount: number }}
 */
const loadMigratedActivitiesForYear = async (year) => {
  const yearStr = String(year || '').trim();
  if (!/^\d{4}$/.test(yearStr)) {
    return { year: yearStr, months: [], activities: [], externalCount: 0, internalCount: 0 };
  }

  const pool = getPool();
  if (!pool) {
    return { year: yearStr, months: [], activities: [], externalCount: 0, internalCount: 0 };
  }

  const { rows } = await pool.query(
    `SELECT key, value FROM storage
     WHERE key LIKE $1
        OR key LIKE $2
        OR key IN ('migration_confirmed_internalActivities', 'migration_draft_internalActivities')
     ORDER BY key ASC;`,
    [`migration_confirmed_activities:${yearStr}-%`, `migration_draft_activities:${yearStr}-%`]
  );

  const draftByMonth = new Map();
  const confirmedByMonth = new Map();
  let internalDraft = [];
  let internalConfirmed = [];

  rows.forEach((row) => {
    const key = row.key;
    const list = parseJsonArray(maybeDecompress(row.value));
    if (key === 'migration_confirmed_internalActivities') {
      internalConfirmed = list;
      return;
    }
    if (key === 'migration_draft_internalActivities') {
      internalDraft = list;
      return;
    }
    const month = monthFromActivityKey(key);
    if (!month || !month.startsWith(yearStr)) return;
    if (key.startsWith('migration_confirmed_activities:')) {
      confirmedByMonth.set(month, list);
    } else if (key.startsWith('migration_draft_activities:')) {
      draftByMonth.set(month, list);
    }
  });

  const months = new Set([...draftByMonth.keys(), ...confirmedByMonth.keys()]);
  const externalById = new Map();

  months.forEach((month) => {
    const list = confirmedByMonth.get(month) || draftByMonth.get(month) || [];
    list.forEach((row) => {
      const normalized = normalizeMigratedRow(row, { isInternal: false });
      if (!normalized) return;
      externalById.set(String(normalized.id), normalized);
    });
  });

  const internalSource = internalConfirmed.length ? internalConfirmed : internalDraft;
  const internalForYear = internalSource
    .map((row) => normalizeMigratedRow(row, { isInternal: true }))
    .filter(Boolean)
    .filter((row) => {
      const month = monthFromActivity(row);
      return month && month.startsWith(yearStr);
    });

  const activities = [...externalById.values(), ...internalForYear];

  return {
    year: yearStr,
    months: Array.from(months).sort(),
    activities,
    externalCount: externalById.size,
    internalCount: internalForYear.length
  };
};

/**
 * Years that have at least one migration_* activity month bucket or internal row in-range.
 */
const listMigratedActivityYears = async () => {
  const pool = getPool();
  if (!pool) return [];

  const { rows } = await pool.query(
    `SELECT key FROM storage
     WHERE key LIKE 'migration_confirmed_activities:%'
        OR key LIKE 'migration_draft_activities:%'
     ORDER BY key ASC;`
  );

  const years = new Set();
  rows.forEach((row) => {
    const month = monthFromActivityKey(row.key);
    if (month) years.add(month.slice(0, 4));
  });

  return Array.from(years).filter((y) => y < '2026').sort((a, b) => a.localeCompare(b));
};

module.exports = {
  loadMigratedActivitiesForYear,
  listMigratedActivityYears
};
