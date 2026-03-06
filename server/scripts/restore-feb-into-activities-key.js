#!/usr/bin/env node
/**
 * Restore Feb 2026 into the MAIN "activities" key (the one the app actually reads).
 * The app does GET "activities" and uses that value. We were restoring activities:2026-02
 * but if the server uses legacy (one big array in "activities"), the app never reads shards.
 * This script: GET current "activities" from server, merge in 145 Feb from backups, PUT back.
 *
 * Run: node server/scripts/restore-feb-into-activities-key.js
 * Env: REMOTE_STORAGE_BASE, REMOTE_STORAGE_USER
 */

const fs = require('fs');
const path = require('path');

try {
    require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
} catch (_) {}

const BACKUPS_DIR = path.resolve(process.env.MERGE_BACKUP_DIR || path.join(__dirname, '..', '..', 'backups'));
const ACTIVITIES_KEY = 'activities';
const FEB_KEY = 'activities:2026-02';

function isFeb2026(activity) {
    if (!activity) return false;
    const month = (activity.monthOfActivity || '').toString().trim();
    if (/^2026-02$/.test(month)) return true;
    const dateStr = (activity.date || activity.createdAt || '').toString().trim();
    return dateStr.length >= 7 && dateStr.slice(0, 7) === '2026-02';
}

function getTimestamp(item) {
    if (!item) return '';
    const t = item.updatedAt || item.createdAt;
    return t ? String(t) : '';
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

function getFeb2026FromSnapshot(data) {
    if (!data || typeof data !== 'object') return [];
    const out = [];
    if (Array.isArray(data[FEB_KEY])) out.push(...data[FEB_KEY]);
    const legacy = data.activities;
    const legacyArr = Array.isArray(legacy) ? legacy : (typeof legacy === 'string' ? (() => { try { return JSON.parse(legacy); } catch (_) { return []; } })() : []);
    if (legacyArr && legacyArr.length) {
        for (const a of legacyArr) {
            if (isFeb2026(a)) out.push(a);
        }
    }
    for (const key of Object.keys(data)) {
        if (key.startsWith('activities:') && key !== 'activities' && Array.isArray(data[key])) {
            for (const a of data[key]) {
                if (isFeb2026(a)) out.push(a);
            }
        }
    }
    return out;
}

function listBackupFiles() {
    if (!fs.existsSync(BACKUPS_DIR)) return [];
    return fs.readdirSync(BACKUPS_DIR)
        .filter((f) => f.endsWith('.json') && (f.startsWith('storage-snapshot-') || f.startsWith('pre-deploy-')) && !f.includes('manifest') && !f.startsWith('local-insurance'))
        .map((f) => path.join(BACKUPS_DIR, f))
        .sort((a, b) => (fs.statSync(b).mtimeMs || 0) - (fs.statSync(a).mtimeMs || 0));
}

async function getCurrentActivities(base, headers) {
    const fetchImpl = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default;
    const url = `${base.replace(/\/$/, '')}/${encodeURIComponent(ACTIVITIES_KEY)}`;
    const res = await fetchImpl(url, { headers: { Accept: 'application/json', ...headers } });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`GET ${ACTIVITIES_KEY}: ${res.status}`);
    const body = await res.json();
    const value = body && (body.value != null ? body.value : body);
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {}
    }
    return [];
}

async function putActivities(base, array, headers) {
    const fetchImpl = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default;
    const url = `${base.replace(/\/$/, '')}/${encodeURIComponent(ACTIVITIES_KEY)}`;
    const res = await fetchImpl(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
        body: JSON.stringify({ value: JSON.stringify(array) })
    });
    if (res.status !== 204 && res.status !== 200) throw new Error(`PUT ${ACTIVITIES_KEY}: ${res.status} ${res.statusText}`);
}

async function putStorageKey(base, key, array, headers) {
    const fetchImpl = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default;
    const url = `${base.replace(/\/$/, '')}/${encodeURIComponent(key)}`;
    const res = await fetchImpl(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
        body: JSON.stringify({ value: JSON.stringify(array) })
    });
    if (res.status !== 204 && res.status !== 200) throw new Error(`PUT ${key}: ${res.status} ${res.statusText}`);
}

async function main() {
    const base = (process.env.REMOTE_STORAGE_BASE || '').trim().replace(/\/+$/, '');
    if (!base) {
        console.error('Set REMOTE_STORAGE_BASE');
        process.exit(1);
    }
    const headers = {};
    if (process.env.REMOTE_STORAGE_USER) headers['X-Admin-User'] = process.env.REMOTE_STORAGE_USER;
    if (process.env.REMOTE_STORAGE_API_KEY) headers['X-Api-Key'] = process.env.REMOTE_STORAGE_API_KEY;
    if (process.env.STORAGE_API_KEY) headers['X-Api-Key'] = headers['X-Api-Key'] || process.env.STORAGE_API_KEY;

    console.log('Fetching current "' + ACTIVITIES_KEY + '" from server...');
    const current = await getCurrentActivities(base, headers);
    console.log('Current "activities" on server:', current.length, 'items');

    const files = listBackupFiles();
    const allFeb = [];
    for (const filePath of files.slice(0, 50)) {
        try {
            const data = (JSON.parse(fs.readFileSync(filePath, 'utf8'))).data || {};
            const feb = getFeb2026FromSnapshot(data);
            if (feb.length) allFeb.push(feb);
        } catch (_) {}
    }
    const mergedFeb = mergeByIdNewerWins(allFeb);
    console.log('Merged Feb 2026 from backups:', mergedFeb.length, 'unique');

    const merged = mergeByIdNewerWins([current, mergedFeb]);
    const febInMerged = merged.filter(isFeb2026);
    console.log('After merge: total', merged.length, ', Feb 2026 in merged:', febInMerged.length);

    await putActivities(base, merged, headers);
    console.log('PUT', merged.length, 'activities to "' + ACTIVITIES_KEY + '".');
    await putStorageKey(base, FEB_KEY, febInMerged, headers);
    console.log('PUT', febInMerged.length, 'activities to "' + FEB_KEY + '" (shard for entities API).');
    console.log('Done. Hard-refresh the app (Ctrl+Shift+R).');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
