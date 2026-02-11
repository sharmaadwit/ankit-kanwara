const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');
const { rateLimit } = require('express-rate-limit');

const storageRouter = require('./routes/storage');
const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');
const entitiesRouter = require('./routes/entities');
const { checkHealth } = require('./db');
const adminLogsRouter = require('./routes/adminLogs');
const adminConfigRouter = require('./routes/adminConfig');
const activityLogsRouter = require('./routes/activityLogs');
const logger = require('./logger');
const { getAppConfig } = require('./services/appConfig');
const {
  sessionMiddleware,
  requireStorageAuth,
  requireAdminAuth
} = require('./middleware/auth');
const {
  requestContextMiddleware
} = require('./middleware/requestContext');

const loadEnvironment = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    return;
  }

  const sampleEnv = path.resolve(__dirname, 'env.sample');
  if (fs.existsSync(sampleEnv)) {
    dotenv.config({ path: sampleEnv });
  }
};

const createApp = (options = {}) => {
  loadEnvironment();

  const app = express();
  const forceRemoteStorage =
    String(process.env.FORCE_REMOTE_STORAGE || '').toLowerCase() === 'true';

  app.use(requestContextMiddleware);
  const explicitOrigins = (process.env.CORS_ALLOW_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const defaultOrigins = [
    'http://localhost:8080',
    'http://localhost:3000'
  ];
  if (process.env.APP_PUBLIC_URL) {
    defaultOrigins.push(process.env.APP_PUBLIC_URL.trim());
  }
  const allowedOrigins = Array.from(
    new Set(explicitOrigins.length ? explicitOrigins : defaultOrigins)
  );
  const allowAllOrigins = allowedOrigins.includes('*');

  logger.info('cors_origins_configured', {
    allowedOrigins: allowAllOrigins ? ['*'] : allowedOrigins
  });

  app.set('trust proxy', true);
  // Use CORS options delegate so we can allow same-origin (request host === origin host) when APP_PUBLIC_URL is unset (e.g. Railway).
  app.use(
    cors((req, callback) => {
      const requestOrigin = req.headers && req.headers.origin;
      let originsForRequest = allowedOrigins.slice();
      if (requestOrigin) {
        try {
          const originHost = new URL(requestOrigin).hostname;
          const requestHost = (req.hostname || '').split(':')[0];
          if (originHost && requestHost && originHost === requestHost) {
            originsForRequest.push(requestOrigin);
          }
        } catch (_) {
          // ignore invalid origin URL
        }
      }
      const allowAll = allowAllOrigins || originsForRequest.includes('*');
      return callback(null, {
        origin: (origin, cb) => {
          if (!origin) {
            cb(null, true);
            return;
          }
          if (allowAll || originsForRequest.includes(origin)) {
            cb(null, origin);
            return;
          }
          logger.warn('cors_origin_blocked', { origin });
          cb(new Error('Not allowed by CORS'));
        },
        credentials: true
      });
    })
  );
  const jsonBodyLimit = process.env.API_JSON_LIMIT || '20mb';
  app.use(express.json({ limit: jsonBodyLimit }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    const start = process.hrtime.bigint();
    const pathName = req.originalUrl || req.url;

    const finalize = (level = 'info', extra = {}) => {
      const durationMs =
        Number(process.hrtime.bigint() - start) / 1_000_000;
      const payload = {
        method: req.method,
        path: pathName,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2)),
        ...extra
      };
      if (level === 'error') {
        logger.error('http_request', payload);
      } else if (level === 'warn') {
        logger.warn('http_request', payload);
      } else {
        logger.info('http_request', payload);
      }
    };

    res.on('finish', () => {
      if (res.statusCode >= 500) {
        finalize('error');
      } else if (res.statusCode >= 400) {
        finalize('warn');
      } else {
        finalize('info');
      }
    });

    res.on('error', (err) => {
      finalize('error', { errorMessage: err?.message });
    });

    next();
  });
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Rate limit by client IP. Only PUT/DELETE count – GET (page load, login, loading data) is not limited.
  // So normal use never hits 429; only excessive saves are limited. No 15‑minute wait for simple operations.
  const storageLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_STORAGE_MAX) || 300,
    message: { message: 'Too many save requests; please wait a few minutes and try again.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'GET' || req.method === 'HEAD'
  });
  // Admin: only count writes (POST/PUT/DELETE); GET/HEAD (logs, activity list) never hit 429.
  const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_ADMIN_MAX) || 100,
    message: { message: 'Too many admin requests; try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'GET' || req.method === 'HEAD'
  });

  const storageRequestLogger = (req, res, next) => {
    req._storageStart = Date.now();
    res.on('finish', () => {
      const key = (req.params && req.params.key !== undefined)
        ? req.params.key
        : (req.path && req.path !== '/' ? req.path.replace(/^\//, '') : '');
      logger.info('storage_request', {
        transactionId: req.transactionId,
        key: key || undefined,
        method: req.method,
        status: res.statusCode,
        user: req.get('X-Admin-User') || req.get('x-admin-user') || 'anonymous',
        durationMs: Date.now() - req._storageStart
      });
    });
    next();
  };
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/entities', sessionMiddleware, requireStorageAuth, entitiesRouter);
  app.use('/api/storage', storageRequestLogger, storageLimiter, sessionMiddleware, requireStorageAuth, storageRouter);
  app.use('/api/admin/logs', adminLimiter, adminLogsRouter);
  app.use('/api/admin/config', adminLimiter, requireAdminAuth, adminConfigRouter);
  app.use('/api/admin/users', adminLimiter, requireAdminAuth, require('./routes/adminUsers'));
  app.use('/api/admin/activity', adminLimiter, activityLogsRouter);
  app.use('/api/admin', adminLimiter, requireAdminAuth, require('./routes/adminForcePassword'));

  app.get('/api/bootstrap', sessionMiddleware, async (req, res) => {
    const hostname = req.hostname || '';
    const isLocalHost =
      hostname.includes('localhost') ||
      hostname.startsWith('127.') ||
      hostname.endsWith('.local');
    const cookieAuth = String(process.env.FORCE_COOKIE_AUTH || '').toLowerCase() === 'true';
    try {
      const config = await getAppConfig();
      const configPayload = {
        remoteStorage:
          forceRemoteStorage || (!isLocalHost && hostname.trim().length > 0),
        cookieAuth,
        featureFlags: config.featureFlags,
        dashboardVisibility: config.dashboardVisibility,
        dashboardMonth: config.dashboardMonth
      };
      let user = null;
      if (cookieAuth && req.user) {
        user = {
          userId: req.user.id,
          username: req.user.username,
          email: req.user.email || '',
          roles: req.user.roles || [],
          regions: req.user.regions || [],
          salesReps: req.user.salesReps || [],
          defaultRegion: req.user.defaultRegion || ''
        };
      }
      res.json({ config: configPayload, user });
    } catch (error) {
      logger.error('bootstrap_failed', { message: error.message });
      res.json({
        config: {
          remoteStorage: forceRemoteStorage || (!isLocalHost && hostname.trim().length > 0),
          cookieAuth,
          featureFlags: {},
          dashboardVisibility: {},
          dashboardMonth: 'last'
        },
        user: null
      });
    }
  });

  app.get('/api/health', async (req, res) => {
    const dbOk = await checkHealth();
    if (!dbOk) {
      logger.warn('health_check_failed', { reason: 'database_unreachable' });
      return res.status(503).json({ status: 'unhealthy', reason: 'database_unreachable' });
    }
    res.json({ status: 'ok' });
  });

  app.get('/api/config', async (req, res) => {
    const hostname = req.hostname || '';
    const isLocalHost =
      hostname.includes('localhost') ||
      hostname.startsWith('127.') ||
      hostname.endsWith('.local');
    const cookieAuth = String(process.env.FORCE_COOKIE_AUTH || '').toLowerCase() === 'true';
    try {
      const config = await getAppConfig();
      res.json({
        remoteStorage:
          forceRemoteStorage || (!isLocalHost && hostname.trim().length > 0),
        cookieAuth,
        featureFlags: config.featureFlags,
        dashboardVisibility: config.dashboardVisibility,
        dashboardMonth: config.dashboardMonth
      });
    } catch (error) {
      logger.error('config_fetch_failed', { message: error.message });
      res.json({
        remoteStorage:
          forceRemoteStorage || (!isLocalHost && hostname.trim().length > 0),
        cookieAuth,
        featureFlags: {},
        dashboardVisibility: {},
        dashboardMonth: 'last'
      });
    }
  });

  if (!options.disableStatic) {
    const staticDir = path.resolve(__dirname, '..', 'pams-app');
    app.use(express.static(staticDir, { extensions: ['html'] }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  return app;
};

module.exports = {
  createApp
};


