#!/usr/bin/env node
/**
 * Pre-deploy snapshot: export current production storage to a timestamped file
 * so you can restore if needed after deploy.
 *
 * Usage:
 *   node scripts/snapshot-before-deploy.js
 *   node scripts/snapshot-before-deploy.js https://your-app.up.railway.app/api/storage
 *   REMOTE_STORAGE_BASE=https://... node scripts/snapshot-before-deploy.js
 */
const path = require('path');

if (process.argv[2]) {
    process.env.REMOTE_STORAGE_BASE = process.argv[2];
}
const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 19);
const snapshotFile = path.join(__dirname, '..', 'backups', `pre-deploy-${timestamp}.json`);
process.env.SNAPSHOT_FILE = path.resolve(snapshotFile);

console.log('Pre-deploy snapshot →', process.env.SNAPSHOT_FILE);
require('../server/scripts/export-storage-snapshot.js');
