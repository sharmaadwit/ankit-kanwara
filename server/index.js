const http = require('http');

const { createApp } = require('./app');
const { initDb, closePool } = require('./db');
const logger = require('./logger');

const PORT = parseInt(process.env.PORT, 10) || 8080;
let server;
let dbInitRetryTimer = null;
let dbInitialized = false;
const runtimeStatus = {
  dbInitialized: false,
  dbInitRetryScheduled: false,
  dbInitRetryCount: 0,
  dbLastErrorAt: null,
  dbLastErrorCode: null,
  dbLastErrorMessage: null,
  dbLastSuccessAt: null
};
const app = createApp({
  getRuntimeStatus: () => ({
    ...runtimeStatus,
    uptimeSeconds: Math.floor(process.uptime())
  })
});

const scheduleDbInitRetry = () => {
  if (dbInitRetryTimer) return;
  runtimeStatus.dbInitRetryScheduled = true;
  dbInitRetryTimer = setTimeout(() => {
    dbInitRetryTimer = null;
    runtimeStatus.dbInitRetryScheduled = false;
    void ensureDbInitialized();
  }, 5000);
};

const ensureDbInitialized = async () => {
  if (dbInitialized) return;
  try {
    await initDb();
    dbInitialized = true;
    runtimeStatus.dbInitialized = true;
    runtimeStatus.dbLastSuccessAt = new Date().toISOString();
    runtimeStatus.dbLastErrorAt = null;
    runtimeStatus.dbLastErrorCode = null;
    runtimeStatus.dbLastErrorMessage = null;
    logger.info('db_init_succeeded');
  } catch (error) {
    runtimeStatus.dbInitialized = false;
    runtimeStatus.dbInitRetryCount += 1;
    runtimeStatus.dbLastErrorAt = new Date().toISOString();
    runtimeStatus.dbLastErrorCode = error.code || null;
    runtimeStatus.dbLastErrorMessage = error.message || 'unknown_error';
    logger.error('db_init_failed_retrying', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    scheduleDbInitRetry();
  }
};

const start = async () => {
  try {
    server = http.createServer(app);
    server.listen(PORT, () => {
      logger.info('server_listening', { port: PORT });
    });
    void ensureDbInitialized();
  } catch (error) {
    logger.error('server_boot_failed', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info('server_shutdown_initiated', { signal });
  if (dbInitRetryTimer) {
    clearTimeout(dbInitRetryTimer);
    dbInitRetryTimer = null;
    runtimeStatus.dbInitRetryScheduled = false;
  }
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    }).catch((err) => {
      logger.error('http_server_close_failed', {
        message: err.message,
        stack: err.stack
      });
    });
  }
  try {
    await closePool();
  } catch (error) {
    logger.error('pg_pool_close_failed', {
      message: error.message,
      stack: error.stack
    });
  } finally {
    logger.info('server_shutdown_complete', { signal });
    process.exit(0);
  }
};

start();

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

