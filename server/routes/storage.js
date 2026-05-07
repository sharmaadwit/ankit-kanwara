const express = require('express');
const zlib = require('zlib');
const LZString = require('lz-string');
const router = express.Router();

const { getPool } = require('../db');
const logger = require('../logger');
const { requireAdminAuth } = require('../middleware/auth');
const { validateStoragePayload, validateActivities, validateInternalActivities } = require('../lib/storageValidation');
const { dualWriteAfterStorageWrite } = require('../lib/normalizedDualWrite');
const { logActivitySubmissionSafe } = require('../lib/activitySubmissionLog');
const { loadAccountsFromNormalizedTables } = require('../lib/loadAccountsFromNormalizedTables');

const GZIP_PREFIX = '__gz__';
/** Browser client uses LZString.compressToBase64 with this prefix (see pams-app/js/remoteStorage.js). */
const LZ_PREFIX = '__lz__';
const STORAGE_READ_CACHE_TTL_MS = Math.max(
  0,
  parseInt(process.env.STORAGE_READ_CACHE_TTL_MS || '3000', 10) || 3000
);
const CLIENT_MUTATION_ID_MAX_LENGTH = 120;
const storageReadCache = new Map();

const getCachedStorageRow = (key) => {
  if (!key || STORAGE_READ_CACHE_TTL_MS <= 0) return null;
  const entry = storageReadCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    storageReadCache.delete(key);
    return null;
  }
  return entry.row;
};

const setCachedStorageRow = (key, row) => {
  if (!key || !row || STORAGE_READ_CACHE_TTL_MS <= 0) return;
  storageReadCache.set(key, {
    row,
    expiresAt: Date.now() + STORAGE_READ_CACHE_TTL_MS
  });
};

const invalidateStorageReadCache = (key) => {
  if (!key) {
    storageReadCache.clear();
    return;
  }
  storageReadCache.delete(key);
};

const normalizeMutationId = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > CLIENT_MUTATION_ID_MAX_LENGTH) return null;
  return trimmed;
};

/** Archive current value to storage_history before overwrite (The Insurance). Skip migration_* keys to avoid huge history growth. */
const archiveCurrentValue = async (client, key) => {
  if (/^migration_/.test(key)) return;
  const { rows } = await client.query(
    'SELECT value, updated_at FROM storage WHERE key = $1;',
    [key]
  );
  if (rows.length === 0) return;
  await client.query(
    `INSERT INTO storage_history (key, value, updated_at, archived_at) VALUES ($1, $2, $3, NOW());`,
    [key, rows[0].value, rows[0].updated_at]
  );
};

/** Store rejected payload in pending_storage_saves (Lost & Found on 409). DEPRECATED: no longer writes; conflict payloads are recorded in activity_submission_logs. Kept as no-op so callers need no change. */
const savePendingDraft = async (_storageKey, _value, _reason, _username) => {
  /* Deprecated: use Activity submission log for conflict recovery. */
};

const maybeDecompressValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }
  if (value.startsWith(LZ_PREFIX)) {
    try {
      const restored = LZString.decompressFromBase64(value.slice(LZ_PREFIX.length));
      if (restored != null) {
        return restored;
      }
    } catch (error) {
      logger.warn('storage_lz_decompress_failed', {
        message: error.message
      });
    }
    return value;
  }
  if (!value.startsWith(GZIP_PREFIX)) {
    return value;
  }
  try {
    const compressed = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    return zlib.gunzipSync(compressed).toString('utf8');
  } catch (error) {
    logger.warn('storage_decompress_failed', {
      message: error.message
    });
    return value;
  }
};

const listKeys = async () => {
  const { rows } = await getPool().query(
    'SELECT key FROM storage ORDER BY key ASC;'
  );
  return rows.map((row) => row.key);
};

/** Returns { value, updated_at } for optimistic locking. updated_at is ISO string. */
const getValueWithVersion = async (key) => {
  if (key !== 'activities') {
    const cached = getCachedStorageRow(key);
    if (cached) {
      return cached;
    }
  }
  const { rows } = await getPool().query(
    'SELECT value, updated_at FROM storage WHERE key = $1;',
    [key]
  );
  if (!rows.length) {
    return null;
  }
  const row = rows[0];
  const normalized = {
    value: row.value,
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
  };
  if (key !== 'activities') {
    setCachedStorageRow(key, normalized);
  }
  return normalized;
};

const getValuesWithVersionBatch = async (keys) => {
  const uniqueKeys = Array.from(new Set((keys || []).filter(Boolean)));
  if (!uniqueKeys.length) return [];

  const rowsByKey = new Map();
  const missingKeys = [];
  uniqueKeys.forEach((key) => {
    const cached = getCachedStorageRow(key);
    if (cached) {
      rowsByKey.set(key, cached);
    } else {
      missingKeys.push(key);
    }
  });

  if (missingKeys.length) {
    const { rows } = await getPool().query(
      'SELECT key, value, updated_at FROM storage WHERE key = ANY($1::text[]);',
      [missingKeys]
    );
    (rows || []).forEach((row) => {
      const normalized = {
        value: row.value,
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null
      };
      rowsByKey.set(row.key, normalized);
      setCachedStorageRow(row.key, normalized);
    });
  }

  return uniqueKeys
    .filter((key) => rowsByKey.has(key))
    .map((key) => ({ key, ...rowsByKey.get(key) }));
};

/** Unconditional upsert. Archives old value first, then updates. Returns { updated_at }. */
const setValue = async (key, value, externalClient) => {
  const client = externalClient || await getPool().connect();
  const ownsClient = !externalClient;
  try {
    await archiveCurrentValue(client, key);
    const { rows } = await client.query(
      `
      INSERT INTO storage (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key)
      DO UPDATE SET value = excluded.value, updated_at = NOW()
      RETURNING updated_at;
    `,
      [key, value]
    );
    const updatedAt = rows[0] && rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : new Date().toISOString();
    invalidateStorageReadCache(key);
    return { updated_at: updatedAt };
  } finally {
    if (ownsClient) {
      client.release();
    }
  }
};

