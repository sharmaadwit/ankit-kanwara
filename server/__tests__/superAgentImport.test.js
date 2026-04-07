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
      await pool.query(`
        CREATE TABLE IF NOT EXISTS storage_history (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ,
          archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        state.ensureSchema = null;
      }
    },
    __reset: async () => {
      ensurePool();
      await state.pool.query('TRUNCATE storage;');
      await state.pool.query('TRUNCATE storage_history;');
    }
  };
});

const request = require('supertest');
const { createApp } = require('../app');
const db = require('../db');

let app;
const prevForce = process.env.SUPER_AGENT_API_FORCE_ENABLED;
const prevKey = process.env.SUPER_AGENT_API_KEY;

beforeAll(async () => {
  process.env.SUPER_AGENT_API_FORCE_ENABLED = 'true';
  delete process.env.SUPER_AGENT_API_KEY;
  await db.initDb();
  app = createApp({ disableStatic: true });
});

beforeEach(async () => {
  await db.__reset();
  const pool = db.getPool();
  await pool.query(`INSERT INTO storage (key, value) VALUES ('users', $1)`, [
    JSON.stringify([{ id: 'u1', username: 'testuser', email: 't@example.com' }])
  ]);
  await pool.query(`INSERT INTO storage (key, value) VALUES ('accounts', $1)`, [JSON.stringify([])]);
  await pool.query(`INSERT INTO storage (key, value) VALUES ('activities', $1)`, [JSON.stringify([])]);
  await pool.query(`INSERT INTO storage (key, value) VALUES ('internalActivities', $1)`, [JSON.stringify([])]);
});

afterAll(async () => {
  if (prevForce === undefined) delete process.env.SUPER_AGENT_API_FORCE_ENABLED;
  else process.env.SUPER_AGENT_API_FORCE_ENABLED = prevForce;
  if (prevKey === undefined) delete process.env.SUPER_AGENT_API_KEY;
  else process.env.SUPER_AGENT_API_KEY = prevKey;
  await db.closePool();
});

describe('Super Agent import API', () => {
  test('returns 403 when integration disabled', async () => {
    process.env.SUPER_AGENT_API_FORCE_ENABLED = 'false';
    const localApp = createApp({ disableStatic: true });
    const res = await request(localApp).post('/api/integrations/super-agent/import/dry-run').send({
      rows: []
    });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SUPER_AGENT_DISABLED');
    process.env.SUPER_AGENT_API_FORCE_ENABLED = 'true';
  });

  test('returns 401 when API key required but missing', async () => {
    process.env.SUPER_AGENT_API_KEY = 'secret-sa-key';
    const localApp = createApp({ disableStatic: true });
    const res = await request(localApp)
      .post('/api/integrations/super-agent/import/dry-run')
      .send({
        rows: [
          {
            category: 'external',
            date: '2024-06-01',
            user: 'testuser',
            activityType: 'Customer Call',
            account: 'A',
            project: 'P',
            description: 'x'
          }
        ]
      });
    expect(res.status).toBe(401);
    process.env.SUPER_AGENT_API_KEY = '';
    delete process.env.SUPER_AGENT_API_KEY;
  });

  test('dry-run reports validation errors', async () => {
    const res = await request(app).post('/api/integrations/super-agent/import/dry-run').send({
      rows: [
        {
          category: 'external',
          date: '2024-06-01',
          user: 'nobody',
          activityType: 'Customer Call',
          account: 'A',
          project: 'P',
          description: 'x'
        }
      ]
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.summary.errorCount).toBe(1);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('dry-run marks valid external row as ready', async () => {
    const res = await request(app).post('/api/integrations/super-agent/import/dry-run').send({
      rows: [
        {
          category: 'external',
          date: '2024-06-01',
          user: 'testuser',
          activityType: 'Customer Call',
          account: 'Acme',
          project: 'Project One',
          description: 'Discussed roadmap'
        }
      ]
    });
    expect(res.status).toBe(200);
    expect(res.body.summary.readyCount).toBe(1);
    expect(res.body.rowResults[0].status).toBe('ready');
  });

  test('commit requires batch_id', async () => {
    const res = await request(app).post('/api/integrations/super-agent/import/commit').send({
      rows: [
        {
          category: 'external',
          date: '2024-06-01',
          user: 'testuser',
          activityType: 'Customer Call',
          account: 'Acme',
          project: 'Project One',
          description: 'Discussed roadmap'
        }
      ]
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BAD_BATCH_ID');
  });

  test('commit writes activities and idempotent replay', async () => {
    const body = {
      rows: [
        {
          category: 'external',
          date: '2024-06-01',
          user: 'testuser',
          activityType: 'Customer Call',
          account: 'Acme Corp',
          project: 'Project One',
          description: 'Discussed roadmap'
        }
      ]
    };
    const first = await request(app)
      .post('/api/integrations/super-agent/import/commit')
      .set('Idempotency-Key', 'batch-test-1')
      .send(body);
    expect(first.status).toBe(200);
    expect(first.body.ok).toBe(true);
    expect(first.body.externalCount).toBe(1);
    expect(first.body.activityIds).toEqual(['sa:batch-test-1:0']);

    const pool = db.getPool();
    const { rows: actRows } = await pool.query(`SELECT value FROM storage WHERE key = 'activities'`);
    const activities = JSON.parse(actRows[0].value);
    expect(activities.length).toBe(1);
    expect(activities[0].source).toBe('super_agent');
    expect(activities[0].accountName).toBe('Acme Corp');

    const second = await request(app)
      .post('/api/integrations/super-agent/import/commit')
      .set('Idempotency-Key', 'batch-test-1')
      .send(body);
    expect(second.status).toBe(200);
    expect(second.body.idempotent).toBe(true);
    expect(second.body.externalCount).toBe(1);
  });
});
