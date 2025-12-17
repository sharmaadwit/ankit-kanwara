const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');

const storage = new AsyncLocalStorage();

const requestContextMiddleware = (req, res, next) => {
  const transactionId = crypto.randomUUID();

  storage.run(
    {
      transactionId,
      method: req.method,
      path: req.originalUrl || req.url
    },
    () => {
    req.transactionId = transactionId;
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-Transaction-Id', transactionId);
    }
    next();
    }
  );
};

const getContext = () => storage.getStore() || {};

const getTransactionId = () => {
  const context = getContext();
  return context.transactionId;
};

const setContextValue = (key, value) => {
  const context = storage.getStore();
  if (context) {
    context[key] = value;
  }
};

module.exports = {
  requestContextMiddleware,
  getContext,
  getTransactionId,
  setContextValue
};