const parseAccountsArrayForHeal = (raw) => {
  if (raw == null || raw === '') return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
};

/**
 * When storage.accounts is missing or parses to [], rebuild from normalized tables and persist.
 * Remote storage clients only call GET /api/storage/accounts, not entities — without this they stay "empty".
 */
const maybeSelfHealAccountsStorageRow = async (row, transactionId) => {
  const tryHeal = async (reason) => {
    const recovered = await loadAccountsFromNormalizedTables(getPool());
    if (!recovered.length) return null;
    const serialized = JSON.stringify(recovered);
    const { updated_at } = await setValue('accounts', serialized);
    logger.info('storage_accounts_self_heal', {
      reason,
      count: recovered.length,
      transactionId
    });
    return { value: serialized, updated_at };
  };

  if (!row) {
    return tryHeal('missing_row');
  }
  const list = parseAccountsArrayForHeal(maybeDecompressValue(row.value));
  if (list.length > 0) return null;
  return tryHeal('empty_storage');
};

/** Conditional update: only if current updated_at matches ifMatch. Returns { updated_at } or null on conflict. */
const setValueIfMatch = async (key, value, ifMatch, externalClient) => {
  const client = externalClient || await getPool().connect();
  const ownsClient = !externalClient;
  try {
    const existing = await client.query(
      'SELECT updated_at FROM storage WHERE key = $1;',
      [key]
    );
    const now = new Date().toISOString();
    if (existing.rows.length === 0) {
      if (ifMatch != null && ifMatch !== '') {
        return { conflict: true };
      }
      await client.query(
        `INSERT INTO storage (key, value, updated_at) VALUES ($1, $2, NOW());`,
        [key, value]
      );
      invalidateStorageReadCache(key);
      return { updated_at: now };
    }
    if (ifMatch != null && ifMatch !== '') {
      const current = new Date(existing.rows[0].updated_at).toISOString();
      if (current !== ifMatch) {
        const { rows } = await client.query(
          'SELECT value, updated_at FROM storage WHERE key = $1;',
          [key]
        );
        return {
          conflict: true,
          value: rows[0].value,
          updated_at: new Date(rows[0].updated_at).toISOString()
        };
      }
    }
    await archiveCurrentValue(client, key);
    const { rows } = await client.query(
      `UPDATE storage SET value = $2, updated_at = NOW() WHERE key = $1 RETURNING updated_at;`,
      [key, value]
    );
    const updatedAt = rows[0] && rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : now;
    invalidateStorageReadCache(key);
    return { updated_at: updatedAt };
  } finally {
    if (ownsClient) {
      client.release();
    }
  }
};

const deleteValue = async (key) => {
  await getPool().query('DELETE FROM storage WHERE key = $1;', [key]);
  invalidateStorageReadCache(key);
};

/** True if key is activities or activities:YYYY-MM (merge on PUT to prevent trim). */
const isActivityStorageKey = (key) =>
  key === 'activities' || /^activities:\d{4}-\d{2}$/.test(key);

/** Keys whose storage PUT we record in activity_submission_logs (external buckets + internal list). */
const storageKeyLogsActivitySubmission = (key) =>
  key === 'internalActivities' || isActivityStorageKey(key);

/** Validation key for storage: activities:YYYY-MM uses same rules as activities. */
const validationKey = (key) =>
  key === 'activities' || /^activities:\d{4}-\d{2}$/.test(key) ? 'activities' : key;

