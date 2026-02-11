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

const getTransactionId = () => {
  const context = storage.getStore() || {};
  return context.transactionId;
};

module.exports = {
  requestContextMiddleware,
  getTransactionId
};


