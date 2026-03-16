#!/usr/bin/env node
/**
 * One-time purge: merge all existing backups into one archive file, then keep only
 * the latest backup (storage-snapshot-latest.json). Use to reduce repo size.
 *
 * 1. Merges all storage-snapshot-*.json and pre-deploy-*.json (excludes manifest/local-insurance)
 *    into one snapshot (activities/accounts/internalActivities by id, newer wins).
 * 2. Writes merged snapshot to backups/archive/merged-archive-YYYY-MM-DD.json.
 * 3. Keeps the single newest backup as backups/storage-snapshot-latest.json and deletes all others.
 *
 * Usage (from project root):
 *   node server/scripts/purge-and-archive-backups.js
 *   node server/scripts/purge-and-archive-backups.js --dry-run
 *
 * Run from Project PAT so backups/ is ./backups. Archive folder: backups/archive/
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_KEY = '__shard_manifest:activities__';
const ACTIVITY_BUCKET_PREFIX = 'activities:';
const BACKUPS_DIR = path.resolve(process.cwd(), process.env.BACKUPS_DIR || 'backups');
const ARCHIVE_DIR = path.join(BACKUPS_DIR, 'archive');

const getTimestamp = (item) => {
  if (!item || typeof item !== 'object') return '';
  const t = item.updatedAt || item.createdAt;
  return t ? String(t) : '';
};

const parseJson = (val) => {
  if (val == null) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (_) {
      return null;
    }
  }
  return null;
};

function getActivitiesFromSnapshot(data) {
  if (!data || typeof data !== 'object') return [];
  const out = [];
  const manifest = data[MANIFEST_KEY];
  if (manifest && Array.isArray(manifest.buckets)) {
    for (const bucketKey of manifest.buckets) {
      const bucket = data[bucketKey];
      const arr = Array.isArray(bucket) ? bucket : parseJson(bucket);
      if (arr && arr.length) out.push(...arr);
    }
  }
  const legacy = data.activities;
  const legacyArr = Array.isArray(legacy) ? legacy : parseJson(legacy);
  if (legacyArr && legacyArr.length) out.push(...legacyArr);
  for (const key of Object.keys(data)) {
    if (key.startsWith(ACTIVITY_BUCKET_PREFIX) && key !== 'activities') {
      const bucket = data[key];
      const arr = Array.isArray(bucket) ? bucket : parseJson(bucket);
      if (arr && arr.length) out.push(...arr);
    }
  }
  return out;
}

function mergeByIdNewerWins(arrays) {
  const byId = new Map();
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!item || !item.id) continue;
      const existing = byId.get(item.id);
      const itemTs = getTimestamp(item);
      if (!existing) {
        byId.set(item.id, item);
        continue;
      }
      const existingTs = getTimestamp(existing);
      if (itemTs > existingTs) byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}

function bucketKey(activity) {
  const month = (activity && activity.monthOfActivity) || '';
  if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
    return `${ACTIVITY_BUCKET_PREFIX}${month}`;
  }
  const dateStr = (activity && (activity.date || activity.createdAt)) ? String(activity.date || activity.createdAt).trim() : '';
  if (dateStr.length >= 7) {
    return `${ACTIVITY_BUCKET_PREFIX}${dateStr.slice(0, 7)}`;
  }
  return `${ACTIVITY_BUCKET_PREFIX}unknown`;
}

function buildShardedActivities(activities) {
  const buckets = new Map();
  for (const a of activities) {
    const key = bucketKey(a);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(a);
  }
  const bucketKeys = Array.from(buckets.keys()).sort((a, b) => b.localeCompare(a));
  const manifest = { version: Date.now(), buckets: bucketKeys };
  const bucketData = {};
  for (const [k, arr] of buckets) {
    bucketData[k] = arr;
  }
  return { manifest, bucketData };
}

/** List all backup JSON files (no manifest/local-insurance). Sorted newest first. */
function listBackupFiles() {
  if (!fs.existsSync(BACKUPS_DIR)) return [];
  const files = fs.readdirSync(BACKUPS_DIR);
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    if (f.includes('manifest') || f.startsWith('local-insurance')) continue;
    if (f.startsWith('storage-snapshot-') || f.startsWith('pre-deploy-')) {
      const full = path.join(BACKUPS_DIR, f);
      if (!fs.statSync(full).isFile()) continue;
      out.push({ name: f, path: full, mtime: fs.statSync(full).mtimeMs });
    }
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('Dry run – no files will be written or deleted.');
  }

  console.log('Backups dir:', BACKUPS_DIR);
  const backupFiles = listBackupFiles();
  if (!backupFiles.length) {
    console.log('No backup files found. Nothing to purge.');
    process.exit(0);
  }
  console.log('Found', backupFiles.length, 'backup file(s).');

  const allActivities = [];
  const allAccounts = [];
  const allInternal = [];
  let fallbackData = null;

  for (const { name, path: filePath } of backupFiles) {
    let raw;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      console.warn('  Skip', name, e.message);
      continue;
    }
    let snapshot;
    try {
      snapshot = JSON.parse(raw);
    } catch (e) {
      console.warn('  Skip', name, 'invalid JSON');
      continue;
    }
    const data = snapshot.data || snapshot;
    if (!data || typeof data !== 'object') continue;

    const activities = getActivitiesFromSnapshot(data);
    if (activities.length) allActivities.push(activities);

    const accounts = Array.isArray(data.accounts) ? data.accounts : parseJson(data.accounts);
    if (accounts && accounts.length) allAccounts.push(accounts);

    const internal = Array.isArray(data.internalActivities) ? data.internalActivities : parseJson(data.internalActivities);
    if (internal && internal.length) allInternal.push(internal);

    if (!fallbackData) fallbackData = data;
  }

  const mergedActivities = mergeByIdNewerWins(allActivities);
  const mergedAccounts = mergeByIdNewerWins(allAccounts);
  const mergedInternal = mergeByIdNewerWins(allInternal);
  console.log('Merged:', mergedActivities.length, 'activities,', mergedAccounts.length, 'accounts,', mergedInternal.length, 'internalActivities');

  const { manifest, bucketData } = buildShardedActivities(mergedActivities);
  const merged = {
    generatedAt: new Date().toISOString(),
    source: 'purge-and-archive-backups',
    totalKeys: 0,
    data: {}
  };
  merged.data[MANIFEST_KEY] = manifest;
  for (const [k, arr] of Object.entries(bucketData)) {
    merged.data[k] = arr;
  }
  merged.data.activities = '__shards__:activities';
  if (mergedAccounts.length) merged.data.accounts = mergedAccounts;
  if (mergedInternal.length) merged.data.internalActivities = mergedInternal;

  const skipKeys = new Set([MANIFEST_KEY, 'activities', ...Object.keys(bucketData)]);
  if (fallbackData) {
    for (const key of Object.keys(fallbackData)) {
      if (skipKeys.has(key) || key.startsWith(ACTIVITY_BUCKET_PREFIX) || merged.data[key] !== undefined) continue;
      const val = fallbackData[key];
      if (val !== undefined && !(val && typeof val === 'object' && val.error)) {
        merged.data[key] = val;
      }
    }
  }
  merged.totalKeys = Object.keys(merged.data).length;

  const dateStr = new Date().toISOString().slice(0, 10);
  const archiveFileName = `merged-archive-${dateStr}.json`;
  const archivePath = path.join(ARCHIVE_DIR, archiveFileName);

  if (!dryRun) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    fs.writeFileSync(archivePath, JSON.stringify(merged, null, 2), 'utf8');
    console.log('Wrote archive:', archivePath);
  } else {
    console.log('Would write archive:', archivePath);
  }

  const latestPath = path.join(BACKUPS_DIR, 'storage-snapshot-latest.json');
  const newest = backupFiles[0];
  const newestContent = fs.readFileSync(newest.path, 'utf8');

  if (!dryRun) {
    fs.writeFileSync(latestPath, newestContent, 'utf8');
    console.log('Kept latest backup as storage-snapshot-latest.json (from', newest.name, ')');

    let deleted = 0;
    for (const { path: filePath } of backupFiles) {
      if (filePath === latestPath) continue;
      fs.unlinkSync(filePath);
      deleted++;
      console.log('  Deleted:', path.basename(filePath));
    }
    console.log('Deleted', deleted, 'old backup file(s).');
  } else {
    console.log('Would keep', newest.name, 'as storage-snapshot-latest.json and delete', backupFiles.length - 1, 'other file(s).');
  }

  console.log('Done. backups/ now has only storage-snapshot-latest.json; merged archive is in backups/archive/.');
}

main();