/** D-002: Trigger dual-write to normalized tables after successful storage write. Fire-and-forget. */
function triggerDualWrite(key, serializedValue) {
  const vkey = key === 'activities' || /^activities:\d{4}-\d{2}$/.test(key) ? 'activities' : key;
  if (!['accounts', 'activities', 'internalActivities'].includes(vkey)) return;
  let parsed;
  try {
    const raw =
      typeof serializedValue === 'string' ? maybeDecompressValue(serializedValue) : serializedValue;
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (_) {
    return;
  }
  if (!Array.isArray(parsed)) return;
  dualWriteAfterStorageWrite(getPool(), vkey, parsed).catch(() => {});
}

/** Parse serialized value to array for activity submission log (PUT). Returns array or null. */
function parseActivityPayloadForLog(serializedValue) {
  if (serializedValue == null || serializedValue === '') return null;
  try {
    const raw =
      typeof serializedValue === 'string' ? maybeDecompressValue(serializedValue) : serializedValue;
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

/** Parse and validate payload for keys we validate. Returns { valid, error? }. No-op for other keys. */
const parseAndValidate = (key, serializedValue) => {
  const vkey = validationKey(key);
  if (!['activities', 'internalActivities', 'accounts', 'users'].includes(vkey)) {
    return { valid: true };
  }
  const sizeCheck = validateStoragePayload(vkey, null, serializedValue);
  if (!sizeCheck.valid) return sizeCheck;
  let parsed;
  try {
    const toParse =
      typeof serializedValue === 'string' ? maybeDecompressValue(serializedValue) : serializedValue;
    parsed = typeof toParse === 'string' ? JSON.parse(toParse) : toParse;
  } catch (e) {
    return { valid: false, error: 'Invalid JSON or decompression failed' };
  }
  return validateStoragePayload(vkey, parsed, serializedValue);
};

/** Stable string id for merge maps (align with client: 123 and "123" are one row). */
function storagePayloadIdKey(a) {
  if (!a || a.id == null) return null;
  const s = String(a.id).trim();
  return s || null;
}

/** Merge two activity arrays by id; newer updatedAt/createdAt wins. Prevents one client from overwriting with partial list. */
const mergeActivitiesPayload = (currentSerialized, incomingSerialized) => {
  const parse = (s) => {
    if (s == null || s === '') return [];
    try {
      const v = typeof s === 'string' ? s : String(s);
      const decoded = typeof v === 'string' ? maybeDecompressValue(v) : v;
      const parsed = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  };
  const getTs = (a) => (a && (a.updatedAt || a.createdAt)) ? String(a.updatedAt || a.createdAt) : '';
  const currentArr = parse(currentSerialized);
  const incomingArr = parse(incomingSerialized);
  const byId = new Map();
  currentArr.forEach((a) => {
    const k = storagePayloadIdKey(a);
    if (k) byId.set(k, a);
  });
  incomingArr.forEach((a) => {
    const k = storagePayloadIdKey(a);
    if (!k) return;
    const existing = byId.get(k);
    if (!existing) { byId.set(k, a); return; }
    if (getTs(a) > getTs(existing)) byId.set(k, a);
  });
  return JSON.stringify(Array.from(byId.values()));
};

/** Log storage PUT for Railway/in-app diagnostics and retrieval (key, who, count). */
const extractPayloadCount = (key, serializedValue) => {
  const isKnown =
    key === 'activities' ||
    key === 'accounts' ||
    key === 'internalActivities' ||
    /^activities:\d{4}-\d{2}$/.test(key) ||
    key === 'migration_draft_accounts' ||
    key === 'migration_draft_internalActivities' ||
    key === 'migration_confirmed_accounts' ||
    key === 'migration_confirmed_internalActivities' ||
    /^migration_draft_activities:\d{4}-\d{2}$/.test(key) ||
    /^migration_confirmed_activities:\d{4}-\d{2}$/.test(key);
  if (!isKnown) return null;
  try {
    const parsed = typeof serializedValue === 'string' ? JSON.parse(serializedValue) : serializedValue;
    return Array.isArray(parsed) ? parsed.length : null;
  } catch (_) {
    return null;
  }
};

const logStorageWrite = (key, serializedValue, conditional, transactionId, username) => {
  const meta = {
    key,
    conditional: !!conditional,
    transactionId,
    username: username || null
  };
  const count = extractPayloadCount(key, serializedValue);
  if (count != null) meta.count = count;
  logger.info('storage_write', meta);
};

/**
 * Creates or locks a mutation row so retries with same id are idempotent.
 * Returns:
 * - { replay: true, updated_at } when mutation was already applied.
 * - { replay: false } when caller should apply write now.
 */
const lockClientMutation = async (client, mutationId, storageKey) => {
  await client.query(
    `INSERT INTO storage_mutations (mutation_id, storage_key, response_updated_at, created_at)
     VALUES ($1, $2, NULL, NOW())
     ON CONFLICT (mutation_id) DO NOTHING;`,
    [mutationId, storageKey]
  );
  const { rows } = await client.query(
    `SELECT mutation_id, storage_key, response_updated_at
     FROM storage_mutations
     WHERE mutation_id = $1
     FOR UPDATE;`,
    [mutationId]
  );
  const row = rows[0];
  if (!row) return { replay: false };
  if (row.storage_key !== storageKey) {
    return { conflict: true };
  }
  if (row.response_updated_at) {
    return {
      replay: true,
      updated_at: new Date(row.response_updated_at).toISOString()
    };
  }
  return { replay: false };
};

const completeClientMutation = async (client, mutationId, updatedAtIso) => {
  await client.query(
    `UPDATE storage_mutations
     SET response_updated_at = $2::timestamptz
     WHERE mutation_id = $1;`,
    [mutationId, updatedAtIso]
  );
};

const clearAll = async () => {
  await getPool().query('TRUNCATE storage;');
  invalidateStorageReadCache();
};

router.get('/', async (req, res) => {
  try {
    const keys = await listKeys();
    res.json({ keys });
  } catch (error) {
    logger.error('storage_list_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to list keys' });
  }
});

/** Lost & Found: list pending/draft saves (e.g. after 409 conflict). Admin only. Query: ?hours=24 to limit to last N hours. */
router.get('/pending', requireAdminAuth, async (req, res) => {
  try {
    const hoursParam = req.query.hours;
    const hours = hoursParam != null ? Math.max(0, parseInt(String(hoursParam), 10) || 0) : null;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);
    const query = hours != null && hours > 0
      ? `SELECT id, storage_key, value, reason, username, created_at
         FROM pending_storage_saves
         WHERE created_at >= NOW() - ($1 * interval '1 hour')
         ORDER BY created_at DESC
         LIMIT $2`
      : `SELECT id, storage_key, value, reason, username, created_at
         FROM pending_storage_saves
         ORDER BY created_at DESC
         LIMIT $1`;
    const args = hours != null && hours > 0 ? [hours, limit] : [limit];
    const { rows } = await getPool().query(query, args);
    const pending = rows.map((r) => ({
      id: r.id,
      storage_key: r.storage_key,
      value: r.value,
      reason: r.reason,
      username: r.username,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null
    }));
    res.json({
      pending,
      _deprecated: true,
      _message: 'Server-side pending drafts are deprecated. New conflicts are not stored here; use Admin → Activity submission log for recovery.'
    });
  } catch (error) {
    logger.error('storage_pending_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to list pending saves' });
  }
});

/** Remove a pending save after it has been applied (or discarded). Admin only. */
router.delete('/pending/:id', requireAdminAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id) || id < 1) {
      return res.status(400).json({ message: 'Invalid pending id' });
    }
    const { rowCount } = await getPool().query(
      'DELETE FROM pending_storage_saves WHERE id = $1',
      [id]
    );
    if (rowCount === 0) {
      return res.status(404).json({ message: 'Pending save not found' });
    }
    res.status(204).send();
  } catch (error) {
    logger.error('storage_pending_delete_failed', {
      message: error.message,
      transactionId: req.transactionId,
      id: req.params.id
    });
    res.status(500).json({ message: 'Failed to delete pending save' });
  }
});

