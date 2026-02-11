const express = require('express');
const router = express.Router();

const {
  getFeatureFlags,
  setFeatureFlags,
  defaultFlags
} = require('../services/featureFlags');
const {
  getNotificationSettings,
  saveNotificationSettings,
  sendEventNotification
} = require('../services/notifications');
const {
  getDashboardVisibility,
  setDashboardVisibility,
  defaultDashboardVisibility
} = require('../services/dashboardVisibility');
const {
  getDashboardMonth,
  setDashboardMonth,
  DEFAULT_DASHBOARD_MONTH
} = require('../services/dashboardMonth');
const { invalidateConfigCache } = require('../services/appConfig');

router.get('/feature-flags', async (req, res) => {
  try {
    const flags = await getFeatureFlags();
    res.json({ featureFlags: flags, defaults: defaultFlags });
  } catch (error) {
    console.error('Failed to fetch feature flags', error);
    res.status(500).json({ message: 'Failed to fetch feature flags' });
  }
});

router.put('/feature-flags', async (req, res) => {
  try {
    const flags = req.body?.featureFlags || {};
    const updated = await setFeatureFlags(flags);
    invalidateConfigCache();

    const actor = req.get('x-admin-user') || 'Administrator';
    sendEventNotification('featureToggle', {
      actor,
      flagChanges: flags,
      featureFlags: updated
    }).catch((error) => {
      console.error('Failed to dispatch feature toggle notification', error);
    });

    res.json({ featureFlags: updated });
  } catch (error) {
    console.error('Failed to update feature flags', error);
    res.status(500).json({ message: 'Failed to update feature flags' });
  }
});

router.get('/dashboard-visibility', async (req, res) => {
  try {
    const visibility = await getDashboardVisibility();
    res.json({ visibility, defaults: defaultDashboardVisibility });
  } catch (error) {
    console.error('Failed to fetch dashboard visibility', error);
    res
      .status(500)
      .json({ message: 'Failed to fetch dashboard visibility' });
  }
});

router.put('/dashboard-visibility', async (req, res) => {
  try {
    const visibility = req.body?.visibility || {};
    const updated = await setDashboardVisibility(visibility);
    invalidateConfigCache();
    res.json({ visibility: updated });
  } catch (error) {
    console.error('Failed to update dashboard visibility', error);
    res
      .status(500)
      .json({ message: 'Failed to update dashboard visibility' });
  }
});

router.get('/dashboard-month', async (req, res) => {
  try {
    const dashboardMonth = await getDashboardMonth();
    res.json({ dashboardMonth, default: DEFAULT_DASHBOARD_MONTH });
  } catch (error) {
    console.error('Failed to fetch dashboard month', error);
    res.status(500).json({ message: 'Failed to fetch dashboard month' });
  }
});

router.put('/dashboard-month', async (req, res) => {
  try {
    const value = req.body?.dashboardMonth;
    const updated = await setDashboardMonth(value);
    invalidateConfigCache();
    res.json({ dashboardMonth: updated });
  } catch (error) {
    console.error('Failed to update dashboard month', error);
    res.status(500).json({ message: 'Failed to update dashboard month' });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const settings = await getNotificationSettings();
    res.json({ settings });
  } catch (error) {
    console.error('Failed to fetch notification settings', error);
    res.status(500).json({ message: 'Failed to fetch notification settings' });
  }
});

router.put('/notifications', async (req, res) => {
  try {
    const settings = req.body?.settings || {};
    const saved = await saveNotificationSettings(settings);
    res.json({ settings: saved });
  } catch (error) {
    console.error('Failed to update notification settings', error);
    res.status(500).json({ message: 'Failed to update notification settings' });
  }
});

module.exports = router;


