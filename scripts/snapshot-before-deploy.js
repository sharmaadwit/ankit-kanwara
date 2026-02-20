#!/usr/bin/env node
/**
 * Pre-deploy snapshot: (1) capture current production build number, (2) export ALL
 * production storage (industries, users, accounts, activities, internalActivities, etc.)
 * to a timestamped file, plus a manifest and local-insurance copy.
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

const base = (process.env.REMOTE_STORAGE_BASE || '').trim().replace(/\/api\/storage\/?$/i, '');
const backupsDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
}
const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 19);
const snapshotFile = path.join(backupsDir, `pre-deploy-${timestamp}.json`);
const manifestFile = path.join(backupsDir, `pre-deploy-manifest-${timestamp}.json`);
const localInsuranceFile = path.join(backupsDir, `local-insurance-${timestamp}.json`);
process.env.SNAPSHOT_FILE = path.resolve(snapshotFile);

// 1) Capture current production build number (live in production right now)
let productionVersion = '';
let productionBuildId = '';
async function captureProductionBuild() {
    if (!base) {
        console.warn('REMOTE_STORAGE_BASE not set; skipping production build capture.');
        return;
    }
    console.log('Capturing current production build number from', base + '/api/version');
    try {
        const versionUrl = base.startsWith('http') ? base + '/api/version' : 'https://' + base + '/api/version';
        const fetchImpl = typeof fetch === 'function' ? fetch : (await import('node-fetch')).default;
        const res = await fetchImpl(versionUrl);
        if (res.ok) {
            const body = await res.json();
            productionVersion = body.version || '';
            productionBuildId = body.buildId || '';
            console.log('  → version:', productionVersion, 'buildId:', productionBuildId || '(none)');
        } else {
            console.warn('  → /api/version returned', res.status, '- snapshot will not include build number.');
        }
    } catch (e) {
        console.warn('  → Could not fetch /api/version:', e.message, '- snapshot will not include build number.');
    }
}
captureProductionBuild().then(() => runSnapshot());

function runSnapshot() {

    console.log('');
    console.log('Pre-deploy snapshot (all data: industries, users, accounts, activities, internalActivities, etc.) →', process.env.SNAPSHOT_FILE);
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

    // Embed production build info into snapshot and write manifest
    try {
        const content = fs.readFileSync(snapshotFile, 'utf8');
        const snapshot = JSON.parse(content);
        snapshot.productionVersionAtSnapshot = productionVersion || null;
        snapshot.productionBuildIdAtSnapshot = productionBuildId || null;
        fs.writeFileSync(snapshotFile, JSON.stringify(snapshot, null, 2), 'utf8');

        const manifest = {
            generatedAt: new Date().toISOString(),
            productionVersionAtSnapshot: productionVersion || null,
            productionBuildIdAtSnapshot: productionBuildId || null,
            snapshotFile: path.basename(snapshotFile),
            snapshotPath: snapshotFile,
            totalKeys: snapshot.totalKeys != null ? snapshot.totalKeys : null
        };
        fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');
        console.log('Manifest (build number + snapshot path) →', path.relative(process.cwd(), manifestFile));

        fs.writeFileSync(localInsuranceFile, JSON.stringify(snapshot, null, 2), 'utf8');
        console.log('Local insurance copy (not pushed) →', path.relative(process.cwd(), localInsuranceFile));
    } catch (e) {
        console.warn('Could not add build info or write manifest/insurance:', e.message);
    }

    console.log('');
    console.log('Done. Before deploying: build number and full data snapshot are saved. Deploy when ready.');
}
