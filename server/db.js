const { Pool } = require('pg');

let pool;

const createPool = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not defined. Set it in your environment before starting the server.'
    );
  }

  const useSsl =
    process.env.NODE_ENV === 'production' ||
    String(process.env.FORCE_PG_SSL || '').toLowerCase() === 'true';

  return new Pool({
    connectionString,
    ssl: useSsl
      ? {
          rejectUnauthorized: false
        }
      : undefined,
    max: parseInt(process.env.PGPOOL_MAX || '10', 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000
  });
};

const getPool = () => {
  if (!pool) {
    pool = createPool();
  }
  return pool;
};

const initDb = async () => {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS storage (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
};

const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

module.exports = {
  getPool,
  initDb,
  closePool
};