/** Batch GET: fetch multiple keys in one request. ?keys=key1,key2,key3 */
router.get('/batch', async (req, res) => {
  try {
    const keysParam = (req.query.keys || '').trim();
    const keys = keysParam ? keysParam.split(',').map((k) => k.trim()).filter(Boolean) : [];
    if (!keys.length || keys.length > 20) {
      return res.status(400).json({ message: 'Provide 1–20 keys in ?keys=key1,key2' });
    }
    const rows = await getValuesWithVersionBatch(keys);
    let rowsForResponse = [...rows];
    if (keys.includes('accounts')) {
      const accRow = rowsForResponse.find((r) => r.key === 'accounts');
      const healed = await maybeSelfHealAccountsStorageRow(accRow || null, req.transactionId);
      if (healed) {
        const idx = rowsForResponse.findIndex((r) => r.key === 'accounts');
        const replacement = { key: 'accounts', value: healed.value, updated_at: healed.updated_at };
        if (idx >= 0) rowsForResponse[idx] = replacement;
        else rowsForResponse.push(replacement);
      }
    }
    const items = (rowsForResponse || []).map((r) => ({
      key: r.key,
      value: maybeDecompressValue(r.value),
      updated_at: r.updated_at
    }));
    res.json({ items });
  } catch (error) {
    logger.error('storage_batch_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to read keys' });
  }
});

/** Keys that may not exist yet; return 200 with null value instead of 404 to avoid console noise. */
const OPTIONAL_STORAGE_KEYS = new Set(['pams_leaders', 'pams_salesLeaders', 'pams_reportOverrides', 'suggestions_and_bugs']);

/**
 * Append one activity to the activities storage key. Must be called with a DB client that is
 * already in a transaction (caller does BEGIN/COMMIT). Used by POST /activities/append and
 * by pricing-calculations ingest to log a pricing activity.
 * @param {object} client - pg client from getPool().connect()
 * @param {object} activity - activity object with at least { id, date, type, ... }
 * @returns {{ ok: boolean, updated_at?: string, dropped?: boolean }}
 */
async function appendActivityWithClient(client, activity) {
  if (!activity || !activity.id) {
    return { ok: false, dropped: true };
  }
  const { rows: currentRows } = await client.query(
    'SELECT value, updated_at FROM storage WHERE key = $1 FOR UPDATE;',
    ['activities']
  );
  const currentSerialized = currentRows.length ? currentRows[0].value : null;
  const incomingSerialized = JSON.stringify([activity]);
  const mergedSerialized = mergeActivitiesPayload(currentSerialized, incomingSerialized);
  let parsedMerged;
  try {
    parsedMerged = JSON.parse(mergedSerialized);
  } catch (_) {
    parsedMerged = [];
  }
  const incomingKey = storagePayloadIdKey(activity);
  const hasNewActivity = Array.isArray(parsedMerged) && incomingKey
    && parsedMerged.some((a) => storagePayloadIdKey(a) === incomingKey);
  if (!hasNewActivity) {
    logger.warn('storage_append_activity_dropped', { activityId: activity.id });
    return { ok: false, dropped: true };
  }
  const validation = validateActivities(parsedMerged);
  if (!validation.valid) {
    return { ok: false, validationError: validation.error };
  }
  await archiveCurrentValue(client, 'activities');
  const { rows } = await client.query(
    `INSERT INTO storage (key, value, updated_at) VALUES ('activities', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW()
     RETURNING updated_at;`,
    [mergedSerialized]
  );
  invalidateStorageReadCache('activities');
  const updatedAt = rows[0] && rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : new Date().toISOString();
  return { ok: true, updated_at: updatedAt, mergedArray: parsedMerged };
}

router.appendActivityWithClient = appendActivityWithClient;

/**
 * Append one internal activity (same merge semantics as external append).
 */
async function appendInternalActivityWithClient(client, activity) {
  if (!activity || !activity.id) {
    return { ok: false, dropped: true };
  }
  const { rows: currentRows } = await client.query(
    'SELECT value, updated_at FROM storage WHERE key = $1 FOR UPDATE;',
    ['internalActivities']
  );
  const currentSerialized = currentRows.length ? currentRows[0].value : null;
  const incomingSerialized = JSON.stringify([activity]);
  const mergedSerialized = mergeActivitiesPayload(currentSerialized, incomingSerialized);
  let parsedMerged;
  try {
    parsedMerged = JSON.parse(mergedSerialized);
  } catch (_) {
    parsedMerged = [];
  }
  const incomingKey = storagePayloadIdKey(activity);
  const hasRow = Array.isArray(parsedMerged) && incomingKey
    && parsedMerged.some((a) => storagePayloadIdKey(a) === incomingKey);
  if (!hasRow) {
    logger.warn('storage_append_internal_activity_dropped', { activityId: activity.id });
    return { ok: false, dropped: true };
  }
  const validation = validateInternalActivities(parsedMerged);
  if (!validation.valid) {
    return { ok: false, validationError: validation.error };
  }
  await archiveCurrentValue(client, 'internalActivities');
  const { rows } = await client.query(
    `INSERT INTO storage (key, value, updated_at) VALUES ('internalActivities', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW()
     RETURNING updated_at;`,
    [mergedSerialized]
  );
  invalidateStorageReadCache('internalActivities');
  const updatedAt = rows[0] && rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : new Date().toISOString();
  return { ok: true, updated_at: updatedAt, mergedArray: parsedMerged };
}

router.appendInternalActivityWithClient = appendInternalActivityWithClient;

/**
 * POST /internalActivities/append – append or update one internal activity (no full-list PUT).
 */
