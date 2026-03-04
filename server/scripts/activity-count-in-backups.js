#!/usr/bin/env node
/**
 * Print activity counts for recent backup files in backups/.
 * Use to choose which snapshot to restore from when activities are missing.
 *
 * Run from project root: node server/scripts/activity-count-in-backups.js
 * Optional: node server/scripts/activity-count-in-backups.js 20   (show last 20 files)
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const backupsDir = path.join(projectRoot, 'backups');
const limit = Math.max(1, parseInt(process.argv[2], 10) || 15);

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

const files = fs.existsSync(backupsDir)
    ? fs.readdirSync(backupsDir)
          .filter((f) => f.endsWith('.json') && (f.startsWith('storage-snapshot-') || f.startsWith('pre-deploy-')))
          .map((f) => path.join(backupsDir, f))
          .sort((a, b) => (fs.statSync(b).mtime || 0) - (fs.statSync(a).mtime || 0))
          .slice(0, limit)
    : [];

console.log('Recent backups – activity count (use one of these for restore):\n');
for (const filePath of files) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const snap = JSON.parse(raw);
        const data = snap.data || snap;
        const n = countActivities(data);
        const name = path.basename(filePath);
        console.log('  ', name, '->', n, 'activities');
    } catch (e) {
        console.log('  ', path.basename(filePath), '-> (read error)');
    }
}
console.log('\nRestore: REMOTE_STORAGE_BASE=... REMOTE_STORAGE_USER=... node server/scripts/restore-storage-from-snapshot.js backups/<file>.json');
console.log('Optional: RESTORE_KEYS=activities to restore only activities.\n');
