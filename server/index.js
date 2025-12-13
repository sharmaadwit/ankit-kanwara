const http = require('http');

const { createApp } = require('./app');
const { initDb, closePool } = require('./db');
const logger = require('./logger');

const app = createApp();
const PORT = parseInt(process.env.PORT, 10) || 8080;
let server;

const start = async () => {
  try {
    await initDb();
    server = http.createServer(app);
    server.listen(PORT, () => {
      logger.info('server_listening', { port: PORT });
    });
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

