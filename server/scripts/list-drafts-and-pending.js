#!/usr/bin/env node
/**
 * List drafts from last 24h for recovery:
 * 1) Server "Lost & Found" (pending_storage_saves): GET /api/storage/pending?hours=24
 * 2) Local backup JSON files: scan backups/ for any __pams_drafts__ or data.__pams_drafts__
 *
 * Usage:
 *   node server/scripts/list-drafts-and-pending.js
 *   node server/scripts/list-drafts-and-pending.js --pending-only
 *   node server/scripts/list-drafts-and-pending.js --backups-only
 *   node server/scripts/list-drafts-and-pending.js --hours=48
 *
 * For server pending you need admin auth (e.g. REMOTE_STORAGE_USER or X-Admin-User).
 * Set REMOTE_STORAGE_BASE to your API base (e.g. https://your-app.up.railway.app/api/storage).
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const backupsDir = path.join(projectRoot, 'backups');

try {
    require('dotenv').config({ path: path.join(projectRoot, '.env') });
} catch (_) {}

const hours = parseInt(process.env.DRAFTS_HOURS || '24', 10) || 24;

function getDraftsFromObject(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if (Array.isArray(obj) && obj.length > 0) return obj;
    if (Array.isArray(obj.__pams_drafts__)) return obj.__pams_drafts__;
    if (obj.data && Array.isArray(obj.data.__pams_drafts__)) return obj.data.__pams_drafts__;
    return null;
}

async function fetchPendingFromServer(hoursParam) {
    const base = (process.env.REMOTE_STORAGE_BASE || '').replace(/\/$/, '');
    if (!base) return null;
    const h = hoursParam != null ? hoursParam : hours;
    const url = `${base}/pending?hours=${h}&limit=200`;
    const headers = { Accept: 'application/json' };
    if (process.env.REMOTE_STORAGE_USER) headers['X-Admin-User'] = process.env.REMOTE_STORAGE_USER;
    if (process.env.REMOTE_STORAGE_API_KEY) headers['X-Api-Key'] = process.env.REMOTE_STORAGE_API_KEY;
    if (process.env.STORAGE_API_KEY) headers['X-Api-Key'] = headers['X-Api-Key'] || process.env.STORAGE_API_KEY;
    let fetchImpl = typeof fetch === 'function' ? fetch : null;
    if (!fetchImpl) {
        try {
            const { default: nodeFetch } = await import('node-fetch');
            fetchImpl = nodeFetch;
        } catch (_) {
            console.warn('Could not load fetch. Install node-fetch or use Node 18+ for --pending.');
            return null;
        }
    }
    const res = await fetchImpl(url, { headers });
    if (!res.ok) {
        console.warn('Pending API returned', res.status, res.statusText);
        return null;
    }
    const body = await res.json();
    return body.pending || body;
}

function scanBackupFile(filePath) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const obj = JSON.parse(raw);
        const drafts = getDraftsFromObject(obj);
        if (!drafts || drafts.length === 0) return null;
        const at = (obj.at || (obj.data && obj.data.__pams_drafts_backup_at__) || obj.generatedAt || '').toString().slice(0, 19);
        return { count: drafts.length, at, file: path.basename(filePath) };
    } catch (_) {
        return null;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const pendingOnly = args.includes('--pending-only');
    const backupsOnly = args.includes('--backups-only');
    const hoursArg = args.find((a) => a.startsWith('--hours='));
    const effectiveHours = hoursArg ? parseInt(hoursArg.split('=')[1], 10) || hours : hours;

    console.log('--- Drafts recovery: last', effectiveHours, 'h (server pending) and backup files ---\n');

    if (!backupsOnly) {
        const pending = await fetchPendingFromServer(effectiveHours);
        if (pending && Array.isArray(pending)) {
            console.log('Server pending (Lost & Found, 409 conflicts, last', effectiveHours, 'h):', pending.length, 'items');
            pending.slice(0, 30).forEach((p) => {
                console.log('  ', p.id, p.storage_key, p.username || '-', (p.created_at || '').slice(0, 19));
            });
            if (pending.length > 30) console.log('  ... and', pending.length - 30, 'more');
        } else {
            console.log('Server pending: not available (set REMOTE_STORAGE_BASE and admin auth) or empty.');
        }
        console.log('');
    }

    if (!pendingOnly) {
        if (!fs.existsSync(backupsDir)) {
            console.log('Backups dir not found:', backupsDir);
            return;
        }
        const files = fs.readdirSync(backupsDir)
            .filter((f) => f.endsWith('.json'))
            .map((f) => path.join(backupsDir, f))
            .sort((a, b) => (fs.statSync(b).mtime || 0) - (fs.statSync(a).mtime || 0));
        let found = 0;
        for (const filePath of files) {
            const result = scanBackupFile(filePath);
            if (result) {
                console.log('Backup file with drafts:', result.file, '|', result.count, 'drafts', result.at ? '| ' + result.at : '');
                found++;
            }
        }
        if (found === 0) console.log('No backup files contained __pams_drafts__ (drafts are usually client-only in localStorage).');
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
