/**
 * Pricing calculator integration API.
 * Accepts POST from pricing-calc (sharmaadwit/pricing-calc) and provides GET for retrieval/list.
 * Optional auth: set PRICING_CALC_API_KEY to require X-Api-Key or api_key query for POST/GET list.
 * Flow: POST saves calculation to DB only (no activity). Logged-in user fetches "my unlinked"
 * and creates a draft in PreSight; on submit they pick account/project and we create the activity
 * and link it via PATCH /link.
 */
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const logger = require('../logger');
const { getFeatureFlags } = require('../services/featureFlags');

const PRICING_CALC_API_KEY = (process.env.PRICING_CALC_API_KEY || process.env.STORAGE_API_KEY || '').trim();

/**
 * When off (default): all /api/pricing-calculations routes return 403.
 * Enable via Admin → Feature flags → "Pricing calculator sync", or set PRICING_CALC_API_FORCE_ENABLED=true (ops/staging only).
 */
const requirePricingCalculationsEnabled = (req, res, next) => {
  getFeatureFlags()
    .then((flags) => {
      const envForce =
        String(process.env.PRICING_CALC_API_FORCE_ENABLED || '').toLowerCase() === 'true';
      if (flags.pricingCalculatorSync || envForce) {
        return next();
      }
      logger.warn('pricing_calc_feature_disabled', { path: req.path, method: req.method });
      return res.status(403).json({
        ok: false,
        error: 'Pricing calculator integration is disabled.',
        code: 'PRICING_CALC_DISABLED'
      });
    })
    .catch((e) => {
      logger.error('pricing_calc_flag_error', { message: e.message });
      return res.status(503).json({ ok: false, error: 'Unable to verify feature flag' });
    });
};

router.use(requirePricingCalculationsEnabled);

const requirePricingApiKey = (req, res, next) => {
  if (!PRICING_CALC_API_KEY) {
    return next();
  }
  const provided =
    (req.get('x-api-key') || req.get('X-Api-Key') || '').trim() ||
    (req.query && (req.query.api_key || req.query.apiKey) || '').trim();
  if (provided && provided === PRICING_CALC_API_KEY) {
    return next();
  }
  logger.warn('pricing_calc_auth_failed', { path: req.path });
  return res.status(401).json({ ok: false, error: 'Missing or invalid API key' });
};

/** Require session (req.user) for my-unlinked and link. */
const requireSession = (req, res, next) => {
  if (req.user) return next();
  return res.status(401).json({ ok: false, error: 'Session required' });
};

/**
 * GET /api/pricing-calculations
 * List calculations with optional filters: user_email, country, channel_type, from, to, limit, offset.
 */
