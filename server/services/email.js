const { google } = require('googleapis');

const logger = require('../logger');

const buildConfig = () => ({
  clientId: (process.env.GMAIL_CLIENT_ID || '').trim(),
  clientSecret: (process.env.GMAIL_CLIENT_SECRET || '').trim(),
  redirectUri:
    (process.env.GMAIL_REDIRECT_URI || '').trim() ||
    'https://developers.google.com/oauthplayground',
  refreshToken: (process.env.GMAIL_REFRESH_TOKEN || '').trim(),
  sender: (process.env.GMAIL_SENDER || '').trim()
});

const isConfigured = () => {
  const { clientId, clientSecret, refreshToken, sender } = buildConfig();
  return (
    Boolean(clientId) &&
    Boolean(clientSecret) &&
    Boolean(refreshToken) &&
    Boolean(sender)
  );
};

const getOAuthClient = () => {
  const { clientId, clientSecret, redirectUri, refreshToken } = buildConfig();
  const oAuth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
};

const encodeMessage = ({ to, subject, text, html }) => {
  const { sender } = buildConfig();
  const lines = [
    `From: ${sender}`,
    `To: ${Array.isArray(to) ? to.join(', ') : to}`,
    'Content-Type: text/html; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    html || `<p>${text || ''}</p>`
  ];
  const compiled = lines.join('\r\n');
  return Buffer.from(compiled)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const normalizeRecipients = (recipients) => {
  if (!recipients) return [];
  if (typeof recipients === 'string') {
    return recipients
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(recipients)) {
    return recipients
      .map((item) => String(item).trim())
      .filter(Boolean);
  }
  return [];
};

const sendEmail = async ({ to, subject, text, html }) => {
  if (!isConfigured()) {
    logger.warn('email_not_configured', { subject });
    return false;
  }

  const recipients = normalizeRecipients(to);
  if (!recipients.length) {
    logger.warn('email_missing_recipient', { subject });
    return false;
  }

  try {
    const authClient = getOAuthClient();
    const gmail = google.gmail({ version: 'v1', auth: authClient });
    const raw = encodeMessage({ to: recipients, subject, text, html });

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    logger.info('email_sent', { subject, recipients });
    return true;
  } catch (error) {
    logger.error('email_send_failed', {
      subject,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
};

module.exports = {
  sendEmail,
  isConfigured
};


