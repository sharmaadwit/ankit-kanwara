/**
 * Force Password Change Script
 * 
 * This script sets force_password_change = true for all users who:
 * 1. Have never updated their password (password_updated_at IS NULL)
 * 2. OR still have the default password
 * 
 * Run with: node server/scripts/force-password-change-all.js
 */

const { getPool, initDb } = require('../db');
const bcrypt = require('bcrypt');

const DEFAULT_PASSWORD = 'Welcome@Gupshup1';

async function forcePasswordChangeForAll() {
    console.log('🔐 Starting Force Password Change Script...\n');

    try {
        // Initialize DB connection
        await initDb();
        const pool = getPool();

        // Get all users
        const { rows: users } = await pool.query(`
      SELECT id, username, password_hash, password_updated_at, force_password_change
      FROM users
      WHERE is_active = true
      ORDER BY username;
    `);

        console.log(`Found ${users.length} active users\n`);

        const usersToUpdate = [];

        // Check each user
        for (const user of users) {
            let shouldForce = false;
            let reason = '';

            // Check if password was never updated
            if (!user.password_updated_at) {
                shouldForce = true;
                reason = 'Password never updated';
            }
            // Check if password matches default (even if it was "updated")
            else {
                try {
                    const matchesDefault = await bcrypt.compare(DEFAULT_PASSWORD, user.password_hash);
                    if (matchesDefault) {
                        shouldForce = true;
                        reason = 'Using default password';
                    }
                } catch (err) {
                    console.warn(`  ⚠️  Could not check password for ${user.username}:`, err.message);
                }
            }

            // Skip if already forced
            if (shouldForce && user.force_password_change) {
                console.log(`  ℹ️  ${user.username} - Already set to force password change`);
                continue;
            }

            if (shouldForce) {
                usersToUpdate.push({ username: user.username, reason });
            }
        }

        if (usersToUpdate.length === 0) {
            console.log('\n✅ No users need password change enforcement\n');
            return { count: 0, users: [] };
        }

        console.log(`\n📋 Users to update (${usersToUpdate.length}):`);
        usersToUpdate.forEach(u => console.log(`  - ${u.username} (${u.reason})`));

        // Confirm before proceeding
        console.log('\n⚠️  This will set force_password_change = true for these users');
        console.log('   They will be prompted to change password on next login\n');

        // Update users
        const usernames = usersToUpdate.map(u => u.username);
        const { rowCount } = await pool.query(`
      UPDATE users
      SET force_password_change = true
      WHERE username = ANY($1::text[])
      RETURNING username;
    `, [usernames]);

        console.log(`\n✅ Successfully updated ${rowCount} users\n`);

        // Log the action
        await pool.query(`
      INSERT INTO activity_logs (username, action, entity, detail)
      VALUES ($1, $2, $3, $4);
    `, [
            'system',
            'force_password_change_bulk',
            'users',
            JSON.stringify({
                count: rowCount,
                users: usersToUpdate.map(u => u.username)
            })
        ]);

        console.log('📝 Action logged to activity_logs\n');

        return { count: rowCount, users: usersToUpdate.map(u => u.username) };

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
        throw error;
    }
}

// Run if called directly
if (require.main === module) {
    forcePasswordChangeForAll()
        .then((result) => {
            console.log('✨ Script completed successfully');
            process.exit(0);
        })
        .catch(err => {
            console.error('Fatal error:', err);
            process.exit(1);
        });
}

module.exports = { forcePasswordChangeForAll };
