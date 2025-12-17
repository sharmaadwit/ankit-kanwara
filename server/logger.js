const crypto = require('crypto');
const { getTransactionId } = require('./middleware/requestContext');

const RAILWAY_LOGS_ENDPOINT = process.env.RAILWAY_LOGS_ENDPOINT;
const RAILWAY_LOGS_TOKEN = process.env.RAILWAY_LOGS_TOKEN;

const resolveTransactionId = (explicit) =>
  explicit || getTransactionId() || crypto.randomUUID();

const buildPayload = (level, event, metadata = {}) => {
  const { transactionId, ...rest } = metadata || {};
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    transactionId: resolveTransactionId(transactionId),
    ...rest
  };
};

const forwardToRailway = (payload) => {
  if (!RAILWAY_LOGS_ENDPOINT || typeof fetch !== 'function') {
    return;
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (RAILWAY_LOGS_TOKEN) {
    headers.Authorization = `Bearer ${RAILWAY_LOGS_TOKEN}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1_000);

  fetch(RAILWAY_LOGS_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: controller.signal
  })
    .catch(() => {
      // Swallow network errors; console already captured the log
    })
    .finally(() => {
      clearTimeout(timeout);
    });
};

const info = (event, metadata = {}) => {
  const payload = buildPayload('info', event, metadata);
  console.log(JSON.stringify(payload));
  forwardToRailway(payload);
};

const warn = (event, metadata = {}) => {
  const payload = buildPayload('warn', event, metadata);
  console.warn(JSON.stringify(payload));
  forwardToRailway(payload);
};

const error = (event, metadata = {}) => {
  const payload = buildPayload('error', event, metadata);
  console.error(JSON.stringify(payload));
  forwardToRailway(payload);
};

module.exports = {
  info,
  warn,
  error
};


