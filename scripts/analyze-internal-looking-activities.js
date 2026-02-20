/**
 * Analyze migration CSV: count rows by Activity Category (external vs internal).
 * Uses row prefix because CSV has multiline quoted Description; only first column is reliable per logical row.
 * Run: node scripts/analyze-internal-looking-activities.js
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', '..', 'Project-PAT-LocalArchive', '2026-02-11_161551', 'pams_migration_ready_v3.csv');

function main() {
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter(Boolean);

  let external = 0;
  let internal = 0;
  let other = 0;

  for (let i = 1; i < lines.length; i++) {
    const first = lines[i].trimStart();
    if (first.startsWith('external,')) external++;
    else if (first.startsWith('internal,')) internal++;
    else other++;
  }

  const total = external + internal;
  console.log('By Activity Category (row prefix; logical rows):');
  console.log('  external:', external);
  console.log('  internal:', internal);
  console.log('  total (external + internal):', total);
  console.log('  other lines (continuation of quoted fields):', other);
  console.log('\nUse: activity date from Date column only; do not use submission timestamp.');
}

main();
