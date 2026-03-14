#!/usr/bin/env node
/**
 * Print activity counts for backup files in backups/.
 * Use to choose which snapshot to restore when activities are missing.
 *
 * Run from project root: node server/scripts/activity-count-in-backups.js
 *   Optional: node server/scripts/activity-count-in-backups.js 25   (show last 25 by mtime)
 *   Optional: node server/scripts/activity-count-in-backups.js all   (scan ALL backups, show max)
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const backupsDir = path.join(projectRoot, 'backups');

function countActivities(data) {
    if (!data || typeof data !== 'object') return 0;
    let n = 0;
    for (const k of Object.keys(data)) {
        if (k === 'activities' || k.startsWith('activities:')) {
            const v = data[k];
            if (Array.isArray(v)) n += v.length;
        }
    }
    return n;
}

const allJson = fs.existsSync(backupsDir)
    ? fs.readdirSync(backupsDir).filter((f) => f.endsWith('.json'))
    : [];
const limitArg = process.argv[2];
const showAll = limitArg && String(limitArg).toLowerCase() === 'all';
const limit = showAll ? Infinity : Math.max(1, parseInt(limitArg, 10) || 15);

const files = allJson
    .map((f) => path.join(backupsDir, f))
    .sort((a, b) => (fs.statSync(b).mtime || 0) - (fs.statSync(a).mtime || 0))
    .slice(0, limit);

const results = [];
for (const filePath of files) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const snap = JSON.parse(raw);
        const data = snap.data || snap;
        const n = countActivities(data);
        results.push({ name: path.basename(filePath), path: filePath, count: n });
    } catch (e) {
        results.push({ name: path.basename(filePath), path: filePath, count: -1 });
    }
}

if (showAll) {
    console.log('All backups – activity count (total ' + results.length + ' files):\n');
    let maxCount = -1;
    let maxName = '';
    results.forEach((r) => {
        const str = r.count < 0 ? '(read error)' : String(r.count);
        console.log('  ', r.name, '->', str, 'activities');
        if (r.count > maxCount) {
            maxCount = r.count;
            maxName = r.name;
        }
    });
    if (maxName) console.log('\n  ** Most complete: ' + maxName + ' (' + maxCount + ' activities). Use this file to restore.\n');
} else {
    console.log('Recent backups – activity count (use one of these for restore):\n');
    results.forEach((r) => {
        const str = r.count < 0 ? '(read error)' : String(r.count);
        console.log('  ', r.name, '->', str, 'activities');
    });
}

console.log('\nRestore: REMOTE_STORAGE_BASE=... REMOTE_STORAGE_USER=... node server/scripts/restore-storage-from-snapshot.js backups/<file>.json');
console.log('Optional: RESTORE_KEYS=activities to restore only activities.');
console.log('Scan all: node server/scripts/activity-count-in-backups.js all\n');
