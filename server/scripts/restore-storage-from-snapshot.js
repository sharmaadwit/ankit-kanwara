#!/usr/bin/env node
/**
 * Restore storage from a snapshot file (e.g. pre-deploy or backups/storage-snapshot-latest.json).
 * Use when data was lost so you can restore activities (and optionally other keys) from backup.
 *
 * Usage:
 *   REMOTE_STORAGE_BASE=https://your-app.up.railway.app/api/storage node server/scripts/restore-storage-from-snapshot.js path/to/snapshot.json
 *   SNAPSHOT_FILE=backups/pre-deploy-2026-02-04.json node server/scripts/restore-storage-from-snapshot.js
 *
 * Optional: RESTORE_KEYS=activities,accounts,internalActivities (default: all keys from snapshot)
 *   Use RESTORE_KEYS=all or leave unset to restore every key (required for sharded activities).
 * Optional: REMOTE_STORAGE_USER, REMOTE_STORAGE_API_KEY for auth
 */
const fs = require('fs');
const path = require('path');

try {
    const dotenv = require('dotenv');
    const projectRoot = path.join(__dirname, '..', '..');
    dotenv.config({ path: path.join(projectRoot, '.env') });
} catch (_) {}

const normalizeBase = (value) => {
    if (!value) return '';
    let trimmed = String(value).trim();
    while (trimmed.endsWith('/')) trimmed = trimmed.slice(0, -1);
    return trimmed;
};

const buildHeaders = () => {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (process.env.REMOTE_STORAGE_USER) headers['X-Admin-User'] = process.env.REMOTE_STORAGE_USER;
    const apiKey = (process.env.REMOTE_STORAGE_API_KEY || process.env.STORAGE_API_KEY || '').trim();
    if (apiKey) headers['X-Api-Key'] = apiKey;
    return headers;
};

const putValue = async (base, key, value, fetchImpl, headers) => {
    const url = `${base}/${encodeURIComponent(key)}`;
    const res = await fetchImpl(url, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ value: typeof value === 'string' ? value : JSON.stringify(value) })
    });
    if (res.status !== 204 && res.status !== 200) {
        throw new Error(`${res.status} ${res.statusText}`);
    }
};

const main = async () => {
    const arg1 = process.argv[2];
    const arg2 = process.argv[3];
    const base = normalizeBase(process.env.REMOTE_STORAGE_BASE) || (arg1 && !arg1.endsWith('.json') ? normalizeBase(arg1) : '');
    const snapshotPath = process.env.SNAPSHOT_FILE || (arg1 && arg1.endsWith('.json') ? path.resolve(process.cwd(), arg1) : arg2 ? path.resolve(process.cwd(), arg2) : arg1 ? path.resolve(process.cwd(), arg1) : '');

    if (!base) {
        console.error('Set REMOTE_STORAGE_BASE (e.g. https://your-app.up.railway.app/api/storage) or pass as first argument.');
        process.exit(1);
    }
    if (!snapshotPath || !fs.existsSync(snapshotPath)) {
        console.error('Provide a snapshot file path (SNAPSHOT_FILE or argument, e.g. backups/storage-snapshot-latest.json). File must exist.');
        process.exit(1);
    }

    const raw = fs.readFileSync(snapshotPath, 'utf8');
    const snapshot = JSON.parse(raw);
    const data = snapshot.data || snapshot;
    const rawRestoreKeys = (process.env.RESTORE_KEYS || 'all').trim();
    const keysToRestore =
        rawRestoreKeys.toLowerCase() === 'all' || rawRestoreKeys === '*'
            ? Object.keys(data).filter((k) => !(data[k] && typeof data[k] === 'object' && data[k].error))
            : rawRestoreKeys.split(',').map((k) => k.trim()).filter(Boolean);

    const fetchImpl = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default;
    const headers = buildHeaders();

    console.log(`Restoring from ${snapshotPath} to ${base} (${keysToRestore.length} keys)`);
    for (const key of keysToRestore) {
        const value = data[key];
        if (value === undefined) {
            console.warn(`  ⚠ ${key} not in snapshot, skip`);
            continue;
        }
        if (value && typeof value === 'object' && value.error) {
            console.warn(`  ⚠ ${key} had error in snapshot: ${value.error}, skip`);
            continue;
        }
        const payload = typeof value === 'string' ? value : JSON.stringify(value);
        try {
            await putValue(base, key, payload, fetchImpl, headers);
            const size = Array.isArray(value) ? value.length : (typeof value === 'object' ? Object.keys(value).length : 0);
            console.log(`  ✓ ${key} (${size || payload.length} chars)`);
        } catch (err) {
            console.error(`  ✗ ${key}: ${err.message}`);
        }
    }
    console.log('Done. Reload the app to see restored data.');
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