router.post('/internalActivities/append', async (req, res) => {
  const username = req.get('X-Admin-User') || req.get('x-admin-user') || null;
  const transactionId = req.transactionId;
  try {
    const { activity } = req.body || {};
    if (!activity || typeof activity !== 'object' || !activity.id) {
      logActivitySubmissionSafe({
        pool: getPool(),
        username,
        action: 'append',
        outcome: 'validation_failed',
        payload: activity || {},
        activityCount: 0,
        transactionId
      });
      return res.status(400).json({ message: 'Body must include { activity: { id, ... } }' });
    }
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await appendInternalActivityWithClient(client, activity);
      if (!result.ok && result.validationError) {
        await client.query('ROLLBACK').catch(() => {});
        logActivitySubmissionSafe({
          pool: getPool(),
          username,
          action: 'append',
          outcome: 'validation_failed',
          payload: activity,
          activityCount: 1,
          transactionId
        });
        return res.status(400).json({ message: result.validationError });
      }
      if (!result.ok && result.dropped) {
        await client.query('ROLLBACK').catch(() => {});
        logActivitySubmissionSafe({
          pool: getPool(),
          username,
          action: 'append',
          outcome: 'dropped',
          payload: activity,
          activityCount: 1,
          transactionId
        });
        logger.error('storage_append_internal_activity_dropped', { activityId: activity.id, transactionId });
        return res.status(500).json({ message: 'Append merge did not include activity; not written.' });
      }
      await client.query('COMMIT');
      if (result.mergedArray && Array.isArray(result.mergedArray)) {
        dualWriteAfterStorageWrite(getPool(), 'internalActivities', result.mergedArray).catch(() => {});
      }
      logActivitySubmissionSafe({
        pool: getPool(),
        username,
        action: 'append',
        outcome: 'success',
        payload: activity,
        activityCount: 1,
        transactionId,
        storageUpdatedAt: result.updated_at
      });
      logger.info('storage_append_internal_activity', { activityId: activity.id, transactionId });
      return res.status(200).json({ ok: true, key: 'internalActivities', updated_at: result.updated_at });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('storage_append_internal_activity_failed', { message: error.message, transactionId: req.transactionId });
    return res.status(500).json({ message: 'Failed to append internal activity' });
  }
});

/**
 * POST /activities/append – append or update one activity (no bulk). Read-modify-write on server.
 * Body: { activity: { id, date, type, accountId, projectId, ... } }
 * Returns: { ok: true, key: 'activities', updated_at } or 4xx/5xx.
 */
router.post('/activities/append', async (req, res) => {
  const username = req.get('X-Admin-User') || req.get('x-admin-user') || null;
  const transactionId = req.transactionId;
  try {
    const { activity } = req.body || {};
    if (!activity || typeof activity !== 'object' || !activity.id) {
      logActivitySubmissionSafe({
        pool: getPool(),
        username,
        action: 'append',
        outcome: 'validation_failed',
        payload: activity || {},
        activityCount: 0,
        transactionId
      });
      return res.status(400).json({ message: 'Body must include { activity: { id, ... } }' });
    }
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const result = await appendActivityWithClient(client, activity);
      if (!result.ok && result.validationError) {
        await client.query('ROLLBACK').catch(() => {});
        logActivitySubmissionSafe({
          pool: getPool(),
          username,
          action: 'append',
          outcome: 'validation_failed',
          payload: activity,
          activityCount: 1,
          transactionId
        });
        return res.status(400).json({ message: result.validationError });
      }
      if (!result.ok && result.dropped) {
        await client.query('ROLLBACK').catch(() => {});
        logActivitySubmissionSafe({
          pool: getPool(),
          username,
          action: 'append',
          outcome: 'dropped',
          payload: activity,
          activityCount: 1,
          transactionId
        });
        logger.error('storage_append_activity_dropped', { activityId: activity.id, transactionId });
        return res.status(500).json({ message: 'Append merge did not include activity; not written.' });
      }
      await client.query('COMMIT');
      if (result.mergedArray && Array.isArray(result.mergedArray)) {
        dualWriteAfterStorageWrite(getPool(), 'activities', result.mergedArray).catch(() => {});
      }
      logActivitySubmissionSafe({
        pool: getPool(),
        username,
        action: 'append',
        outcome: 'success',
        payload: activity,
        activityCount: 1,
        transactionId,
        storageUpdatedAt: result.updated_at
      });
      logger.info('storage_append_activity', { activityId: activity.id, transactionId });
      return res.status(200).json({ ok: true, key: 'activities', updated_at: result.updated_at });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('storage_append_activity_failed', { message: error.message, transactionId: req.transactionId });
    return res.status(500).json({ message: 'Failed to append activity' });
  }
});

/**
 * POST /activities/remove – remove one activity by id (no full-list PUT).
 * Body: { activityId: string }
 * Returns: { ok: true, key: 'activities', updated_at } or 404 / 5xx.
 */
router.post('/activities/remove', async (req, res) => {
  const username = req.get('X-Admin-User') || req.get('x-admin-user') || null;
  const transactionId = req.transactionId;
  const payloadRemove = (id) => ({ activityId: id });
  try {
    const activityId = req.body?.activityId;
    if (!activityId || typeof activityId !== 'string') {
      logActivitySubmissionSafe({
        pool: getPool(),
        username,
        action: 'remove',
        outcome: 'validation_failed',
        payload: payloadRemove(''),
        activityCount: 0,
        transactionId
      });
      return res.status(400).json({ message: 'Body must include { activityId: string }' });
    }
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      const { rows: currentRows } = await client.query(
        'SELECT value FROM storage WHERE key = $1 FOR UPDATE;',
        ['activities']
      );
      const currentSerialized = currentRows.length ? currentRows[0].value : null;
      const parse = (s) => {
        if (s == null || s === '') return [];
        try {
          const v = typeof s === 'string' ? s : String(s);
          const decoded = typeof v === 'string' ? maybeDecompressValue(v) : v;
          const parsed = typeof decoded === 'string' ? JSON.parse(decoded) : decoded;
          return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
          return [];
        }
      };
      const list = parse(currentSerialized);
      const removeIdKey = activityId != null ? String(activityId) : '';
      const filtered = list.filter((a) => a && String(a.id) !== removeIdKey);
      if (filtered.length === list.length) {
        await client.query('ROLLBACK').catch(() => {});
        logActivitySubmissionSafe({
          pool: getPool(),
          username,
          action: 'remove',
          outcome: 'not_found',
          payload: payloadRemove(activityId),
          activityCount: 0,
          transactionId
        });
        logger.warn('storage_remove_activity_not_found', { activityId, transactionId });
        return res.status(404).json({ message: 'Activity not found' });
      }
      const validation = validateActivities(filtered);
      if (!validation.valid) {
        await client.query('ROLLBACK').catch(() => {});
        logActivitySubmissionSafe({
          pool: getPool(),
          username,
          action: 'remove',
          outcome: 'validation_failed',
          payload: payloadRemove(activityId),
          activityCount: 0,
          transactionId
        });
        return res.status(400).json({ message: validation.error });
      }
      await archiveCurrentValue(client, 'activities');
      const newSerialized = JSON.stringify(filtered);
      const { rows } = await client.query(
        `INSERT INTO storage (key, value, updated_at) VALUES ('activities', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW()
         RETURNING updated_at;`,
        [newSerialized]
      );
      await client.query('COMMIT');
      invalidateStorageReadCache('activities');
      dualWriteAfterStorageWrite(getPool(), 'activities', filtered).catch(() => {});
      const updatedAt = rows[0] && rows[0].updated_at ? new Date(rows[0].updated_at).toISOString() : new Date().toISOString();
      logActivitySubmissionSafe({
        pool: getPool(),
        username,
        action: 'remove',
        outcome: 'success',
        payload: payloadRemove(activityId),
        activityCount: 0,
        transactionId,
        storageUpdatedAt: updatedAt
      });
      logger.info('storage_remove_activity', { activityId, transactionId });
      return res.status(200).json({ ok: true, key: 'activities', updated_at: updatedAt });
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('storage_remove_activity_failed', { message: error.message, transactionId: req.transactionId });
    return res.status(500).json({ message: 'Failed to remove activity' });
  }
});

