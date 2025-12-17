const express = require('express');
const router = express.Router();

const {
  logActivity,
  getActivityLogs
} = require('../services/activityLogs');
const { requireAdminAuth } = require('../middleware/auth');
const logger = require('../logger');

router.post('/', async (req, res) => {
  try {
    const { username, action, entity, entityId, detail } = req.body || {};
    await logActivity({
      username,
      action,
      entity,
      entityId,
      detail,
      ipAddress: req.ip,
      transactionId: req.transactionId
    });
    res.status(204).send();
  } catch (error) {
    logger.error('activity_log_write_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to record activity log' });
  }
});

router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 200;
    const logs = await getActivityLogs({ limit });
    res.json({ logs });
  } catch (error) {
    logger.error('activity_log_fetch_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

module.exports = router;


