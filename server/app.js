const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const storageRouter = require('./routes/storage');
const adminLogsRouter = require('./routes/adminLogs');
const adminConfigRouter = require('./routes/adminConfig');
const activityLogsRouter = require('./routes/activityLogs');
const logger = require('./logger');
const { getFeatureFlags } = require('./services/featureFlags');
const {
  getDashboardVisibility
} = require('./services/dashboardVisibility');
const { getDashboardMonth } = require('./services/dashboardMonth');
const {
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
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (allowAllOrigins || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        logger.warn('cors_origin_blocked', { origin });
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true
    })
  );
  const jsonBodyLimit = process.env.API_JSON_LIMIT || '20mb';
  app.use(express.json({ limit: jsonBodyLimit }));
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

  app.use('/api/storage', requireStorageAuth, storageRouter);
  app.use('/api/admin/logs', adminLogsRouter);
  app.use('/api/admin/config', requireAdminAuth, adminConfigRouter);
  app.use('/api/admin/users', requireAdminAuth, require('./routes/adminUsers'));
  app.use('/api/admin/activity', activityLogsRouter);

  app.get('/api/health', async (req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/config', async (req, res) => {
    const hostname = req.hostname || '';
    const isLocalHost =
      hostname.includes('localhost') ||
      hostname.startsWith('127.') ||
      hostname.endsWith('.local');
    try {
      const featureFlags = await getFeatureFlags();
      const dashboardVisibility = await getDashboardVisibility();
      const dashboardMonth = await getDashboardMonth();
      res.json({
        remoteStorage:
          forceRemoteStorage || (!isLocalHost && hostname.trim().length > 0),
        featureFlags,
        dashboardVisibility,
        dashboardMonth
      });
    } catch (error) {
      logger.error('config_fetch_failed', { message: error.message });
      res.json({
        remoteStorage:
          forceRemoteStorage || (!isLocalHost && hostname.trim().length > 0),
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


