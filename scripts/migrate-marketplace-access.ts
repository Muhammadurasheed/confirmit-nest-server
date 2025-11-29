/**
 * Migration Script: Grant 1-month free marketplace to all existing verified businesses
 * 
 * Run this script ONCE after deploying the new marketplace feature
 * Usage: npm run ts-node scripts/migrate-marketplace-access.ts
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-jwt-token';
const ADMIN_ID = process.env.ADMIN_ID || 'admin-user-id';

async function migrateMarketplace() {
  console.log('🚀 Starting marketplace migration...\n');

  try {
    // Step 1: Check current stats
    console.log('📊 Checking current marketplace stats...');
    const statsResponse = await axios.get(
      `${API_BASE_URL}/business/admin/marketplace-stats`,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      }
    );

    const stats = statsResponse.data.stats;
    console.log(`
📈 Current Statistics:
   Total Verified Businesses: ${stats.total}
   Already Active: ${stats.active}
   Expired: ${stats.expired}
   Inactive: ${stats.inactive}
   Need Migration: ${stats.needsMigration}
`);

    if (stats.needsMigration === 0) {
      console.log('✅ All businesses already have marketplace access. No migration needed.\n');
      return;
    }

    // Step 2: Confirm migration
    console.log(`⚠️  About to migrate ${stats.needsMigration} businesses to marketplace (1-month free)\n`);
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Step 3: Execute migration
    console.log('🔄 Migrating businesses...\n');
    const migrateResponse = await axios.post(
      `${API_BASE_URL}/business/admin/migrate-marketplace`,
      { adminId: ADMIN_ID },
      {
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      }
    );

    const result = migrateResponse.data;
    console.log(`
✅ Migration Complete!
   Migrated: ${result.migrated}
   Already Active: ${result.alreadyActive}
   Failed: ${result.failed}
   Total: ${result.total}

${result.message}
`);

    // Step 4: Verify final stats
    console.log('📊 Final marketplace stats:');
    const finalStatsResponse = await axios.get(
      `${API_BASE_URL}/business/admin/marketplace-stats`,
      {
        headers: {
          Authorization: `Bearer ${ADMIN_TOKEN}`,
        },
      }
    );

    const finalStats = finalStatsResponse.data.stats;
    console.log(`
   Total Verified Businesses: ${finalStats.total}
   Active: ${finalStats.active}
   Expired: ${finalStats.expired}
   Inactive: ${finalStats.inactive}
   Need Migration: ${finalStats.needsMigration}
`);

    console.log('🎉 Migration completed successfully!\n');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run migration
migrateMarketplace();
