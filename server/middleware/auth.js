const logger = require('../logger');

const extractHeaderToken = (req, headerName) =>
  (req.get(headerName) || '').trim();

const isAdminRequest = (req) => {
  const sessionHeader = extractHeaderToken(req, 'x-admin-user');
  return !!sessionHeader;
};

const extractApiKey = () => (process.env.STORAGE_API_KEY || '').trim();

const requireStorageAuth = (req, res, next) => {
  const expectedKey = extractApiKey();
  if (!expectedKey) {
    return next();
  }

  const providedKey =
    extractHeaderToken(req, 'x-api-key') ||
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

const requireAdminAuth = (req, res, next) => {
  const providedKey = extractHeaderToken(req, 'x-admin-api-key');
  const expectedKey = extractApiKey();

  if (providedKey && expectedKey && providedKey === expectedKey) {
    return next();
  }

  if (isAdminRequest(req)) {
    return next();
  }

  logger.warn('admin_auth_failed', {
    path: req.originalUrl || req.url,
    remoteAddress: req.ip
  });

  return res.status(401).json({ message: 'Admin authentication required' });
};

module.exports = {
  requireStorageAuth,
  requireAdminAuth
};

