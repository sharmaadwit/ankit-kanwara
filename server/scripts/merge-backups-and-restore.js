#!/usr/bin/env node
/**
 * Merge multiple storage backups into one "most complete" snapshot and optionally push to remote.
 * Use when Jan/Feb (or other months) were lost: merges activities from all backups (newer wins per id).
 *
 * Usage:
 *   node server/scripts/merge-backups-and-restore.js [--dry-run] [--push]
 *   MERGE_BACKUP_DIR=backups node server/scripts/merge-backups-and-restore.js --push
 *
 * Reads: backups/storage-snapshot-*.json and backups/pre-deploy-*.json (excludes manifest/local-insurance).
 * Writes: backups/merged-for-restore-YYYY-MM-DDTHHMMSS.json
 * If --push: then runs restore to REMOTE_STORAGE_BASE (set env).
 * Auth: set REMOTE_STORAGE_USER (admin email) or REMOTE_STORAGE_API_KEY so restore can PUT.
 */

const fs = require('fs');
const path = require('path');

try {
    const dotenv = require('dotenv');
    const projectRoot = path.join(__dirname, '..', '..');
    dotenv.config({ path: path.join(projectRoot, '.env') });
} catch (_) {}

const MANIFEST_KEY = '__shard_manifest:activities__';
const ACTIVITY_BUCKET_PREFIX = 'activities:';
const BACKUPS_DIR = path.resolve(process.cwd(), process.env.MERGE_BACKUP_DIR || 'backups');

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

/** From a snapshot data object, return array of all activities (from sharded or legacy). */
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

/** Merge arrays of entities by id; newer updatedAt/createdAt wins. */
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

/** Build month bucket key from activity. */
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

/** Build sharded activities from merged list: { manifest, buckets: { 'activities:2026-01': [...], ... } }. */
function buildShardedActivities(activities) {
    const buckets = new Map();
    for (const a of activities) {
        const key = bucketKey(a);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(a);
    }
    const bucketKeys = Array.from(buckets.keys()).sort((a, b) => b.localeCompare(a));
    const manifest = {
        version: Date.now(),
        buckets: bucketKeys
    };
    const bucketData = {};
    for (const [k, arr] of buckets) {
        bucketData[k] = arr;
    }
    return { manifest, bucketData };
}

function listBackupFiles() {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    const files = fs.readdirSync(BACKUPS_DIR);
    const out = [];
    const mergeDays = parseInt(process.env.MERGE_DAYS || '0', 10) || 0;
    const cutoffMs = mergeDays > 0 ? Date.now() - mergeDays * 24 * 60 * 60 * 1000 : 0;
    for (const f of files) {
        if (!f.endsWith('.json')) continue;
        if (f.includes('manifest') || f.startsWith('local-insurance')) continue;
        if (f.startsWith('storage-snapshot-') || f.startsWith('pre-deploy-')) {
            const full = path.join(BACKUPS_DIR, f);
            const stat = fs.statSync(full);
            if (mergeDays > 0 && stat.mtimeMs < cutoffMs) continue;
            out.push({ name: f, path: full, mtime: stat.mtimeMs });
        }
    }
    out.sort((a, b) => b.mtime - a.mtime);
    return out;
}

function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const doPush = args.includes('--push');

    console.log('Merge backups: reading from', BACKUPS_DIR);
    const backupFiles = listBackupFiles();
    if (!backupFiles.length) {
        console.error('No backup files found (storage-snapshot-*.json or pre-deploy-*.json).');
        process.exit(1);
    }
    console.log('Found', backupFiles.length, 'backup files.');

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
        if (activities.length) {
            allActivities.push(activities);
            console.log('  ', name, '->', activities.length, 'activities');
        }

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
        source: 'merge-backups-and-restore',
        totalKeys: 0,
        data: {}
    };

    const SHARD_POINTER = '__shards__:activities';
    merged.data[MANIFEST_KEY] = manifest;
    for (const [k, arr] of Object.entries(bucketData)) {
        merged.data[k] = arr;
    }
    merged.data.activities = SHARD_POINTER;
    if (mergedAccounts.length) merged.data.accounts = mergedAccounts;
    if (mergedInternal.length) merged.data.internalActivities = mergedInternal;

    const keysFromFallback = fallbackData ? Object.keys(fallbackData) : [];
    const skipKeys = new Set([MANIFEST_KEY, 'activities', ...Object.keys(bucketData)]);
    for (const key of keysFromFallback) {
        if (skipKeys.has(key)) continue;
        if (key.startsWith(ACTIVITY_BUCKET_PREFIX)) continue;
        if (merged.data[key] !== undefined) continue;
        const val = fallbackData[key];
        if (val !== undefined && !(val && typeof val === 'object' && val.error)) {
            merged.data[key] = val;
        }
    }

    merged.totalKeys = Object.keys(merged.data).length;

    const outName = `merged-for-restore-${new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)}.json`;
    const outPath = path.join(BACKUPS_DIR, outName);
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
    console.log('Wrote', outPath);

    if (dryRun) {
        console.log('Dry run: not pushing.');
        return;
    }
    if (!doPush) {
        console.log('To push to remote, run with --push and set REMOTE_STORAGE_BASE (and auth).');
        return;
    }

    const base = (process.env.REMOTE_STORAGE_BASE || '').trim().replace(/\/+$/, '');
    if (!base) {
        console.error('Set REMOTE_STORAGE_BASE to push (e.g. https://your-app.up.railway.app/api/storage).');
        process.exit(1);
    }

    console.log('Running restore to', base, '...');
    process.env.SNAPSHOT_FILE = outPath;
    const restorePath = path.join(__dirname, 'restore-storage-from-snapshot.js');
    const child = require('child_process').spawnSync(
        process.execPath,
        [restorePath],
        {
            env: { ...process.env, SNAPSHOT_FILE: outPath },
            stdio: 'inherit',
            cwd: process.cwd()
        }
    );
    if (child.status !== 0) {
        process.exit(child.status || 1);
    }
    console.log('Done. Reload the app to see restored data.');
}

main();
