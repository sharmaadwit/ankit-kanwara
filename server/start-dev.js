/**
 * Start the app with dev login enabled (dev / dev) without editing .env.
 * Usage: npm run start:dev   (from Project PAT folder)
 */
process.env.ALLOW_DEV_LOGIN = 'true';

require('./index.js');