router.get('/', requirePricingApiKey, async (req, res) => {
  try {
    const userEmail = (req.query.user_email || '').trim() || null;
    const country = (req.query.country || '').trim() || null;
    const channelType = (req.query.channel_type || '').trim() || null;
    const from = (req.query.from || '').trim() || null;
    const to = (req.query.to || '').trim() || null;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    const pool = getPool();
    const conditions = [];
    const params = [];
    let idx = 1;

    if (userEmail) {
      conditions.push(`user_email = $${idx}`);
      params.push(userEmail);
      idx++;
    }
    if (country) {
      conditions.push(`country = $${idx}`);
      params.push(country);
      idx++;
    }
    if (channelType) {
      conditions.push(`channel_type = $${idx}`);
      params.push(channelType);
      idx++;
    }
    if (from) {
      conditions.push(`created_at >= $${idx}::timestamptz`);
      params.push(from);
      idx++;
    }
    if (to) {
      conditions.push(`created_at <= $${idx}::timestamptz`);
      params.push(to);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM pricing_calculations ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(limit, offset);
    const listResult = await pool.query(
      `SELECT id, calculation_id, user_email, country, channel_type, created_at, updated_at,
              total_mandays, voice_mandays, text_mandays, total_invoice
       FROM pricing_calculations ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    return res.json({
      ok: true,
      total,
      limit,
      offset,
      items: listResult.rows
    });
  } catch (err) {
    logger.error('pricing_calc_list_error', { message: err.message });
    return res.status(500).json({ ok: false, error: 'Failed to list calculations' });
  }
});

/**
 * POST /api/pricing-calculations
 * Ingest a full calculation payload from the pricing calculator (upsert by calculation_id).
 * Saves to DB only; no activity is created. The presales user sees it as an unlinked calculation
 * (GET /my-unlinked), adds it as a draft, picks account/project in PreSight, and submits; then
 * we create the activity and link via PATCH /link.
 * Body: { calculation_id, user_email, created_at, country, channel_type, inputs, results, ... }
 */
router.post('/', requirePricingApiKey, async (req, res) => {
  try {
    const body = req.body || {};
    const calculationId = (body.calculation_id || '').trim();
    if (!calculationId) {
      return res.status(400).json({ ok: false, error: 'calculation_id is required' });
    }

    const userEmail = (body.user_email || '').trim() || null;
    const country = (body.country || '').trim() || null;
    const channelType = (body.channel_type || '').trim() || null;
    const createdAt = body.created_at || new Date().toISOString();
    const payload = { ...body };
    if (!payload.calculation_id) payload.calculation_id = calculationId;
    if (!payload.user_email) payload.user_email = userEmail;
    if (!payload.country) payload.country = country;
    if (!payload.channel_type) payload.channel_type = channelType;
    if (!payload.created_at) payload.created_at = createdAt;

    const totalMandays = payload.total_mandays != null ? Number(payload.total_mandays) : null;
    const voiceMandays = (payload.voice_pricing && payload.voice_pricing.voice_mandays != null)
      ? Number(payload.voice_pricing.voice_mandays)
      : null;
    const textMandays = payload.text_mandays != null ? Number(payload.text_mandays) : null;
    let totalInvoice = null;
    if (payload.final_price_details && typeof payload.final_price_details === 'object') {
      const total = payload.final_price_details.total_invoice ?? payload.final_price_details.total;
      if (total != null) totalInvoice = Number(total);
    }

    const now = new Date().toISOString();
    const pool = getPool();
    await pool.query(
      `INSERT INTO pricing_calculations (
        calculation_id, user_email, country, channel_type, created_at, updated_at,
        payload, total_mandays, voice_mandays, text_mandays, total_invoice
      ) VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz, $7::jsonb, $8, $9, $10, $11)
      ON CONFLICT (calculation_id) DO UPDATE SET
        user_email = EXCLUDED.user_email,
        country = EXCLUDED.country,
        channel_type = EXCLUDED.channel_type,
        updated_at = EXCLUDED.updated_at,
        payload = EXCLUDED.payload,
        total_mandays = EXCLUDED.total_mandays,
        voice_mandays = EXCLUDED.voice_mandays,
        text_mandays = EXCLUDED.text_mandays,
        total_invoice = EXCLUDED.total_invoice`,
      [
        calculationId,
        userEmail,
        country,
        channelType,
        createdAt,
        now,
        JSON.stringify(payload),
        totalMandays,
        voiceMandays,
        textMandays,
        totalInvoice
      ]
    );

    const row = await pool.query(
      'SELECT id, calculation_id, created_at, updated_at FROM pricing_calculations WHERE calculation_id = $1',
      [calculationId]
    );
    const r = row.rows[0];
    logger.info('pricing_calc_ingested', { calculation_id: calculationId, user_email: userEmail });
    return res.status(200).json({
      ok: true,
      id: r.id,
      calculation_id: r.calculation_id,
      created_at: r.created_at,
      updated_at: r.updated_at
    });
  } catch (err) {
    logger.error('pricing_calc_post_error', { message: err.message, stack: err.stack });
    return res.status(500).json({ ok: false, error: 'Failed to save calculation' });
  }
});

/**
 * GET /api/pricing-calculations/my-unlinked
 * Returns calculations for the current user (by session email) that are not yet linked to an activity.
 * Requires session (logged-in user). Used by PreSight to create "pricing drafts" so the user can
 * pick account/project and submit.
 */
router.get('/my-unlinked', requireSession, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ ok: false, error: 'Session required; user email not found' });
    }
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, calculation_id, user_email, country, channel_type, created_at, updated_at,
              total_mandays, voice_mandays, text_mandays, total_invoice, payload
       FROM pricing_calculations
       WHERE activity_id IS NULL AND LOWER(TRIM(user_email)) = LOWER(TRIM($1))
       ORDER BY created_at DESC`,
      [user.email]
    );
    return res.json({ ok: true, items: result.rows });
  } catch (err) {
    logger.error('pricing_calc_my_unlinked_error', { message: err.message });
    return res.status(500).json({ ok: false, error: 'Failed to fetch unlinked calculations' });
  }
});

