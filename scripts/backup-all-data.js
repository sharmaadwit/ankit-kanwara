/**
 * Complete data backup before restructuring
 * Exports activities, accounts, users, and storage to JSON
 */
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const projectRoot = process.cwd();
const localEnvPath = path.resolve(projectRoot, '.env');
if (fs.existsSync(localEnvPath)) {
  dotenv.config({ path: localEnvPath });
}

const { initDb, getPool, closePool } = require('../server/db');

(async () => {
  try {
    console.log('🔄 Starting complete data backup...\n');
    await initDb();
    const pool = getPool();

    const timestamp = new Date().toISOString().split('T')[0];
    const backupDir = path.join(projectRoot, 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFile = path.join(backupDir, `backup-${timestamp}-all-data.json`);

    const backup = {
      timestamp: new Date().toISOString(),
      backup_name: `Full backup - ${timestamp}`,
      tables: {}
    };

    // 1. Get storage table (activities, accounts, users, etc.)
    console.log('📦 Backing up storage table...');
    const storageResult = await pool.query('SELECT key, length(value) as size_bytes FROM storage ORDER BY key');
    backup.tables.storage = {
      count: storageResult.rows.length,
      rows: storageResult.rows,
      note: 'Storage contains JSON blobs for activities, accounts, users, etc.'
    };

    // 2. Get activities from normalized table
    console.log('📋 Backing up activities table...');
    const activitiesResult = await pool.query(`
      SELECT * FROM activities ORDER BY activity_date DESC
    `);
    backup.tables.activities = {
      count: activitiesResult.rows.length,
      rows: activitiesResult.rows
    };

    // 3. Get accounts
    console.log('📊 Backing up accounts table...');
    const accountsResult = await pool.query('SELECT * FROM accounts ORDER BY name');
    backup.tables.accounts = {
      count: accountsResult.rows.length,
      rows: accountsResult.rows
    };

    // 4. Get users
    console.log('👥 Backing up users table...');
    const usersResult = await pool.query('SELECT * FROM users ORDER BY username');
    backup.tables.users = {
      count: usersResult.rows.length,
      rows: usersResult.rows
    };

    // 5. Get internal activities
    console.log('🔧 Backing up internal_activities table...');
    const internalResult = await pool.query(`
      SELECT * FROM internal_activities ORDER BY activity_date DESC
    `);
    backup.tables.internal_activities = {
      count: internalResult.rows.length,
      rows: internalResult.rows
    };

    // 6. Get sessions
    console.log('🔐 Backing up sessions table...');
    const sessionsResult = await pool.query('SELECT id, user_id, created_at, expires_at FROM sessions');
    backup.tables.sessions = {
      count: sessionsResult.rows.length,
      rows: sessionsResult.rows
    };

    // Summary stats
    backup.summary = {
      total_activities: activitiesResult.rows.length,
      total_accounts: accountsResult.rows.length,
      total_users: usersResult.rows.length,
      total_internal_activities: internalResult.rows.length,
      total_sessions: sessionsResult.rows.length,
      storage_blobs: storageResult.rows.length
    };

    // Write backup
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    const fileSize = (fs.statSync(backupFile).size / 1024 / 1024).toFixed(2);

    console.log('\n✅ BACKUP COMPLETE!\n');
    console.log('📁 Backup file:', backupFile);
    console.log('📊 File size:', fileSize, 'MB');
    console.log('\n📈 Data Summary:');
    console.log('  - Activities:', backup.summary.total_activities);
    console.log('  - Accounts:', backup.summary.total_accounts);
    console.log('  - Users:', backup.summary.total_users);
    console.log('  - Internal Activities:', backup.summary.total_internal_activities);
    console.log('  - Sessions:', backup.summary.total_sessions);
    console.log('  - Storage Blobs:', backup.summary.storage_blobs);

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  }
})();
