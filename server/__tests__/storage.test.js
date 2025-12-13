jest.mock('../db', () => {
  const { newDb } = require('pg-mem');

  const state = {
    pool: null,
    ensureSchema: null
  };

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
    if (!state.pool) {
      initialisePool();
    }
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
    }
  };
});

const request = require('supertest');

const { createApp } = require('../app');
const db = require('../db');

let app;

beforeAll(async () => {
  await db.initDb();
  app = createApp({ disableStatic: true });
});

beforeEach(async () => {
  await db.__reset();
});

afterAll(async () => {
  await db.closePool();
});

describe('Storage API', () => {
  test('lists keys when storage is empty', async () => {
    const res = await request(app).get('/api/storage');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ keys: [] });
  });

  test('creates and retrieves a value', async () => {
    await request(app)
      .put('/api/storage/test-key')
      .send({ value: 'hello-world' })
      .expect(204);

    const res = await request(app).get('/api/storage/test-key');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ key: 'test-key', value: 'hello-world' });
  });

  test('deletes a single key', async () => {
    await request(app)
      .put('/api/storage/delete-me')
      .send({ value: 'to-remove' })
      .expect(204);

    await request(app).delete('/api/storage/delete-me').expect(204);

    const res = await request(app).get('/api/storage/delete-me');
    expect(res.status).toBe(404);
  });

  test('clears all keys', async () => {
    await request(app)
      .put('/api/storage/alpha')
      .send({ value: 'one' })
      .expect(204);
    await request(app)
      .put('/api/storage/beta')
      .send({ value: 'two' })
      .expect(204);

    const before = await request(app).get('/api/storage');
    expect(before.status).toBe(200);
    expect(before.body.keys).toEqual(expect.arrayContaining(['alpha', 'beta']));

    await request(app).delete('/api/storage').expect(204);

    const after = await request(app).get('/api/storage');
    expect(after.status).toBe(200);
    expect(after.body.keys).toEqual([]);
  });
});


