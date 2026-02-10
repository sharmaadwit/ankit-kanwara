#!/usr/bin/env node
/**
 * Extract suggestions/bugs and pending industries/use cases from a storage snapshot.
 * Use to recover lost feedback from any backup file (e.g. backups/storage-snapshot-latest.json
 * or a pre-deploy backup, or a file from git history).
 *
 * Usage:
 *   node server/scripts/extract-feedback-from-snapshot.js path/to/snapshot.json
 *   node server/scripts/extract-feedback-from-snapshot.js backups/storage-snapshot-latest.json
 *   node server/scripts/extract-feedback-from-snapshot.js backups/pre-deploy-2026-02-05T0737.json --out recovered-feedback.json
 *
 * Options:
 *   --out <file>   Write extracted data to a JSON file (otherwise prints to stdout).
 */

const fs = require('fs');
const path = require('path');

const FEEDBACK_KEYS = ['suggestionsAndBugs', 'pendingIndustries', 'pendingUseCases'];

function main() {
    const args = process.argv.slice(2);
    const snapshotPath = args.find((a) => !a.startsWith('--'));
    const outIdx = args.indexOf('--out');
    const outPath = outIdx >= 0 && args[outIdx + 1] ? args[outIdx + 1] : null;

    if (!snapshotPath || !fs.existsSync(snapshotPath)) {
        console.error('Usage: node extract-feedback-from-snapshot.js <snapshot.json> [--out output.json]');
        console.error('Example: node server/scripts/extract-feedback-from-snapshot.js backups/storage-snapshot-latest.json');
        process.exit(1);
    }

    const raw = fs.readFileSync(snapshotPath, 'utf8');
    let snapshot;
    try {
        snapshot = JSON.parse(raw);
    } catch (e) {
        console.error('Failed to parse snapshot:', e.message);
        process.exit(1);
    }

    const data = snapshot.data || snapshot;
    const extracted = {
        extractedAt: new Date().toISOString(),
        sourceSnapshot: path.basename(snapshotPath),
        suggestionsAndBugs: null,
        pendingIndustries: null,
        pendingUseCases: null
    };

    for (const key of FEEDBACK_KEYS) {
        const value = data[key];
        if (value === undefined) {
            extracted[key] = null;
            console.warn(`  ⚠ ${key}: not in snapshot`);
        } else if (value && typeof value === 'object' && value.error) {
            extracted[key] = null;
            console.warn(`  ⚠ ${key}: had error in snapshot: ${value.error}`);
        } else {
            extracted[key] = value;
            const count = Array.isArray(value) ? value.length : (typeof value === 'object' ? Object.keys(value).length : 0);
            console.log(`  ✓ ${key}: ${count} items`);
        }
    }

    const out = JSON.stringify(extracted, null, 2);
    if (outPath) {
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, out, 'utf8');
        console.log(`\nWritten to ${outPath}`);
    } else {
        console.log('\n--- Extracted data ---\n');
        console.log(out);
    }

    const totalSuggestions = Array.isArray(extracted.suggestionsAndBugs) ? extracted.suggestionsAndBugs.length : 0;
    const totalPendingInd = Array.isArray(extracted.pendingIndustries) ? extracted.pendingIndustries.length : 0;
    const totalPendingUC = Array.isArray(extracted.pendingUseCases) ? extracted.pendingUseCases.length : 0;
    if (totalSuggestions + totalPendingInd + totalPendingUC === 0) {
        console.log('\nNo feedback data in this snapshot. Try an older backup (e.g. pre-deploy-*.json or git history).');
    } else {
        console.log('\nTo restore only these keys to live storage:');
        console.log('  RESTORE_KEYS=suggestionsAndBugs,pendingIndustries,pendingUseCases REMOTE_STORAGE_BASE=<your-api> node server/scripts/restore-storage-from-snapshot.js', snapshotPath);
    }
}

main();
