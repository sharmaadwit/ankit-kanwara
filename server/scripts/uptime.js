/* eslint-disable no-process-exit */
const { info, error } = require('../logger');

const DEFAULT_PORT = parseInt(process.env.PORT || '8080', 10);
const HEALTH_URL =
  process.env.HEALTHCHECK_URL || `http://localhost:${DEFAULT_PORT}/api/health`;

const HEALTH_TIMEOUT_MS = parseInt(process.env.HEALTHCHECK_TIMEOUT || '8000', 10);

const run = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

  try {
    const response = await fetch(HEALTH_URL, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json'
      }
    });

    const body = await response
      .json()
      .catch(() => ({ status: 'unavailable', raw: null }));

    if (!response.ok) {
      error('uptime_check_failed', {
        url: HEALTH_URL,
        statusCode: response.status,
        body
      });
      process.exit(1);
    }

    info('uptime_check_passed', {
      url: HEALTH_URL,
      statusCode: response.status,
      body
    });
    process.exit(0);
  } catch (err) {
    error('uptime_check_failed', {
      url: HEALTH_URL,
      message: err.message
    });
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
};

run();


