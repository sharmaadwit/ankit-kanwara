#!/usr/bin/env node
/**
 * Pre-deploy snapshot: export ALL current production storage (activities and every key)
 * to a timestamped file, plus a local-insurance copy that stays on your machine (not pushed).
 *
 * Usage:
 *   REMOTE_STORAGE_BASE=https://your-app.up.railway.app/api/storage REMOTE_STORAGE_USER=... node scripts/snapshot-before-deploy.js
 *   node scripts/snapshot-before-deploy.js https://your-app.up.railway.app/api/storage
 */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

if (process.argv[2]) {
    process.env.REMOTE_STORAGE_BASE = process.argv[2];
}
const backupsDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
}
const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 19);
const snapshotFile = path.join(backupsDir, `pre-deploy-${timestamp}.json`);
const localInsuranceFile = path.join(backupsDir, `local-insurance-${timestamp}.json`);
process.env.SNAPSHOT_FILE = path.resolve(snapshotFile);

console.log('Pre-deploy snapshot (all activities + storage) →', process.env.SNAPSHOT_FILE);
const result = spawnSync(
    process.execPath,
    [path.join(__dirname, '..', 'server', 'scripts', 'export-storage-snapshot.js')],
    {
        env: process.env,
        stdio: 'inherit',
        cwd: path.join(__dirname, '..')
    }
);
if (result.status !== 0) {
    process.exit(result.status || 1);
}

// Double insurance: save an identical copy locally (gitignored so it is not pushed)
try {
    const content = fs.readFileSync(snapshotFile, 'utf8');
    fs.writeFileSync(localInsuranceFile, content, 'utf8');
    console.log('Local insurance copy (not pushed) →', path.relative(process.cwd(), localInsuranceFile));
} catch (e) {
    console.warn('Could not write local insurance copy:', e.message);
}
