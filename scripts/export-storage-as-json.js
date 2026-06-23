/**
 * Quick export of storage table content to JSON
 * Useful for understanding current data structure before migration
 */
const fs = require('fs');
const path = require('path');

// This would normally read from DB, but for demo we'll check what's in the backups folder
const backupsDir = path.join(__dirname, '..', 'backups');

console.log('📊 Looking for existing backups...\n');

if (!fs.existsSync(backupsDir)) {
  console.log('⚠️  No backups directory found.');
  console.log('   To create a backup, run on Railway:');
  console.log('   railway run npm run backup:all-data\n');
  process.exit(0);
}

const files = fs.readdirSync(backupsDir)
  .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
  .sort()
  .reverse();

if (files.length === 0) {
  console.log('❌ No backup files found in backups/ directory\n');
  process.exit(1);
}

console.log('✅ Found backup files:\n');
files.forEach(file => {
  const filePath = path.join(backupsDir, file);
  const stats = fs.statSync(filePath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`   📁 ${file}`);
  console.log(`      Size: ${sizeMB} MB`);
  console.log(`      Date: ${stats.mtime.toISOString()}\n`);
});

console.log('📝 To backup current data on Railway, run:');
console.log('   railway run npm run backup:all-data\n');
