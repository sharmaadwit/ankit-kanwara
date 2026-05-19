jest.mock('../db', () => {
  const { newDb } = require('pg-mem');
  const state = { pool: null };

  const ensurePool = () => {
    if (state.pool) return;
    const db = newDb();
    const pgMem = db.adapters.createPg();
    state.pool = new pgMem.Pool();
  };

  return {
    getPool: () => {
      ensurePool();
      return state.pool;
    }
  };
});

const { getPool } = require('../db');
const { loadMigratedActivitiesForYear, listMigratedActivityYears } = require('../services/migrationActivitiesLoad');

describe('migrationActivitiesLoad', () => {
  beforeAll(async () => {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE storage (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
  });

  beforeEach(async () => {
    await getPool().query('DELETE FROM storage;');
  });

  it('loads external and internal rows for a pre-2026 year', async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO storage (key, value) VALUES
        ($1, $2),
        ($3, $4);`,
      [
        'migration_draft_activities:2025-12',
        JSON.stringify([
          { id: 'e1', date: '2025-12-15', type: 'customerCall', accountId: 'a1', accountName: 'Acme' }
        ]),
        'migration_draft_internalActivities',
        JSON.stringify([
          { id: 'i1', date: '2025-11-01', monthOfActivity: '2025-11', type: 'other', activityName: 'Internal sync' }
        ])
      ]
    );

    const payload = await loadMigratedActivitiesForYear('2025');
    expect(payload.months).toContain('2025-12');
    expect(payload.externalCount).toBe(1);
    expect(payload.internalCount).toBe(1);
    expect(payload.activities).toHaveLength(2);
    expect(payload.activities.find((a) => a.id === 'e1').source).toBe('migration');
  });

  it('prefers confirmed bucket over draft for the same month', async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO storage (key, value) VALUES ($1, $2), ($3, $4);`,
      [
        'migration_draft_activities:2025-06',
        JSON.stringify([{ id: 'old', date: '2025-06-01', type: 'customerCall' }]),
        'migration_confirmed_activities:2025-06',
        JSON.stringify([{ id: 'new', date: '2025-06-02', type: 'customerCall' }])
      ]
    );

    const payload = await loadMigratedActivitiesForYear('2025');
    expect(payload.externalCount).toBe(1);
    expect(payload.activities[0].id).toBe('new');
  });

  it('lists years before 2026 from migration activity keys', async () => {
    const pool = getPool();
    await pool.query(
      `INSERT INTO storage (key, value) VALUES ($1, $2), ($3, $4);`,
      [
        'migration_draft_activities:2025-12',
        '[]',
        'migration_draft_activities:2024-07',
        '[]'
      ]
    );

    const years = await listMigratedActivityYears();
    expect(years).toEqual(expect.arrayContaining(['2024', '2025']));
    expect(years.every((y) => y < '2026')).toBe(true);
  });
});
