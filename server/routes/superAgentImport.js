/**
 * Super Agent — third-party CSV/JSON activity import (PreSight).
 * Feature flag: superAgentImport. Auth: SUPER_AGENT_API_KEY → X-Api-Key (optional if unset).
 */

const express = require('express');
const router = express.Router();
const logger = require('../logger');
const { getFeatureFlags } = require('../services/featureFlags');
const superAgentImport = require('../services/superAgentImport');

function getSuperAgentApiKey() {
  return (process.env.SUPER_AGENT_API_KEY || process.env.STORAGE_API_KEY || '').trim();
}

const requireSuperAgentEnabled = (req, res, next) => {
  getFeatureFlags()
    .then((flags) => {
      const envForce = String(process.env.SUPER_AGENT_API_FORCE_ENABLED || '').toLowerCase() === 'true';
      if (flags.superAgentImport || envForce) {
        return next();
      }
      logger.warn('super_agent_import_disabled', { path: req.path, method: req.method });
      return res.status(403).json({
        ok: false,
        error: 'Super Agent import is disabled.',
        code: 'SUPER_AGENT_DISABLED'
      });
    })
    .catch((e) => {
      logger.error('super_agent_import_flag_error', { message: e.message });
      return res.status(503).json({ ok: false, error: 'Unable to verify feature flag' });
    });
};

const requireSuperAgentApiKey = (req, res, next) => {
  const expected = getSuperAgentApiKey();
  if (!expected) {
    return next();
  }
  const provided =
    (req.get('x-api-key') || req.get('X-Api-Key') || '').trim() ||
    (req.query && (req.query.api_key || req.query.apiKey) || '').trim();
  if (provided && provided === expected) {
    return next();
  }
  logger.warn('super_agent_import_auth_failed', { path: req.path });
  return res.status(401).json({ ok: false, error: 'Missing or invalid API key', code: 'UNAUTHORIZED' });
};

router.use(requireSuperAgentEnabled);
router.use(requireSuperAgentApiKey);

router.post('/dry-run', async (req, res) => {
  try {
    const out = await superAgentImport.dryRun(req.body || {}, { apiMode: true });
    res.json(out);
  } catch (err) {
    if (err.code === 'ROW_LIMIT') {
      return res.status(400).json({ ok: false, error: err.message, code: err.code });
    }
    logger.error('super_agent_dry_run_failed', { message: err.message });
    res.status(400).json({ ok: false, error: err.message || 'Dry-run failed' });
  }
});

router.post('/commit', async (req, res) => {
  const batchId = (
    req.get('x-batch-id') ||
    req.get('X-Batch-Id') ||
    req.get('idempotency-key') ||
    req.get('Idempotency-Key') ||
    req.body?.batch_id ||
    ''
  ).trim();
  try {
    const out = await superAgentImport.commit(batchId, req.body || {});
    res.json(out);
  } catch (err) {
    if (err.code === 'BAD_BATCH_ID') {
      return res.status(400).json({ ok: false, error: err.message, code: err.code });
    }
    if (err.code === 'NOTHING_TO_COMMIT') {
      return res.status(400).json({
        ok: false,
        error: err.message,
        code: err.code,
        summary: err.summary
      });
    }
    if (err.code === 'VALIDATION' || err.code === 'ACTIVITY_VALIDATION' || err.code === 'APPEND_FAILED') {
      return res.status(400).json({ ok: false, error: err.message, code: err.code });
    }
    logger.error('super_agent_commit_failed', { message: err.message, batchId });
    res.status(500).json({ ok: false, error: err.message || 'Commit failed' });
  }
});

module.exports = router;
