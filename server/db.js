const { Pool } = require('pg');

let pool;

const normalizeFlag = (value) =>
  String(value || '')
    .trim()
    .toLowerCase() === 'true';

const buildConnectionString = () => {
  const directUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_PUBLIC_URL;

  if (directUrl) {
    return directUrl;
  }

  const user =
    process.env.PGUSER ||
    process.env.POSTGRES_USER ||
    process.env.POSTGRES_USERNAME;
  const password =
    process.env.PGPASSWORD ||
    process.env.POSTGRES_PASSWORD ||
    process.env.POSTGRES_PASS;
  const host =
    process.env.PGHOST ||
    process.env.RAILWAY_PRIVATE_DOMAIN ||
    process.env.RAILWAY_TCP_PROXY_DOMAIN ||
    process.env.POSTGRES_HOST;
  const port =
    process.env.PGPORT ||
    process.env.RAILWAY_TCP_PROXY_PORT ||
    process.env.POSTGRES_PORT ||
    '5432';
  const database =
    process.env.PGDATABASE || process.env.POSTGRES_DB || process.env.PGDATABASE;

  if (!user || !password || !host || !database) {
    return null;
  }

  const encodedPassword = encodeURIComponent(password);
  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
};

const appendSslMode = (connectionString, useSsl) => {
  if (!useSsl || !connectionString) {
    return connectionString;
  }

  if (connectionString.includes('sslmode=')) {
    return connectionString;
  }

  return connectionString.includes('?')
    ? `${connectionString}&sslmode=no-verify`
    : `${connectionString}?sslmode=no-verify`;
};

const createPool = () => {
  let connectionString = buildConnectionString();
  if (!connectionString) {
    throw new Error(
      'Unable to determine PostgreSQL connection string. Provide DATABASE_URL or the PG*/POSTGRES_* environment variables.'
    );
  }

  const useSsl =
    process.env.NODE_ENV === 'production' ||
    normalizeFlag(process.env.FORCE_PG_SSL) ||
    normalizeFlag(process.env.RAILWAY_ENVIRONMENT) ||
    normalizeFlag(process.env.PGSSLMODE) ||
    normalizeFlag(process.env.RAILWAY_REQUIRE_SSL);

  connectionString = appendSslMode(connectionString, useSsl);

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS login_logs (
        id SERIAL PRIMARY KEY,
        username TEXT,
        status TEXT NOT NULL,
        message TEXT,
        user_agent TEXT,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE login_logs
      ADD COLUMN IF NOT EXISTS transaction_id TEXT;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_logs_created_at
      ON login_logs (created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id SERIAL PRIMARY KEY,
        username TEXT,
        action TEXT NOT NULL,
        entity TEXT,
        entity_id TEXT,
        detail JSONB,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE activity_logs
      ADD COLUMN IF NOT EXISTS transaction_id TEXT;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at
      ON activity_logs (created_at DESC);
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

