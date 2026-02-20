/**
 * Inspect "2025 Wins with SFDC" xlsx: sheet names, headers, first rows.
 * Use output to define Green/Yellow/Red columns and matching logic.
 *
 * Run: node scripts/inspect-wins-xlsx.js
 */

const XLSX = require('xlsx');
const path = require('path');

const PRESALES = path.join(__dirname, '..', '..', 'Presales Year End Report 2025 - 26');
const WIN_FILE = '2025 Wins with SFDC-2026-02-02-17-56-23.xlsx';
const WIN_PATH = path.join(PRESALES, WIN_FILE);

let workbook;
try {
  workbook = XLSX.readFile(WIN_PATH);
} catch (e) {
  console.error('Cannot read:', WIN_PATH, e.message);
  process.exit(1);
}

console.log('Sheets:', workbook.SheetNames.join(', '));
console.log('');

workbook.SheetNames.forEach((sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  const ref = sheet['!ref'];
  if (!ref) {
    console.log('---', sheetName, '(empty)');
    return;
  }
  const range = XLSX.utils.decode_range(ref);
  console.log('---', sheetName, '---');
  const maxCol = range.e.c;
  const headers = [];
  for (let c = 0; c <= maxCol; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c })];
    headers.push(cell && cell.v != null ? String(cell.v).slice(0, 40) : '');
  }
  console.log('Headers:', headers.join(' | '));
  for (let r = 1; r <= Math.min(5, range.e.r); r++) {
    const row = [];
    for (let c = 0; c <= Math.min(maxCol, 10); c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      const v = cell && cell.v != null ? String(cell.v).slice(0, 30) : '';
      row.push(v);
    }
    console.log('Row', r, '|', row.join(' | '));
  }
  console.log('');
});

console.log('Use these columns for Strong/Medium/Weak:');
console.log('- Match Win row Account (and SFDC Id if present) to migration CSV Account Name / SFDC Link.');
console.log('- Strong (Green): account + activities linked; Medium (Yellow): account or SFDC match, partial link; Weak (Red): no match.');
