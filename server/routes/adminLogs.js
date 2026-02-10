const express = require('express');
const router = express.Router();

const {
  logLoginAttempt,
  getRecentLoginLogs,
  getUsageMetrics
} = require('../services/loginLogs');
const { requireAdminAuth } = require('../middleware/auth');
const logger = require('../logger');

router.post('/', async (req, res) => {
  const startMs = Date.now();
  try {
    const { username, status, message, userAgent } = req.body || {};
    await logLoginAttempt({
      username,
      status,
      message,
      userAgent,
      ipAddress: req.ip,
      transactionId: req.transactionId
    });
    logger.info('login_attempt', {
      transactionId: req.transactionId,
      username: username || 'unknown',
      status: status || 'unknown',
      durationMs: Date.now() - startMs
    });
    res.status(204).send();
  } catch (error) {
    logger.error('login_log_write_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to record login attempt' });
  }
});

router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 150;
    const offset = req.query.offset ? Number(req.query.offset) : 0;
    const [{ logs, hasMore }, metrics] = await Promise.all([
      getRecentLoginLogs(limit, offset),
      getUsageMetrics()
    ]);

    res.json({
      logs,
      metrics,
      hasMore
    });
  } catch (error) {
    logger.error('login_log_fetch_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to fetch login logs' });
  }
});

module.exports = router;


