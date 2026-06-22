/**
 * Migration: Restructure activities from single blob to user+month buckets
 * After: activities:2026-06:userId1, activities:2026-05:userId1, etc.
 * Keeps last 3 months in main 'activities' for UI cache
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

async function migrateActivitiesByUserMonth() {
  try {
    console.log('🔄 Starting activity migration...\n');
    await initDb();
    const pool = getPool();

    // 1. Check if migration already ran
    console.log('✓ Checking migration status...');
    const statusResult = await pool.query(
      `SELECT value FROM storage WHERE key = 'migration:activities_by_user_month'`
    );

    if (statusResult.rows.length > 0) {
      const status = JSON.parse(statusResult.rows[0].value);
      console.log('⚠️  Migration already completed on:', status.completed_at);
      console.log('   Skipping...\n');
      await closePool();
      return;
    }

    // 2. Get current activities blob
    console.log('📦 Loading current activities blob...');
    const result = await pool.query(
      `SELECT value FROM storage WHERE key = 'activities'`
    );

    let allActivities = [];
    if (result.rows.length > 0 && result.rows[0].value) {
      try {
        const raw = result.rows[0].value;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        allActivities = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('❌ Failed to parse activities blob:', e.message);
        throw e;
      }
    }

    console.log(`   Found ${allActivities.length} total activities\n`);

    // 3. Group by user and month
    console.log('📊 Grouping activities by user and month...');
    const byUserMonth = {};
    const monthCounts = {};

    allActivities.forEach(activity => {
      if (!activity || !activity.id) return;

      // Determine user ID
      const userId = activity.userId || activity.assignedUserId || 'unknown';
      
      // Determine month (YYYY-MM)
      const dateStr = activity.date || activity.activityDate || activity.createdAt || '';
      const month = dateStr.slice(0, 7); // YYYY-MM
      
      if (!month || month.length < 7) {
        console.warn(`   ⚠️  Activity ${activity.id} has invalid date: ${dateStr}, skipping`);
        return;
      }

      const key = `${month}:${userId}`;
      if (!byUserMonth[key]) {
        byUserMonth[key] = [];
      }
      byUserMonth[key].push(activity);

      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });

    console.log(`   Grouped into ${Object.keys(byUserMonth).length} user-month buckets\n`);

    // 4. Save split data to storage
    console.log('💾 Saving split activities to storage...');
    const client = await pool.connect();
    let savedCount = 0;

    try {
      for (const [key, activities] of Object.entries(byUserMonth)) {
        const [month, userId] = key.split(':');
        const storageKey = `activities:${month}:${userId}`;
        const value = JSON.stringify(activities);

        await client.query(
          `INSERT INTO storage (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
          [storageKey, value]
        );
        savedCount++;

        if (savedCount % 50 === 0) {
          console.log(`   ... saved ${savedCount} buckets`);
        }
      }
      console.log(`   ✓ Saved ${savedCount} user-month buckets\n`);
    } finally {
      client.release();
    }

    // 5. Create recent months view (last 3 + next 3 months for UI cache)
    console.log('📅 Creating recent months view (last 3 + next 3 months)...');
    const now = new Date();
    const recentMonths = [];

    // Last 3 months
    for (let i = 3; i > 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      recentMonths.push(d.toISOString().slice(0, 7));
    }

    // Current month
    recentMonths.push(now.toISOString().slice(0, 7));

    // Next 3 months
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      recentMonths.push(d.toISOString().slice(0, 7));
    }

    const recentActivities = [];
    for (const [key, activities] of Object.entries(byUserMonth)) {
      const month = key.split(':')[0];
      if (recentMonths.includes(month)) {
        recentActivities.push(...activities);
      }
    }

    await pool.query(
      `INSERT INTO storage (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
      ['activities', JSON.stringify(recentActivities)]
    );
    console.log(`   ✓ Saved ${recentActivities.length} activities to recent view\n`);

    // 6. Record migration completion
    console.log('✓ Recording migration status...');
    const migrationStatus = {
      completed_at: new Date().toISOString(),
      total_activities_migrated: allActivities.length,
      total_buckets: savedCount,
      recent_months: recentMonths,
      month_distribution: monthCounts
    };

    await pool.query(
      `INSERT INTO storage (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
      ['migration:activities_by_user_month', JSON.stringify(migrationStatus)]
    );

    console.log('\n✅ MIGRATION COMPLETE!\n');
    console.log('📈 Migration Summary:');
    console.log(`  - Total activities migrated: ${allActivities.length}`);
    console.log(`  - User-month buckets created: ${savedCount}`);
    console.log(`  - Recent months (in UI): ${sortedMonths.join(', ')}`);
    console.log(`  - Month distribution:`, monthCounts);
    console.log('\n🎯 Next steps:');
    console.log('  1. Deploy the updated DataManager.getActivities()');
    console.log('  2. Clear browser cache/localStorage');
    console.log('  3. Test loading activities for current user');
    console.log('  4. Monitor for any data loading issues\n');

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    await closePool();
    process.exit(1);
  }
}

migrateActivitiesByUserMonth();
