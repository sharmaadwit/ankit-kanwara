const { Pool } = require('pg');

let pool;

const normalizeFlag = (value) =>
  String(value || '')
    .trim()
    .toLowerCase() === 'true';

const parseEnvInt = (value, fallback) => {
  const parsed = parseInt(String(value || ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

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
    // Conservative defaults for shared/free DB plans; override via env.
    max: parseEnvInt(process.env.PGPOOL_MAX, 5),
    idleTimeoutMillis: parseEnvInt(process.env.PGPOOL_IDLE_TIMEOUT_MS, 30_000),
    connectionTimeoutMillis: parseEnvInt(process.env.PGPOOL_CONNECTION_TIMEOUT_MS, 5_000)
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
        transaction_id TEXT,
        username TEXT,
        status TEXT NOT NULL DEFAULT 'unknown',
        message TEXT,
        user_agent TEXT,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        session_id TEXT,
        logout_at TIMESTAMPTZ,
        session_duration_seconds INTEGER
      );
    `);

    // Add new columns to existing login_logs table if they don't exist
    await client.query(`
      ALTER TABLE login_logs
      ADD COLUMN IF NOT EXISTS transaction_id TEXT;
    `);
    await client.query(`
      ALTER TABLE login_logs
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'unknown';
    `);
    await client.query(`
      ALTER TABLE login_logs
      ADD COLUMN IF NOT EXISTS session_id TEXT;
    `);
    await client.query(`
      ALTER TABLE login_logs
      ADD COLUMN IF NOT EXISTS logout_at TIMESTAMPTZ;
    `);
    await client.query(`
      ALTER TABLE login_logs
      ADD COLUMN IF NOT EXISTS session_duration_seconds INTEGER;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_logs_created_at
      ON login_logs (created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_login_logs_session_id
      ON login_logs (session_id) WHERE session_id IS NOT NULL;
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS pending_storage_saves (
        id SERIAL PRIMARY KEY,
        storage_key TEXT NOT NULL,
        value TEXT NOT NULL,
        reason TEXT NOT NULL,
        username TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_pending_storage_saves_created_at
      ON pending_storage_saves (created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS storage_history (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ,
        archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_storage_history_key_archived
      ON storage_history (key, archived_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        roles TEXT[] NOT NULL DEFAULT '{}',
        regions TEXT[] NOT NULL DEFAULT '{}',
        sales_reps TEXT[] NOT NULL DEFAULT '{}',
        default_region TEXT DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT true,
        force_password_change BOOLEAN NOT NULL DEFAULT false,
        password_updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);
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

/** Returns true if DB is reachable, false otherwise. Use for health checks. */
const checkHealth = async () => {
  try {
    const p = getPool();
    await p.query('SELECT 1');
    return true;
  } catch (_) {
    return false;
  }
};

module.exports = {
  getPool,
  initDb,
  closePool,
  checkHealth
};

