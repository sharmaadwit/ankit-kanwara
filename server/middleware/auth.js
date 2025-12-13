const logger = require('../logger');

const extractApiKey = () => (process.env.STORAGE_API_KEY || '').trim();

const requireStorageAuth = (req, res, next) => {
  const expectedKey = extractApiKey();
  if (!expectedKey) {
    return next();
  }

  const providedKey =
    req.get('x-api-key') ||
    req.query.apiKey ||
    req.query.api_key ||
    '';

  if (providedKey && providedKey === expectedKey) {
    return next();
  }

  logger.warn('storage_auth_failed', {
    path: req.originalUrl || req.url,
    remoteAddress: req.ip
  });
  return res.status(401).json({ message: 'Unauthorized' });
};

module.exports = {
  requireStorageAuth
};


