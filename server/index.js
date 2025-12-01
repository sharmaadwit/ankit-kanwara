const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  const sampleEnv = path.resolve(__dirname, 'env.sample');
  if (fs.existsSync(sampleEnv)) {
    dotenv.config({ path: sampleEnv });
  }
}

const { initDb, closePool } = require('./db');
const storageRouter = require('./routes/storage');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 8080;
const forceRemoteStorage =
  String(process.env.FORCE_REMOTE_STORAGE || '').toLowerCase() === 'true';

app.set('trust proxy', true);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, true);
    },
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use('/api/storage', storageRouter);

app.get('/api/health', async (req, res) => {
  try {
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/config', (req, res) => {
  const hostname = req.hostname || '';
  const isLocalHost =
    hostname.includes('localhost') ||
    hostname.startsWith('127.') ||
    hostname.endsWith('.local');
  res.json({
    remoteStorage:
      forceRemoteStorage || (!isLocalHost && hostname.trim().length > 0)
  });
});

const staticDir = path.resolve(__dirname, '..', 'pams-app');
app.use(express.static(staticDir, { extensions: ['html'] }));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database', error);
    process.exit(1);
  });

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully.`);
  try {
    await closePool();
  } catch (error) {
    console.error('Error closing database pool', error);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

