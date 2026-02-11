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
      await pool.query(`
        CREATE TABLE IF NOT EXISTS storage_history (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ,
          archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS pending_storage_saves (
          id SERIAL PRIMARY KEY,
          storage_key TEXT NOT NULL,
          value TEXT NOT NULL,
          reason TEXT NOT NULL,
          username TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS storage_mutations (
          mutation_id TEXT PRIMARY KEY,
          storage_key TEXT NOT NULL,
          response_updated_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
      await state.pool.query('TRUNCATE storage_history;');
      await state.pool.query('TRUNCATE pending_storage_saves;');
      await state.pool.query('TRUNCATE storage_mutations;');
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
    const putRes = await request(app)
      .put('/api/storage/test-key')
      .send({ value: 'hello-world' });
    expect(putRes.status).toBe(200);
    expect(putRes.body).toHaveProperty('key', 'test-key');
    expect(putRes.body).toHaveProperty('updated_at');

    const res = await request(app).get('/api/storage/test-key');
    expect(res.status).toBe(200);
    expect(res.body.key).toBe('test-key');
    expect(res.body.value).toBe('hello-world');
    expect(res.body).toHaveProperty('updated_at');
  });

  test('deletes a single key', async () => {
    await request(app)
      .put('/api/storage/delete-me')
      .send({ value: 'to-remove' })
      .expect(200);

    await request(app).delete('/api/storage/delete-me').expect(204);

    const res = await request(app).get('/api/storage/delete-me');
    expect(res.status).toBe(404);
  });

  test('conditional PUT returns 409 on conflict and 200 with updated_at on success', async () => {
    await request(app)
      .put('/api/storage/cond-key')
      .send({ value: 'v1' })
      .expect(200);

    const getRes = await request(app).get('/api/storage/cond-key');
    expect(getRes.status).toBe(200);
    const etag = getRes.body.updated_at;
    expect(etag).toBeDefined();

    const putRes = await request(app)
      .put('/api/storage/cond-key')
      .set('If-Match', etag)
      .send({ value: 'v2' });
    expect(putRes.status).toBe(200);
    expect(putRes.body).toHaveProperty('updated_at');

    const conflictRes = await request(app)
      .put('/api/storage/cond-key')
      .set('If-Match', etag)
      .send({ value: 'v3' });
    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.value).toBe('v2');
    expect(conflictRes.body.updated_at).toBeDefined();
  });

  test('replays idempotent mutation id without overwriting newer value', async () => {
    const first = await request(app)
      .put('/api/storage/idempotent-key')
      .set('X-Client-Mutation-Id', 'mut-a1')
      .send({ value: 'one' });
    expect(first.status).toBe(200);
    expect(first.body.updated_at).toBeDefined();

    // Simulate a stale retry carrying a different payload but same mutation id.
    const replay = await request(app)
      .put('/api/storage/idempotent-key')
      .set('X-Client-Mutation-Id', 'mut-a1')
      .send({ value: 'two' });
    expect(replay.status).toBe(200);
    expect(replay.body.updated_at).toBe(first.body.updated_at);
    expect(replay.body.replayed).toBe(true);

    const fetched = await request(app).get('/api/storage/idempotent-key');
    expect(fetched.status).toBe(200);
    expect(fetched.body.value).toBe('one');
  });

  test('rejects mutation id reuse across different keys', async () => {
    await request(app)
      .put('/api/storage/key-a')
      .set('X-Client-Mutation-Id', 'mut-same')
      .send({ value: 'alpha' })
      .expect(200);

    const conflict = await request(app)
      .put('/api/storage/key-b')
      .set('X-Client-Mutation-Id', 'mut-same')
      .send({ value: 'beta' });
    expect(conflict.status).toBe(409);
  });

  test('clears all keys', async () => {
    await request(app)
      .put('/api/storage/alpha')
      .send({ value: 'one' })
      .expect(200);
    await request(app)
      .put('/api/storage/beta')
      .send({ value: 'two' })
      .expect(200);

    const before = await request(app).get('/api/storage');
    expect(before.status).toBe(200);
    expect(before.body.keys).toEqual(expect.arrayContaining(['alpha', 'beta']));

    await request(app).delete('/api/storage').expect(204);

    const after = await request(app).get('/api/storage');
    expect(after.status).toBe(200);
    expect(after.body.keys).toEqual([]);
  });
});


