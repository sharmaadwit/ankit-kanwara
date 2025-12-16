const express = require('express');
const router = express.Router();

const {
  logLoginAttempt,
  getRecentLoginLogs,
  getUsageMetrics
} = require('../services/loginLogs');
const { requireAdminAuth } = require('../middleware/auth');

router.post('/', async (req, res) => {
  try {
    const { username, status, message, userAgent } = req.body || {};
    await logLoginAttempt({
      username,
      status,
      message,
      userAgent,
      ipAddress: req.ip
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to record login attempt', error);
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
    console.error('Failed to fetch login logs', error);
    res.status(500).json({ message: 'Failed to fetch login logs' });
  }
});

module.exports = router;


