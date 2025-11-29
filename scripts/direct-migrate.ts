/**
 * DIRECT MIGRATION SCRIPT - Uses Admin API Endpoint
 * This script calls the backend admin API to migrate businesses
 * 
 * Usage:
 * 1. Make sure backend is running: npm run start:dev
 * 2. Get admin JWT token from Firebase (see instructions below)
 * 3. Run: ADMIN_TOKEN=your_token npm run migrate:direct
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:8080';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function migrateViaApi() {
  console.log('🚀 Starting marketplace migration via Admin API...\n');

  if (!ADMIN_TOKEN) {
    console.error('❌ Error: ADMIN_TOKEN environment variable not set');
    console.log('\n📝 To get your admin token:');
    console.log('1. Open your app in browser');
    console.log('2. Login as admin');
    console.log('3. Open DevTools Console');
    console.log('4. Run: localStorage.getItem("firebase:authUser:...")');
    console.log('5. Copy the "stsTokenManager.accessToken" value');
    console.log('6. Run: ADMIN_TOKEN=your_token npm run migrate:direct\n');
    process.exit(1);
  }

  try {
    // Call admin migration endpoint
    console.log('📊 Calling admin migration endpoint...\n');
    
    const response = await axios.post(
      `${API_URL}/admin/business/migrate-marketplace`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Migration successful!\n');
    console.log('📊 Results:');
    console.log(`   Migrated: ${response.data.migrated}`);
    console.log(`   Already Active: ${response.data.alreadyActive}`);
    console.log(`   Failed: ${response.data.failed}`);
    console.log(`   Total: ${response.data.total}\n`);

    if (response.data.errors && response.data.errors.length > 0) {
      console.log('⚠️  Errors:');
      response.data.errors.forEach((err: string) => console.log(`   - ${err}`));
      console.log();
    }

    // Get final stats
    const statsResponse = await axios.get(
      `${API_URL}/admin/business/marketplace-stats`,
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
        },
      }
    );

    console.log('📊 Final Stats:');
    console.log(`   Active marketplace listings: ${statsResponse.data.activeCount}\n`);

    process.exit(0);
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API Error:', error.response.data);
      console.error('Status:', error.response.status);
    } else {
      console.error('❌ Migration failed:', error.message);
    }
    process.exit(1);
  }
}

// Run migration
migrateViaApi();
