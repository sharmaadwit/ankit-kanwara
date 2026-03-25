/**
 * Merge duplicate accounts (same normalized name).
 *
 * Usage:
 *   1. Dry run (default): finds duplicates and writes merge-plan.json.
 *      node server/scripts/merge-duplicate-accounts.js
 *   2. Dry run from backup (no DB): use a storage snapshot file.
 *      node server/scripts/merge-duplicate-accounts.js --from-file=backups/storage-snapshot-YYYY-MM-DD.json
 *   3. Edit merge-plan.json if you want to change which account to keep (keepAccountId).
 *   4. Apply: perform the merges using the plan (requires DB).
 *      node server/scripts/merge-duplicate-accounts.js --apply
 *
 * Plan file: merge-plan.json in project root (or set MERGE_PLAN_PATH).
 * If you get "Connection timeout": the DB may be unreachable from your machine (e.g. Railway).
 * Set PGPOOL_CONNECTION_TIMEOUT_MS=20000 and ensure DATABASE_URL is correct, or use --from-file
 * with a snapshot (npm run backup) to generate the plan without DB; then run --apply where the DB is reachable.
 */

const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

const { getPool } = require('../db');

const GZIP_PREFIX = '__gz__';

function maybeDecompress(value) {
  if (typeof value !== 'string') return value;
  if (!value.startsWith(GZIP_PREFIX)) return value;
  try {
    const compressed = Buffer.from(value.slice(GZIP_PREFIX.length), 'base64');
    return zlib.gunzipSync(compressed).toString('utf8');
  } catch (_) {
    return value;
  }
}

function normalizeAccountName(name) {
  return (name || '').toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

function getDuplicateGroups(accounts) {
  if (!Array.isArray(accounts) || !accounts.length) return [];
  const byKey = new Map();
  accounts.forEach((acc) => {
    if (!acc || !acc.id) return;
    const key = normalizeAccountName(acc.name);
    if (!key) return;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(acc);
  });
  return Array.from(byKey.entries())
    .filter(([, list]) => list.length > 1)
    .map(([normalizedName, list]) => ({ normalizedName, accounts: list }));
}

function getPlanPath() {
  return process.env.MERGE_PLAN_PATH || path.resolve(process.cwd(), 'merge-plan.json');
}

async function loadStorage(key) {
  const pool = getPool();
  const { rows } = await pool.query('SELECT value FROM storage WHERE key = $1', [key]);
  if (!rows.length) return null;
  const raw = rows[0].value;
  const str = maybeDecompress(raw);
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}

async function saveStorage(key, value) {
  const pool = getPool();
  const serialized = JSON.stringify(value);
  await pool.query(
    `INSERT INTO storage (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
    [key, serialized]
  );
}

function getFromFileArg() {
  const arg = process.argv.find((a) => a.startsWith('--from-file='));
  return arg ? arg.slice('--from-file='.length).trim() : null;
}

async function run() {
  const apply = process.argv.includes('--apply');
  const fromFile = getFromFileArg();
  const planPath = getPlanPath();

  let accounts;
  let activities;

  if (fromFile) {
    if (apply) {
      console.error('--from-file is only for dry run. Use DB for --apply.');
      process.exit(1);
    }
    const resolved = path.resolve(process.cwd(), fromFile);
    if (!fs.existsSync(resolved)) {
      console.error('File not found:', resolved);
      process.exit(1);
    }
    const snapshot = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    const data = snapshot.data || snapshot;
    accounts = data.accounts != null ? data.accounts : null;
    activities = data.activities != null ? data.activities : null;
    if (!Array.isArray(accounts)) {
      console.error('Snapshot must contain data.accounts (array). Found:', typeof accounts);
      process.exit(1);
    }
    if (!Array.isArray(activities)) activities = [];
  } else {
    accounts = await loadStorage('accounts');
    activities = await loadStorage('activities');
  }

  if (!Array.isArray(accounts) || !accounts.length) {
    console.log('No accounts in storage. Nothing to do.');
    process.exit(0);
  }

  const groups = getDuplicateGroups(accounts);
  if (!groups.length) {
    console.log('No duplicate account groups found.');
    process.exit(0);
  }

  // Build default plan: keep first account in each group (by id order), merge rest
  const defaultPlan = {
    groups: groups.map(({ normalizedName, accounts: list }) => {
      const sorted = [...list].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
      const keep = sorted[0];
      const mergeIds = sorted.slice(1).map((a) => a.id);
      return { normalizedName, keepAccountId: keep.id, mergeAccountIds: mergeIds };
    })
  };

  if (!apply) {
    fs.writeFileSync(planPath, JSON.stringify(defaultPlan, null, 2), 'utf8');
    console.log('Duplicate groups found:', groups.length);
    console.log('Wrote plan to:', planPath);
    console.log('Edit keepAccountId in each group if you want to keep a different account, then run with --apply.');
    defaultPlan.groups.forEach((g) => {
      const ids = [g.keepAccountId, ...(g.mergeAccountIds || [])];
      const names = (accounts.filter((a) => ids.includes(a.id)) || []).map((a) => a.name || a.id);
      console.log('  -', g.normalizedName, '-> keep', g.keepAccountId, ', merge', g.mergeAccountIds.join(', '), '|', names.join('; '));
    });
    process.exit(0);
  }

  // Apply: load plan (or use default)
  let plan = defaultPlan;
  if (fs.existsSync(planPath)) {
    try {
      plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
      if (!Array.isArray(plan.groups)) plan = defaultPlan;
    } catch (e) {
      console.error('Failed to read plan file:', planPath, e.message);
      process.exit(1);
    }
  }

  const activitiesList = Array.isArray(activities) ? activities : [];
  let accountsUpdated = JSON.parse(JSON.stringify(accounts));
  const activityUpdates = new Map();

  for (const g of plan.groups) {
    const keepId = g.keepAccountId;
    const mergeIds = g.mergeAccountIds || [];
    if (!keepId || !mergeIds.length) continue;

    const targetIndex = accountsUpdated.findIndex((a) => a.id === keepId);
    if (targetIndex === -1) {
      console.warn('Skip group', g.normalizedName, ': keep account not found', keepId);
      continue;
    }
    const target = accountsUpdated[targetIndex];

    let mergedProjects = [...(target.projects || [])];
    const toRemove = new Set(mergeIds);

    for (const sourceId of mergeIds) {
      const source = accountsUpdated.find((a) => a.id === sourceId);
      if (!source) continue;

      (source.projects || []).forEach((proj) => {
        const existing = mergedProjects.find((p) => p.name === proj.name);
        if (!existing) mergedProjects.push(proj);
      });

      activitiesList.forEach((act) => {
        if (act.accountId === sourceId) {
          activityUpdates.set(act.id, {
            ...act,
            accountId: keepId,
            accountName: target.name || target.id
          });
        }
      });
    }

    accountsUpdated[targetIndex] = { ...accountsUpdated[targetIndex], projects: mergedProjects };
    accountsUpdated = accountsUpdated.filter((a) => !toRemove.has(a.id));
  }

  const activitiesFinal = activitiesList.map((a) => activityUpdates.get(a.id) || a);

  await saveStorage('accounts', accountsUpdated);
  await saveStorage('activities', activitiesFinal);

  console.log('Merge applied. Accounts:', accounts.length, '->', accountsUpdated.length);
  console.log('Activities updated:', activityUpdates.size);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
