#!/usr/bin/env node
/**
 * Compare two storage backups for win/loss data (projects with status won/lost in accounts).
 * Use when win/loss data seems impacted to see which backup has more and how to restore.
 *
 * Usage:
 *   node scripts/compare-backups-winloss.js [backup1.json] [backup2.json]
 *   node scripts/compare-backups-winloss.js
 *     (with no args: uses two most recent .json files in backups/ by mtime)
 *
 * Example restore (after comparing):
 *   REMOTE_STORAGE_BASE=https://your-app.up.railway.app/api/storage
 *   SNAPSHOT_FILE=backups/storage-snapshot-2026-02-02T0530.json
 *   RESTORE_KEYS=accounts
 *   node server/scripts/restore-storage-from-snapshot.js
 */
const fs = require('fs');
const path = require('path');

const backupsDir = path.join(__dirname, '..', 'backups');

function getAccountsFromSnapshot(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const snapshot = JSON.parse(raw);
    const data = snapshot.data || snapshot;
    const accountsJson = data.accounts;
    if (accountsJson === undefined) return null;
    if (typeof accountsJson === 'string') {
        try {
            return JSON.parse(accountsJson);
        } catch (e) {
            return null;
        }
    }
    return Array.isArray(accountsJson) ? accountsJson : null;
}

function countWinLoss(accounts) {
    if (!Array.isArray(accounts)) return { accounts: 0, projects: 0, won: 0, lost: 0 };
    let projects = 0;
    let won = 0;
    let lost = 0;
    accounts.forEach((acc) => {
        (acc.projects || []).forEach((p) => {
            projects++;
            if (p.status === 'won') won++;
            else if (p.status === 'lost') lost++;
        });
    });
    return { accounts: accounts.length, projects, won, lost };
}

function getTwoRecentBackups() {
    if (!fs.existsSync(backupsDir)) return [];
    const files = fs.readdirSync(backupsDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({
            path: path.join(backupsDir, f),
            name: f,
            mtime: fs.statSync(path.join(backupsDir, f)).mtimeMs
        }))
        .sort((a, b) => b.mtime - a.mtime);
    return files.slice(0, 2).map((f) => f.path);
}

function main() {
    let file1 = process.argv[2];
    let file2 = process.argv[3];
    if (!file1 || !file2) {
        const recent = getTwoRecentBackups();
        if (recent.length < 2) {
            console.error('Need two backup files. Usage: node scripts/compare-backups-winloss.js [backup1.json] [backup2.json]');
            console.error('Or add at least two .json files in backups/');
            process.exit(1);
        }
        file1 = recent[0];
        file2 = recent[1];
        console.log('Using two most recent backups in backups/:');
        console.log('  1:', path.basename(file1));
        console.log('  2:', path.basename(file2));
        console.log('');
    } else {
        file1 = path.resolve(process.cwd(), file1);
        file2 = path.resolve(process.cwd(), file2);
        if (!fs.existsSync(file1)) {
            console.error('File not found:', file1);
            process.exit(1);
        }
        if (!fs.existsSync(file2)) {
            console.error('File not found:', file2);
            process.exit(1);
        }
    }

    const accounts1 = getAccountsFromSnapshot(file1);
    const accounts2 = getAccountsFromSnapshot(file2);

    const c1 = countWinLoss(accounts1);
    const c2 = countWinLoss(accounts2);

    console.log('--- Backup 1:', path.basename(file1), '---');
    if (accounts1 === null) {
        console.log('  No accounts key or invalid data.');
    } else {
        console.log('  Accounts:', c1.accounts, '| Projects:', c1.projects, '| Won:', c1.won, '| Lost:', c1.lost);
    }
    console.log('');
    console.log('--- Backup 2:', path.basename(file2), '---');
    if (accounts2 === null) {
        console.log('  No accounts key or invalid data.');
    } else {
        console.log('  Accounts:', c2.accounts, '| Projects:', c2.projects, '| Won:', c2.won, '| Lost:', c2.lost);
    }
    console.log('');

    const total1 = (c1.won || 0) + (c1.lost || 0);
    const total2 = (c2.won || 0) + (c2.lost || 0);
    const rel = (p) => path.relative(process.cwd(), p).split(path.sep).join(path.sep);
    if (accounts1 !== null && accounts2 !== null) {
        if (total1 > total2) {
            console.log('Backup 1 has more win/loss entries (' + total1 + ' vs ' + total2 + ').');
            console.log('To restore only accounts (win/loss) from Backup 1:');
            console.log('  RESTORE_KEYS=accounts SNAPSHOT_FILE=' + rel(file1) + ' node server/scripts/restore-storage-from-snapshot.js');
            console.log('  (Set REMOTE_STORAGE_BASE and auth env first.)');
        } else if (total2 > total1) {
            console.log('Backup 2 has more win/loss entries (' + total2 + ' vs ' + total1 + ').');
            console.log('To restore only accounts (win/loss) from Backup 2:');
            console.log('  RESTORE_KEYS=accounts SNAPSHOT_FILE=' + rel(file2) + ' node server/scripts/restore-storage-from-snapshot.js');
            console.log('  (Set REMOTE_STORAGE_BASE and auth env first.)');
        } else {
            console.log('Both backups have the same win/loss count (' + total1 + ').');
        }
    }
}

main();
