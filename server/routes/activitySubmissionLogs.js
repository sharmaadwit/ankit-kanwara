/**
 * Admin-only read API for activity_submission_logs.
 * GET /api/admin/activity-submission-logs?limit=100&offset=0&username=&outcome=&action=
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { requireAdminAuth } = require('../middleware/auth');
const logger = require('../logger');

router.get('/', requireAdminAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const username = typeof req.query.username === 'string' ? req.query.username.trim() || null : null;
    const outcome = typeof req.query.outcome === 'string' ? req.query.outcome.trim() || null : null;
    const action = typeof req.query.action === 'string' ? req.query.action.trim() || null : null;

    let where = [];
    const args = [];
    let idx = 1;
    if (username) {
      where.push(`username = $${idx}`);
      args.push(username);
      idx++;
    }
    if (outcome) {
      where.push(`outcome = $${idx}`);
      args.push(outcome);
      idx++;
    }
    if (action) {
      where.push(`action = $${idx}`);
      args.push(action);
      idx++;
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const limitVal = limit + 1;
    args.push(limitVal, offset);

    const rows = await getPool().query(
      `SELECT id, username, action, outcome, payload, activity_count, transaction_id, storage_updated_at, created_at
       FROM activity_submission_logs
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      args
    );

    const raw = rows.rows || [];
    const hasMore = raw.length > limit;
    const logs = (hasMore ? raw.slice(0, limit) : raw).map((r) => ({
      id: r.id,
      username: r.username,
      action: r.action,
      outcome: r.outcome,
      payload: r.payload,
      activityCount: r.activity_count,
      transactionId: r.transaction_id,
      storageUpdatedAt: r.storage_updated_at ? new Date(r.storage_updated_at).toISOString() : null,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null
    }));

    res.json({ logs, hasMore });
  } catch (error) {
    logger.error('activity_submission_logs_fetch_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to fetch activity submission logs' });
  }
});

module.exports = router;
