/**
 * Activity submission logs: record every activity submit (put/append/remove) with payload and outcome.
 * Never throws; log failures are ignored so the main request is never broken.
 */

const logger = require('../logger');

/**
 * Log one activity submission. Fire-and-forget; never throws.
 * @param {object} options
 * @param {import('pg').Pool} options.pool
 * @param {string} [options.username]
 * @param {string} options.action - 'put' | 'append' | 'remove'
 * @param {string} options.outcome - 'success' | 'conflict' | 'validation_failed' | 'not_found' | 'dropped' | 'error'
 * @param {object|array} [options.payload] - What was submitted (array for put, single activity for append, { activityId } for remove)
 * @param {number} [options.activityCount]
 * @param {string} [options.transactionId]
 * @param {string} [options.storageUpdatedAt] - ISO string when storage was updated (if success)
 */
function safePayloadJson(payload) {
  if (payload == null) return null;
  try {
    return JSON.stringify(payload);
  } catch (_) {
    return null;
  }
}

async function logActivitySubmission(options) {
  const { pool, username, action, outcome, payload, activityCount, transactionId, storageUpdatedAt } = options || {};
  if (!pool || !action || !outcome) return;
  const payloadJson = safePayloadJson(payload);
  const count = activityCount != null ? activityCount : (Array.isArray(payload) ? payload.length : null);
  const storageAt = storageUpdatedAt ? storageUpdatedAt : null;
  try {
    await pool.query(
      `INSERT INTO activity_submission_logs (username, action, outcome, payload, activity_count, transaction_id, storage_updated_at, created_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7::timestamptz, NOW())`,
      [username || null, action, outcome, payloadJson, count, transactionId || null, storageAt]
    );
  } catch (err) {
    logger.warn('activity_submission_log_failed', { message: err.message, action, outcome });
  }
}

/** Call from route without awaiting; never affects response. */
function logActivitySubmissionSafe(options) {
  const pool = options?.pool;
  if (!pool) return;
  logActivitySubmission(options).catch(() => {});
}

module.exports = {
  logActivitySubmission,
  logActivitySubmissionSafe
};