/**
 * PATCH /api/pricing-calculations/link
 * Link a calculation to an activity after the user submitted from a draft (picked account/project).
 * Body: { calculation_id: string, activity_id: string }. Requires session; only allows linking
 * calculations whose user_email matches the current user.
 */
router.patch('/link', requireSession, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ ok: false, error: 'Session required' });
    }
    const calculationId = (req.body && req.body.calculation_id || '').trim();
    const activityId = (req.body && req.body.activity_id || '').trim();
    if (!calculationId || !activityId) {
      return res.status(400).json({ ok: false, error: 'calculation_id and activity_id are required' });
    }
    const pool = getPool();
    const update = await pool.query(
      `UPDATE pricing_calculations
       SET activity_id = $1, updated_at = NOW()
       WHERE calculation_id = $2 AND activity_id IS NULL
         AND LOWER(TRIM(user_email)) = LOWER(TRIM($3))
       RETURNING id, calculation_id, activity_id`,
      [activityId, calculationId, user.email]
    );
    if (update.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Calculation not found or already linked or not owned by you' });
    }
    logger.info('pricing_calc_linked', { calculation_id: calculationId, activity_id: activityId });
    return res.json({ ok: true, calculation_id: calculationId, activity_id: activityId });
  } catch (err) {
    logger.error('pricing_calc_link_error', { message: err.message });
    return res.status(500).json({ ok: false, error: 'Failed to link calculation' });
  }
});

/**
 * DELETE /api/pricing-calculations/:calculation_id
 * Delete an unlinked calculation owned by the current user (session). Only allowed when activity_id IS NULL.
 */
router.delete('/:calculation_id', requireSession, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.email) {
      return res.status(401).json({ ok: false, error: 'Session required' });
    }
    const calculationId = (req.params.calculation_id || '').trim();
    if (!calculationId) {
      return res.status(400).json({ ok: false, error: 'calculation_id is required' });
    }
    const pool = getPool();
    const del = await pool.query(
      `DELETE FROM pricing_calculations
       WHERE calculation_id = $1 AND activity_id IS NULL
         AND LOWER(TRIM(user_email)) = LOWER(TRIM($2))
       RETURNING calculation_id`,
      [calculationId, user.email]
    );
    if (del.rowCount === 0) {
      return res.status(404).json({ ok: false, error: 'Calculation not found, already linked, or not owned by you' });
    }
    logger.info('pricing_calc_deleted', { calculation_id: calculationId });
    return res.json({ ok: true, calculation_id: calculationId });
  } catch (err) {
    logger.error('pricing_calc_delete_error', { message: err.message });
    return res.status(500).json({ ok: false, error: 'Failed to delete calculation' });
  }
});

/**
 * GET /api/pricing-calculations/:calculation_id
 * Return the full stored payload for one calculation.
 */
router.get('/:calculation_id', async (req, res) => {
  try {
    const calculationId = (req.params.calculation_id || '').trim();
    if (!calculationId) {
      return res.status(400).json({ ok: false, error: 'calculation_id is required' });
    }
    const pool = getPool();
    const row = await pool.query(
      'SELECT calculation_id, user_email, country, channel_type, created_at, updated_at, payload FROM pricing_calculations WHERE calculation_id = $1',
      [calculationId]
    );
    if (!row.rows.length) {
      return res.status(404).json({ ok: false, error: 'Calculation not found' });
    }
    const r = row.rows[0];
    return res.json({
      ok: true,
      calculation_id: r.calculation_id,
      user_email: r.user_email,
      country: r.country,
      channel_type: r.channel_type,
      created_at: r.created_at,
      updated_at: r.updated_at,
      ...r.payload
    });
  } catch (err) {
    logger.error('pricing_calc_get_error', { message: err.message });
    return res.status(500).json({ ok: false, error: 'Failed to fetch calculation' });
  }
});

module.exports = router;
