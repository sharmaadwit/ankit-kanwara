jest.mock('../db', () => {
  const { newDb } = require('pg-mem');

  const state = { pool: null, ensureSchema: null };

  const initialisePool = () => {
    const db = newDb();
    const pgMem = db.adapters.createPg();
    const pool = new pgMem.Pool();
    const ensureSchema = async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS storage (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
    };
    state.pool = pool;
    state.ensureSchema = ensureSchema;
  };

  const ensurePool = () => {
    if (!state.pool) initialisePool();
  };

  return {
    initDb: async () => {
      ensurePool();
      await state.ensureSchema();
    },
    getPool: () => {
      ensurePool();
      return state.pool;
    },
    closePool: async () => {
      if (state.pool) {
        await state.pool.end();
        state.pool = null;
      }
    },
    __reset: async () => {
      ensurePool();
      await state.pool.query('TRUNCATE storage;');
    }
  };
});

const request = require('supertest');
const { createApp } = require('../app');
const db = require('../db');

let app;

beforeAll(async () => {
  process.env.STORAGE_API_KEY = 'test-export-key';
  await db.initDb();
  app = createApp({ disableStatic: true });
});

beforeEach(async () => {
  await db.__reset();
  const pool = db.getPool();
  const activities = [
    {
      id: 'a1',
      date: '2025-08-10',
      userName: 'Ankit Kanwara',
      isInternal: false,
      type: 'customerCall',
      details: { callType: 'Demo' }
    },
    {
      id: 'a2',
      date: '2025-09-01',
      userName: 'Ankit Kanwara',
      isInternal: true,
      type: 'internal'
    },
    {
      id: 'a3',
      date: '2024-06-01',
      userName: 'Other User',
      isInternal: false,
      type: 'sow'
    }
  ];
  const users = [{ id: 'u1', name: 'Ankit Kanwara', username: 'ankit' }];
  await pool.query(
    `INSERT INTO storage (key, value, updated_at) VALUES
      ('activities', $1, NOW()),
      ('users', $2, NOW());`,
    [JSON.stringify(activities), JSON.stringify(users)]
  );
});

afterAll(async () => {
  delete process.env.STORAGE_API_KEY;
  await db.closePool();
});

describe('GET /api/export/annual-user-activity', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/export/annual-user-activity');
    expect(res.status).toBe(401);
  });

  it('schema endpoint describes formats', async () => {
    const res = await request(app)
      .get('/api/export/annual-user-activity/schema')
      .set('X-Api-Key', 'test-export-key');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.formats.length).toBeGreaterThan(0);
  });

  it('returns JSON summary for date range with API key', async () => {
    const res = await request(app)
      .get('/api/export/annual-user-activity')
      .query({ from: '2025-07-01', to: '2025-12-31' })
      .set('X-Api-Key', 'test-export-key');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.meta.totalActivitiesInRange).toBe(2);
    expect(res.body.summaryByUser.some((r) => r.user === 'Ankit Kanwara' && r.totalActivities === 2)).toBe(
      true
    );
  });

  it('returns summary CSV', async () => {
    const res = await request(app)
      .get('/api/export/annual-user-activity')
      .query({ from: '2025-07-01', to: '2025-12-31', format: 'summary-csv' })
      .set('X-Api-Key', 'test-export-key');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.text).toContain('Ankit Kanwara');
    expect(res.text).toContain('totalActivities');
  });

  it('rejects invalid date range', async () => {
    const res = await request(app)
      .get('/api/export/annual-user-activity')
      .query({ from: '2025-12-31', to: '2025-07-01' })
      .set('X-Api-Key', 'test-export-key');
    expect(res.status).toBe(400);
  });
});
