const express = require('express');
const router = express.Router();

const {
  logActivity,
  getActivityLogs
} = require('../services/activityLogs');
const { requireAdminAuth } = require('../middleware/auth');

router.post('/', async (req, res) => {
  try {
    const { username, action, entity, entityId, detail } = req.body || {};
    await logActivity({
      username,
      action,
      entity,
      entityId,
      detail,
      ipAddress: req.ip
    });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to record activity log', error);
    res.status(500).json({ message: 'Failed to record activity log' });
  }
});

router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 200;
    const logs = await getActivityLogs({ limit });
    res.json({ logs });
  } catch (error) {
    console.error('Failed to fetch activity logs', error);
    res.status(500).json({ message: 'Failed to fetch activity logs' });
  }
});

module.exports = router;


