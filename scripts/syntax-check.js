#!/usr/bin/env node
/**
 * Syntax check for deploy: ensure server and key client JS parse.
 * Run before deploy: npm run syntax-check
 * Exit 0 = OK; non-zero = syntax error.
 */
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log('OK', name);
  } catch (e) {
    console.error('SYNTAX ERROR', name, e.message);
    failed++;
  }
}

// Server: parse only (no DB/env needed in CI)
const serverFiles = [
  'server/app.js',
  'server/routes/pricingCalculations.js'
];
serverFiles.forEach((rel) => {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return;
  check(rel, () => {
    const code = fs.readFileSync(file, 'utf8');
    new Function(code);
  });
});

// Client: parse key bundles (no require, just parse)
const clientFiles = [
  'pams-app/js/app.js',
  'pams-app/js/activities.js',
  'pams-app/js/auth.js',
  'pams-app/js/admin.js'
];
clientFiles.forEach((rel) => {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return;
  check(rel, () => {
    const code = fs.readFileSync(file, 'utf8');
    new Function(code);
  });
});

if (failed > 0) {
  process.exit(1);
}
