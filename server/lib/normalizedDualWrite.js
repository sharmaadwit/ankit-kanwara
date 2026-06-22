/**
 * D-002: Dual-write from storage to normalized tables (accounts, projects, activities, internal_activities).
 * Called after every successful write to storage for keys: accounts, activities, internalActivities.
 */

const logger = require('../logger');

function safeStringify(value) {
  try {
    return value != null ? JSON.stringify(value) : null;
  } catch (_) {
    return null;
  }
}

function toDateOnly(value) {
  if (value == null) return null;
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function safeNum(v, min, max) {
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  if (min != null && v < min) return null;
  if (max != null && v > max) return null;
  return v;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {Array<object>} arr - Parsed accounts array from storage
 */
async function syncAccounts(client, arr) {
  if (!Array.isArray(arr) || !arr.length) return;
  const now = new Date().toISOString();
  for (const a of arr) {
    if (!a || !a.id) continue;
    const name = (a.name != null ? String(a.name) : '').trim();
    await client.query(
      `INSERT INTO accounts (id, name, industry, region, sales_rep, sales_rep_region, sales_rep_email, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         industry = EXCLUDED.industry,
         region = EXCLUDED.region,
         sales_rep = EXCLUDED.sales_rep,
         sales_rep_region = EXCLUDED.sales_rep_region,
         sales_rep_email = EXCLUDED.sales_rep_email,
         notes = EXCLUDED.notes,
         updated_at = EXCLUDED.updated_at`,
      [
        a.id,
        name || '',
        a.industry != null ? String(a.industry) : null,
        a.region != null ? String(a.region) : null,
        a.salesRep != null ? String(a.salesRep) : null,
        a.salesRepRegion != null ? String(a.salesRepRegion) : null,
        a.salesRepEmail != null ? String(a.salesRepEmail) : null,
        a.notes != null ? String(a.notes) : null,
        now
      ]
    );
    if (Array.isArray(a.projects)) {
      for (const p of a.projects) {
        if (!p || !p.id) continue;
        const projName = (p.name != null ? String(p.name) : '').trim();
        await client.query(
          `INSERT INTO projects (id, account_id, name, sfdc_link, use_cases, products_interested, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET
             account_id = EXCLUDED.account_id,
             name = EXCLUDED.name,
             sfdc_link = EXCLUDED.sfdc_link,
             use_cases = EXCLUDED.use_cases,
             products_interested = EXCLUDED.products_interested,
             updated_at = EXCLUDED.updated_at`,
          [
            p.id,
            a.id,
            projName || '',
            p.sfdcLink != null ? String(p.sfdcLink) : null,
            Array.isArray(p.useCases) ? p.useCases : (Array.isArray(p.use_cases) ? p.use_cases : null),
            Array.isArray(p.products) ? p.products : (Array.isArray(p.products_interested) ? p.products_interested : null),
            now
          ]
        );
      }
    }
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {Array<object>} arr - Parsed activities array from storage
 */
async function syncActivities(client, arr) {
  if (!Array.isArray(arr) || !arr.length) return;
  const now = new Date().toISOString();
  for (const a of arr) {
    if (!a || !a.id) continue;
    const dateVal = a.activityDate ?? a.date ?? a.createdAt ?? a.monthOfActivity;
    const activityDate = toDateOnly(dateVal);
    const activityType = (a.activityType ?? a.type) != null ? String(a.activityType ?? a.type) : null;
    const durationHours = safeNum(a.durationHours, 0, 24);
    const durationDays = safeNum(a.durationDays, 0, 31);
    await client.query(
      `INSERT INTO activities (id, account_id, project_id, activity_date, activity_type, call_type, duration_hours, duration_days, notes, assigned_user_id, account_name, project_name, source, updated_at, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         account_id = EXCLUDED.account_id,
         project_id = EXCLUDED.project_id,
         activity_date = EXCLUDED.activity_date,
         activity_type = EXCLUDED.activity_type,
         call_type = EXCLUDED.call_type,
         duration_hours = EXCLUDED.duration_hours,
         duration_days = EXCLUDED.duration_days,
         notes = EXCLUDED.notes,
         assigned_user_id = EXCLUDED.assigned_user_id,
         account_name = EXCLUDED.account_name,
         project_name = EXCLUDED.project_name,
         source = EXCLUDED.source,
         updated_at = EXCLUDED.updated_at,
         payload = EXCLUDED.payload`,
      [
        a.id,
        a.accountId != null ? String(a.accountId) : null,
        a.projectId != null ? String(a.projectId) : null,
        activityDate,
        activityType,
        a.callType != null ? String(a.callType) : null,
        durationHours,
        durationDays,
        a.notes != null ? String(a.notes) : null,
        (a.assigned_user_id ?? a.userId) != null ? String(a.assigned_user_id ?? a.userId) : null,
        a.accountName != null ? String(a.accountName) : null,
        a.projectName != null ? String(a.projectName) : null,
        a.source != null ? String(a.source) : null,
        now,
        safeStringify(a)
      ]
    );
  }
}

/**
 * @param {import('pg').PoolClient} client
 * @param {Array<object>} arr - Parsed internal activities array from storage
 */
async function syncInternalActivities(client, arr) {
  if (!Array.isArray(arr) || !arr.length) return;
  const now = new Date().toISOString();
  for (const a of arr) {
    if (!a || !a.id) continue;
    const dateVal = a.activityDate ?? a.date ?? a.createdAt;
    const activityDate = toDateOnly(dateVal);
    const activityType = (a.activityType ?? a.type) != null ? String(a.activityType ?? a.type) : null;
    const durationHours = safeNum(a.durationHours, 0, 24);
    const durationDays = safeNum(a.durationDays, 0, 31);
    await client.query(
      `INSERT INTO internal_activities (id, activity_date, activity_type, activity_name, duration_hours, duration_days, notes, assigned_user_id, source, updated_at, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         activity_date = EXCLUDED.activity_date,
         activity_type = EXCLUDED.activity_type,
         activity_name = EXCLUDED.activity_name,
         duration_hours = EXCLUDED.duration_hours,
         duration_days = EXCLUDED.duration_days,
         notes = EXCLUDED.notes,
         assigned_user_id = EXCLUDED.assigned_user_id,
         source = EXCLUDED.source,
         updated_at = EXCLUDED.updated_at,
         payload = EXCLUDED.payload`,
      [
        a.id,
        activityDate,
        activityType,
        (a.activityName ?? a.name) != null ? String(a.activityName ?? a.name) : null,
        durationHours,
        durationDays,
        a.notes != null ? String(a.notes) : null,
        (a.assigned_user_id ?? a.userId) != null ? String(a.assigned_user_id ?? a.userId) : null,
        a.source != null ? String(a.source) : null,
        now,
        safeStringify(a)
      ]
    );
  }
}

/**
 * Dual-write after a successful storage write. Call with the key and the parsed value (array).
 * Use fire-and-forget so storage write latency is not blocked; log errors.
 * @param {import('pg').Pool} pool
 * @param {string} key - Storage key: 'accounts' | 'activities' | 'internalActivities'
 * @param {*} parsedValue - Parsed JSON (array)
 */
async function dualWriteAfterStorageWrite(pool, key, parsedValue) {
  if (String(process.env.NORMALIZED_TABLES_ENABLED || '').toLowerCase() !== 'true') return;
  if (!pool || !key || parsedValue == null) return;
  const k = key === 'activities' || /^activities:\d{4}-\d{2}$/.test(key) ? 'activities' : key;
  if (!['accounts', 'activities', 'internalActivities'].includes(k)) return;
  if (!Array.isArray(parsedValue)) return;
  const client = await pool.connect();
  try {
    if (k === 'accounts') await syncAccounts(client, parsedValue);
    else if (k === 'activities') await syncActivities(client, parsedValue);
    else if (k === 'internalActivities') await syncInternalActivities(client, parsedValue);
  } catch (err) {
    logger.warn('normalized_dual_write_failed', { key: k, message: err.message });
  } finally {
    client.release();
  }
}

module.exports = {
  syncAccounts,
  syncActivities,
  syncInternalActivities,
  dualWriteAfterStorageWrite
};