router.get('/:key', async (req, res) => {
  try {
    const storageKey = req.params.key;
    let row = await getValueWithVersion(storageKey);
    if (storageKey === 'accounts') {
      const healed = await maybeSelfHealAccountsStorageRow(row, req.transactionId);
      if (healed) {
        res.json({
          key: storageKey,
          value: healed.value,
          updated_at: healed.updated_at
        });
        return;
      }
    }
    if (!row) {
      if (OPTIONAL_STORAGE_KEYS.has(storageKey)) {
        res.status(200).json({ key: storageKey, value: null, updated_at: null });
        return;
      }
      const username = req.get('X-Admin-User') || req.get('x-admin-user') || null;
      logger.warn('storage_get_404', {
        key: storageKey,
        transactionId: req.transactionId,
        username: username || 'unknown'
      });
      res.status(404).json({ message: 'Key not found' });
      return;
    }
    const value = maybeDecompressValue(row.value);
    res.json({
      key: storageKey,
      value,
      updated_at: row.updated_at
    });
  } catch (error) {
    logger.error('storage_read_failed', {
      message: error.message,
      transactionId: req.transactionId,
      key: req.params.key
    });
    res.status(500).json({ message: 'Failed to read key' });
  }
});

router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body || {};
    if (value === undefined) {
      res.status(400).json({ message: 'Value is required' });
      return;
    }

    let serializedValue =
      value === null || value === undefined ? '' : String(value);

    if (isActivityStorageKey(req.params.key)) {
      const current = await getValueWithVersion(req.params.key);
      serializedValue = mergeActivitiesPayload(current ? current.value : null, serializedValue);
    }

    const validation = parseAndValidate(req.params.key, serializedValue);
    if (!validation.valid) {
      logger.warn('storage_validation_failed', { key: req.params.key, error: validation.error, transactionId: req.transactionId });
      if (storageKeyLogsActivitySubmission(req.params.key)) {
        const payload = parseActivityPayloadForLog(serializedValue);
        logActivitySubmissionSafe({
          pool: getPool(),
          username: req.get('X-Admin-User') || req.get('x-admin-user') || null,
          action: 'put',
          outcome: 'validation_failed',
          payload: payload || [],
          activityCount: Array.isArray(payload) ? payload.length : 0,
          transactionId: req.transactionId
        });
      }
      return res.status(400).json({ message: validation.error || 'Validation failed' });
    }

    // Catastrophic-shrink guard for critical keys.
    // - 2026-04-15: storage.accounts overwritten with [] (full wipe)
    // - 2026-05-06: storage.accounts overwritten with 9 entries vs 1789 prior (>99% drop)
    // Both should never happen via normal app flows; both did. For these keys we now
    // refuse:
    //   (a) replacing a non-empty array with an empty one, OR
    //   (b) shrinking an array of >= 50 entries down to less than 10% of its length.
    // Pass ?allowShrink=true (or ?allowEmpty=true for the legacy name) to override
    // when the wipe/shrink is genuinely intentional.
    const PROTECTED_FROM_CATASTROPHIC_SHRINK = new Set([
      'accounts',
      'users',
      'internalActivities'
    ]);
    if (PROTECTED_FROM_CATASTROPHIC_SHRINK.has(req.params.key)) {
      const overrideShrink =
        String(req.query.allowShrink || '').toLowerCase() === 'true' ||
        String(req.query.allowEmpty || '').toLowerCase() === 'true';
      let incomingArr = null;
      try {
        // Browser remoteStorage compresses with __lz__/__gz__ before PUT — without decompression
        // here, JSON.parse on an "__lz__..." string throws and the guard silently bypasses.
        // Root cause of 2026-05-07 09:27:59 wipe: incoming was [] (parsed fine) but current was lz
        // and the OLD code's JSON.parse on lz threw, leaving currentArr=null → guard skipped.
        const incomingForParse =
          typeof serializedValue === 'string' ? maybeDecompressValue(serializedValue) : serializedValue;
        const parsedIncoming = JSON.parse(incomingForParse);
        if (Array.isArray(parsedIncoming)) incomingArr = parsedIncoming;
      } catch (_) { /* non-array payload; do not block */ }
      if (incomingArr != null && !overrideShrink) {
        const cur = await getValueWithVersion(req.params.key);
        let currentArr = null;
        try {
          const currentDecoded =
            cur && cur.value != null
              ? (typeof cur.value === 'string' ? maybeDecompressValue(cur.value) : cur.value)
              : null;
          const parsedCurrent = currentDecoded != null ? JSON.parse(currentDecoded) : null;
          if (Array.isArray(parsedCurrent)) currentArr = parsedCurrent;
        } catch (_) { /* unparseable current; skip the guard rather than over-block */ }
        if (currentArr != null) {
          const curLen = currentArr.length;
          const newLen = incomingArr.length;
          const isEmptyOverwrite = curLen > 0 && newLen === 0;
          // Only trip the proportional rule when the existing list is non-trivial.
          // Below 50 entries the noise floor is too high (legit re-saves can land here).
          const isCatastrophicShrink = curLen >= 50 && newLen < Math.ceil(curLen * 0.1);
          if (isEmptyOverwrite || isCatastrophicShrink) {
            logger.warn('storage_catastrophic_shrink_blocked', {
              key: req.params.key,
              currentLength: curLen,
              incomingLength: newLen,
              kind: isEmptyOverwrite ? 'empty_overwrite' : 'shrink_below_10_percent',
              transactionId: req.transactionId,
              username: req.get('X-Admin-User') || req.get('x-admin-user') || null,
              remoteAddress: req.ip
            });
            return res.status(409).json({
              message: `Refusing to shrink ${req.params.key} from ${curLen} to ${newLen} entries (>=90% drop). Pass ?allowShrink=true if intentional.`,
              code: isEmptyOverwrite ? 'EMPTY_OVERWRITE_BLOCKED' : 'CATASTROPHIC_SHRINK_BLOCKED',
              currentLength: curLen,
              incomingLength: newLen
            });
          }
        }
      }
    }

    const ifMatch = req.get('If-Match') || req.get('if-match');
    if (isActivityStorageKey(req.params.key) && (ifMatch === undefined || ifMatch === null || ifMatch === '')) {
      const payload = parseActivityPayloadForLog(serializedValue);
      logActivitySubmissionSafe({
        pool: getPool(),
        username: req.get('X-Admin-User') || req.get('x-admin-user') || null,
        action: 'put',
        outcome: 'if_match_required',
        payload: payload || [],
        activityCount: Array.isArray(payload) ? payload.length : 0,
        transactionId: req.transactionId
      });
      return res.status(400).json({
        message: 'If-Match required for activities to prevent data loss. Refresh the page and try again.'
      });
    }
    const rawClientMutationId = req.get('X-Client-Mutation-Id') || req.get('x-client-mutation-id');
    const clientMutationId = rawClientMutationId ? normalizeMutationId(rawClientMutationId) : null;
    if (rawClientMutationId && !clientMutationId) {
      return res.status(400).json({
        message: `Invalid X-Client-Mutation-Id (max ${CLIENT_MUTATION_ID_MAX_LENGTH} chars)`
      });
    }

    if (clientMutationId) {
      const username = req.get('X-Admin-User') || req.get('x-admin-user') || null;
      const client = await getPool().connect();
      try {
        await client.query('BEGIN');
        const mutationState = await lockClientMutation(client, clientMutationId, req.params.key);
        if (mutationState.conflict) {
          await client.query('ROLLBACK');
          if (storageKeyLogsActivitySubmission(req.params.key)) {
            const payload = parseActivityPayloadForLog(serializedValue);
            logActivitySubmissionSafe({
              pool: getPool(),
              username,
              action: 'put',
              outcome: 'mutation_conflict',
              payload: payload || [],
              activityCount: Array.isArray(payload) ? payload.length : 0,
              transactionId: req.transactionId
            });
          }
          logger.warn('storage_mutation_conflict', {
            key: req.params.key,
            mutationId: clientMutationId,
            transactionId: req.transactionId,
            message: 'Mutation id already used for a different key'
          });
          return res.status(409).json({
            message: 'Conflict: mutation id already used for another key'
          });
        }
        if (mutationState.replay) {
          await client.query('COMMIT');
          logger.info('storage_mutation_replay', {
            key: req.params.key,
            mutationId: clientMutationId,
            transactionId: req.transactionId
          });
          return res.status(200).json({
            key: req.params.key,
            updated_at: mutationState.updated_at,
            replayed: true
          });
        }

        if (ifMatch !== undefined && ifMatch !== '') {
          const result = await setValueIfMatch(
            req.params.key,
            serializedValue,
            ifMatch,
            client
          );
          if (result.conflict) {
            await client.query('ROLLBACK');
            const incomingCount = extractPayloadCount(req.params.key, serializedValue);
            const currentCount = extractPayloadCount(req.params.key, result.value);
            logger.warn('storage_conflict', {
              key: req.params.key,
              username: username || 'unknown',
              transactionId: req.transactionId,
              ifMatch: ifMatch || null,
              currentUpdatedAt: result.updated_at || null,
              incomingCount: incomingCount != null ? incomingCount : undefined,
              currentCount: currentCount != null ? currentCount : undefined,
              mutationId: clientMutationId,
              message: 'Key was updated by another request; client should merge and retry'
            });
            try {
              await savePendingDraft(req.params.key, serializedValue, 'conflict', username);
            } catch (_) {}
            const conflictValue = result.value != null ? maybeDecompressValue(result.value) : null;
            if (storageKeyLogsActivitySubmission(req.params.key)) {
              const payload = parseActivityPayloadForLog(serializedValue);
              logActivitySubmissionSafe({
                pool: getPool(),
                username,
                action: 'put',
                outcome: 'conflict',
                payload: payload || [],
                activityCount: Array.isArray(payload) ? payload.length : 0,
                transactionId: req.transactionId
              });
            }
            return res.status(409).json({
              message: 'Conflict: key was updated by another request',
              value: conflictValue,
              updated_at: result.updated_at
            });
          }
          await completeClientMutation(client, clientMutationId, result.updated_at);
          await client.query('COMMIT');
          logStorageWrite(req.params.key, serializedValue, true, req.transactionId, username);
          triggerDualWrite(req.params.key, serializedValue);
          if (storageKeyLogsActivitySubmission(req.params.key)) {
            const payload = parseActivityPayloadForLog(serializedValue);
            logActivitySubmissionSafe({
              pool: getPool(),
              username,
              action: 'put',
              outcome: 'success',
              payload: payload || [],
              activityCount: Array.isArray(payload) ? payload.length : 0,
              transactionId: req.transactionId,
              storageUpdatedAt: result.updated_at
            });
          }
          return res.status(200).json({
            key: req.params.key,
            updated_at: result.updated_at
          });
        }

        const setResult = await setValue(req.params.key, serializedValue, client);
        await completeClientMutation(client, clientMutationId, setResult.updated_at);
        await client.query('COMMIT');
        logStorageWrite(req.params.key, serializedValue, false, req.transactionId, username);
        triggerDualWrite(req.params.key, serializedValue);
        if (storageKeyLogsActivitySubmission(req.params.key)) {
          const payload = parseActivityPayloadForLog(serializedValue);
          logActivitySubmissionSafe({
            pool: getPool(),
            username,
            action: 'put',
            outcome: 'success',
            payload: payload || [],
            activityCount: Array.isArray(payload) ? payload.length : 0,
            transactionId: req.transactionId,
            storageUpdatedAt: setResult.updated_at
          });
        }
        return res.status(200).json({
          key: req.params.key,
          updated_at: setResult.updated_at
        });
      } catch (mutationErr) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {
          // Best effort rollback for failed mutation transaction.
        }
        throw mutationErr;
      } finally {
        client.release();
      }
    }

    if (ifMatch !== undefined && ifMatch !== '') {
      const result = await setValueIfMatch(
        req.params.key,
        serializedValue,
        ifMatch
      );
      if (result.conflict) {
        const username = req.get('X-Admin-User') || req.get('x-admin-user') || null;
        const incomingCount = extractPayloadCount(req.params.key, serializedValue);
        const currentCount = extractPayloadCount(req.params.key, result.value);
        logger.warn('storage_conflict', {
          key: req.params.key,
          username: username || 'unknown',
          transactionId: req.transactionId,
          ifMatch: ifMatch || null,
          currentUpdatedAt: result.updated_at || null,
          incomingCount: incomingCount != null ? incomingCount : undefined,
          currentCount: currentCount != null ? currentCount : undefined,
          message: 'Key was updated by another request; client should merge and retry'
        });
        try {
          await savePendingDraft(req.params.key, serializedValue, 'conflict', username);
        } catch (_) {}
        const conflictValue = result.value != null ? maybeDecompressValue(result.value) : null;
        if (storageKeyLogsActivitySubmission(req.params.key)) {
          const payload = parseActivityPayloadForLog(serializedValue);
          logActivitySubmissionSafe({
            pool: getPool(),
            username,
            action: 'put',
            outcome: 'conflict',
            payload: payload || [],
            activityCount: Array.isArray(payload) ? payload.length : 0,
            transactionId: req.transactionId
          });
        }
        return res.status(409).json({
          message: 'Conflict: key was updated by another request',
          value: conflictValue,
          updated_at: result.updated_at
        });
      }
      const username = req.get('X-Admin-User') || req.get('x-admin-user');
      logStorageWrite(req.params.key, serializedValue, true, req.transactionId, username);
      triggerDualWrite(req.params.key, serializedValue);
      if (storageKeyLogsActivitySubmission(req.params.key)) {
        const payload = parseActivityPayloadForLog(serializedValue);
        logActivitySubmissionSafe({
          pool: getPool(),
          username,
          action: 'put',
          outcome: 'success',
          payload: payload || [],
          activityCount: Array.isArray(payload) ? payload.length : 0,
          transactionId: req.transactionId,
          storageUpdatedAt: result.updated_at
        });
      }
      return res.status(200).json({
        key: req.params.key,
        updated_at: result.updated_at
      });
    }

    const setResult = await setValue(req.params.key, serializedValue);
    const username = req.get('X-Admin-User') || req.get('x-admin-user');
    logStorageWrite(req.params.key, serializedValue, false, req.transactionId, username);
    triggerDualWrite(req.params.key, serializedValue);
    if (storageKeyLogsActivitySubmission(req.params.key)) {
      const payload = parseActivityPayloadForLog(serializedValue);
      logActivitySubmissionSafe({
        pool: getPool(),
        username,
        action: 'put',
        outcome: 'success',
        payload: payload || [],
        activityCount: Array.isArray(payload) ? payload.length : 0,
        transactionId: req.transactionId,
        storageUpdatedAt: setResult.updated_at
      });
    }
    return res.status(200).json({
      key: req.params.key,
      updated_at: setResult.updated_at
    });
  } catch (error) {
    logger.error('storage_write_failed', {
      message: error.message,
      transactionId: req.transactionId,
      key: req.params.key
    });
    if (storageKeyLogsActivitySubmission(req.params.key)) {
      let payload = null;
      try {
        const raw = req.body?.value;
        if (raw != null) payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch (_) {}
      logActivitySubmissionSafe({
        pool: getPool(),
        username: req.get('X-Admin-User') || req.get('x-admin-user') || null,
        action: 'put',
        outcome: 'error',
        payload: Array.isArray(payload) ? payload : (payload ? [payload] : []),
        activityCount: Array.isArray(payload) ? payload.length : 0,
        transactionId: req.transactionId
      });
    }
    res.status(500).json({ message: 'Failed to save key' });
  }
});

