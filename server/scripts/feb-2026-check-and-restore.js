#!/usr/bin/env node
/**
 * February 2026 only: collect from all backups, merge by id, compare with server, restore if needed.
 * Run from project root: node server/scripts/feb-2026-check-and-restore.js [--dry-run] [--restore]
 * Env: REMOTE_STORAGE_BASE, REMOTE_STORAGE_USER (or API key) for fetch/restore.
 */

const fs = require('fs');
const path = require('path');

try {
    require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
} catch (_) {}

const BACKUPS_DIR = path.resolve(process.env.MERGE_BACKUP_DIR || path.join(__dirname, '..', '..', 'backups'));
const FEB_KEY = 'activities:2026-02';
const FEB_MONTH = '2026-02';

function isFeb2026(activity) {
    if (!activity) return false;
    const month = (activity.monthOfActivity || '').toString().trim();
    if (/^2026-02$/.test(month)) return true;
    const dateStr = (activity.date || activity.createdAt || '').toString().trim();
    if (dateStr.length >= 7 && dateStr.slice(0, 7) === '2026-02') return true;
    return false;
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
    const files = fs.readdirSync(BACKUPS_DIR)
        .filter((f) => f.endsWith('.json') && (f.startsWith('storage-snapshot-') || f.startsWith('pre-deploy-')) && !f.includes('manifest') && !f.startsWith('local-insurance'))
        .map((f) => path.join(BACKUPS_DIR, f));
    return files.sort((a, b) => (fs.statSync(b).mtimeMs || 0) - (fs.statSync(a).mtimeMs || 0));
}

async function fetchCurrentFeb(base, headers) {
    const fetchImpl = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default;
    const url = `${base.replace(/\/$/, '')}/${encodeURIComponent(FEB_KEY)}`;
    const res = await fetchImpl(url, { headers: { Accept: 'application/json', ...headers } });
    if (res.status === 404) return [];
    if (!res.ok) throw new Error(`GET ${FEB_KEY}: ${res.status}`);
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

async function putFeb(base, febArray, headers) {
    const fetchImpl = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default;
    const url = `${base.replace(/\/$/, '')}/${encodeURIComponent(FEB_KEY)}`;
    const res = await fetchImpl(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
        body: JSON.stringify({ value: febArray })
    });
    if (res.status !== 204 && res.status !== 200) throw new Error(`PUT ${FEB_KEY}: ${res.status} ${res.statusText}`);
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const doRestore = args.includes('--restore');

    console.log('--- February 2026 only: check backups and restore ---\n');

    const files = listBackupFiles();
    if (!files.length) {
        console.error('No backup files in', BACKUPS_DIR);
        process.exit(1);
    }

    const allFeb = [];
    for (const filePath of files) {
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const snap = JSON.parse(raw);
            const data = snap.data || snap;
            const feb = getFeb2026FromSnapshot(data);
            if (feb.length) {
                allFeb.push(feb);
                console.log('  ', path.basename(filePath), '->', feb.length, 'Feb 2026');
            }
        } catch (e) {
            console.warn('  Skip', path.basename(filePath), e.message);
        }
    }

    const mergedFeb = mergeByIdNewerWins(allFeb);
    console.log('\nMerged from backups (by id, newer wins):', mergedFeb.length, 'unique Feb 2026 activities.');

    const base = (process.env.REMOTE_STORAGE_BASE || '').trim().replace(/\/+$/, '');
    const headers = {};
    if (process.env.REMOTE_STORAGE_USER) headers['X-Admin-User'] = process.env.REMOTE_STORAGE_USER;
    if (process.env.REMOTE_STORAGE_API_KEY) headers['X-Api-Key'] = process.env.REMOTE_STORAGE_API_KEY;
    if (process.env.STORAGE_API_KEY) headers['X-Api-Key'] = headers['X-Api-Key'] || process.env.STORAGE_API_KEY;

    let currentFeb = [];
    if (base) {
        try {
            currentFeb = await fetchCurrentFeb(base, headers);
            console.log('Current on server (', FEB_KEY, '):', currentFeb.length, 'entries.');
        } catch (e) {
            console.warn('Could not fetch current:', e.message);
        }
    } else {
        console.log('REMOTE_STORAGE_BASE not set; skipping server compare.');
    }

    const currentIds = new Set((currentFeb || []).filter((a) => a && a.id).map((a) => a.id));
    const mergedIds = new Set(mergedFeb.filter((a) => a && a.id).map((a) => a.id));
    const missingOnServer = mergedFeb.filter((a) => a && a.id && !currentIds.has(a.id));
    const extraOnServer = (currentFeb || []).filter((a) => a && a.id && !mergedIds.has(a.id));

    if (missingOnServer.length) {
        console.log('\nMissing on server (in backups but not in current):', missingOnServer.length);
        missingOnServer.slice(0, 20).forEach((a) => console.log('   ', a.id, (a.date || a.createdAt || '').slice(0, 10), (a.accountId || a.accountName || '').toString().slice(0, 40)));
        if (missingOnServer.length > 20) console.log('   ... and', missingOnServer.length - 20, 'more');
    } else if (currentFeb.length > 0 && mergedFeb.length > 0) {
        console.log('\nNo missing entries: server has all merged Feb 2026 from backups.');
    }

    if (extraOnServer.length) {
        console.log('\nOn server but not in any backup (will keep if we restore merged list):', extraOnServer.length);
    }

    const toRestore = mergeByIdNewerWins([currentFeb, mergedFeb]);
    console.log('\nRestore list (current + backup merged, newer wins):', toRestore.length, 'entries.');

    if (doRestore && base && toRestore.length > 0) {
        if (dryRun) {
            console.log('\n[--dry-run] Would PUT', FEB_KEY, 'with', toRestore.length, 'entries. Run without --dry-run to restore.');
            return;
        }
        try {
            await putFeb(base, toRestore, headers);
            console.log('\nRestored', FEB_KEY, 'with', toRestore.length, 'entries. Hard-refresh the app.');
        } catch (e) {
            console.error('\nRestore failed:', e.message);
            process.exit(1);
        }
    } else if (doRestore && !base) {
        console.log('\nSet REMOTE_STORAGE_BASE (and auth) to restore.');
    } else {
        console.log('\nTo restore, run: node server/scripts/feb-2026-check-and-restore.js --restore');
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
