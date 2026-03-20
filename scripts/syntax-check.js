#!/usr/bin/env node
/**
 * Full syntax check for deploy: parse all app client JS under pams-app/js and all server JS
 * (excluding node_modules, __tests__, archive). Exit 0 = OK.
 * Run before every push: npm run syntax-check
 */
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
let failed = 0;

const SKIP_DIR_NAMES = new Set(['node_modules', '__tests__', 'archive', '.git']);

function collectJsFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (SKIP_DIR_NAMES.has(ent.name)) continue;
      collectJsFiles(full, acc);
    } else if (ent.isFile() && ent.name.endsWith('.js')) {
      acc.push(full);
    }
  }
  return acc;
}

function check(relPath, filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    // Strip shebang if present (some scripts)
    const body = code.startsWith('#!') ? code.replace(/^#![^\n]*\n/, '') : code;
    new Function(body);
    console.log('OK', relPath);
  } catch (e) {
    console.error('SYNTAX ERROR', relPath, e.message);
    failed++;
  }
}

const clientDir = path.join(root, 'pams-app', 'js');
const serverDir = path.join(root, 'server');

const files = [];
collectJsFiles(clientDir, files);
collectJsFiles(serverDir, files);

files.sort((a, b) => a.localeCompare(b));
files.forEach((abs) => {
  check(path.relative(root, abs).replace(/\\/g, '/'), abs);
});

if (failed > 0) {
  process.exit(1);
}