/** Migration keys are protected until data retention is done. Do not delete via API. */
const isMigrationKey = (key) => typeof key === 'string' && /^migration_/.test(key);

router.delete('/:key', async (req, res) => {
  try {
    if (isMigrationKey(req.params.key)) {
      return res.status(403).json({
        message: 'Migration storage keys are protected until data retention is complete. Do not delete.'
      });
    }
    await deleteValue(req.params.key);
    res.status(204).send();
  } catch (error) {
    logger.error('storage_delete_failed', {
      message: error.message,
      transactionId: req.transactionId,
      key: req.params.key
    });
    res.status(500).json({ message: 'Failed to remove key' });
  }
});

router.delete('/', async (req, res) => {
  try {
    const keys = await listKeys();
    const hasMigration = keys.some((k) => isMigrationKey(k));
    if (hasMigration) {
      return res.status(403).json({
        message: 'Storage cannot be cleared while migration keys exist. Retain or export migrated data first, then remove migration_* keys manually if needed.'
      });
    }
    await clearAll();
    res.status(204).send();
  } catch (error) {
    logger.error('storage_clear_failed', {
      message: error.message,
      transactionId: req.transactionId
    });
    res.status(500).json({ message: 'Failed to clear storage' });
  }
});

router.invalidateStorageReadCache = invalidateStorageReadCache;

module.exports = router;

