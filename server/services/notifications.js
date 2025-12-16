const { getPool } = require('../db');
const logger = require('../logger');
const { sendEmail, isConfigured } = require('./email');

const STORAGE_KEY = 'notifications:settings';

const defaultNotificationSettings = {
  recipients: [],
  events: {
    featureToggle: false,
    csvFailure: false,
    loginAnomaly: false
  }
};

const normalizeSettings = (input = {}) => {
  const recipients = Array.isArray(input.recipients)
    ? input.recipients
    : (input.recipients || '')
        .toString()
        .split(/[,;\n]/);

  const events = {
    ...defaultNotificationSettings.events,
    ...(input.events || {})
  };

  const normalizedRecipients = recipients
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return {
    recipients: normalizedRecipients,
    events
  };
};

const fetchSettings = async () => {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT value FROM storage WHERE key = $1 LIMIT 1;',
    [STORAGE_KEY]
  );
  if (!rows.length) {
    return defaultNotificationSettings;
  }

  try {
    const parsed = JSON.parse(rows[0].value);
    return normalizeSettings(parsed);
  } catch (error) {
    logger.warn('notification_settings_parse_failed', {
      message: error.message
    });
    return defaultNotificationSettings;
  }
};

const persistSettings = async (settings) => {
  const pool = getPool();
  const normalized = normalizeSettings(settings);

  await pool.query(
    `
      INSERT INTO storage (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = NOW();
    `,
    [STORAGE_KEY, JSON.stringify(normalized)]
  );

  logger.info('notification_settings_saved', {
    recipients: normalized.recipients.length,
    events: normalized.events
  });

  return normalized;
};

const buildFeatureToggleEmail = ({ actor, flagChanges, featureFlags }) => {
  const changedEntries = Object.entries(flagChanges || {});
  const summaryLines = changedEntries.length
    ? changedEntries.map(
        ([flag, value]) => `• ${flag}: ${value === false ? 'Disabled' : 'Enabled'}`
      )
    : ['• No explicit flag sent.'];

  const html = `
    <div style="font-family: Arial, sans-serif; color: #1a1a1a;">
      <h2 style="margin-bottom: 0.5rem;">Feature Flags Updated</h2>
      <p style="margin-top: 0;">${actor || 'An administrator'} updated feature flag settings.</p>
      <p style="margin: 1rem 0;"><strong>Changes:</strong><br>${summaryLines.join(
        '<br>'
      )}</p>
      <p style="margin-top: 1rem;">Current flag snapshot:</p>
      <pre style="background:#f4f4f5; padding: 1rem; border-radius: 0.5rem;">${JSON.stringify(
        featureFlags || {},
        null,
        2
      )}</pre>
      <p style="margin-top: 1rem;">— PAMS Notification Service</p>
    </div>
  `;

  const text = `${actor || 'An administrator'} updated feature flag settings.\n\nChanges:\n${summaryLines.join(
    '\n'
  )}\n\nCurrent flags:\n${JSON.stringify(featureFlags || {}, null, 2)}`;

  return {
    subject: 'PAMS Alert: Feature flags updated',
    html,
    text
  };
};

const buildEmailForEvent = (event, context = {}) => {
  switch (event) {
    case 'featureToggle':
      return buildFeatureToggleEmail(context);
    default:
      return null;
  }
};

const sendEventNotification = async (event, context = {}) => {
  const settings = await fetchSettings();
  if (!settings.events?.[event]) {
    return false;
  }

  const recipients = settings.recipients || [];
  if (!recipients.length) {
    logger.warn('notification_skipped_no_recipients', { event });
    return false;
  }

  if (!isConfigured()) {
    logger.warn('notification_skipped_email_unconfigured', { event });
    return false;
  }

  const emailContent = buildEmailForEvent(event, context);
  if (!emailContent) {
    logger.warn('notification_unhandled_event', { event });
    return false;
  }

  return sendEmail({
    to: recipients,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html
  });
};

module.exports = {
  defaultNotificationSettings,
  getNotificationSettings: fetchSettings,
  saveNotificationSettings: persistSettings,
  sendEventNotification
};




