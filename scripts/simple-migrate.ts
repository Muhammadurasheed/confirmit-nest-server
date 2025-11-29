/**
 * SIMPLE MIGRATION SCRIPT - No Auth Required
 * This script directly calls the Firebase database to migrate businesses
 * 
 * Run this ONCE after deploying the marketplace feature:
 * npx ts-node scripts/simple-migrate.ts
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Firebase Admin with environment variables
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (!projectId || !privateKey || !clientEmail) {
  console.error('\n❌ Firebase credentials missing in environment variables!');
  console.error('Required: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      privateKey,
      clientEmail,
    }),
  });
}

const db = admin.firestore();

async function migrateMarketplace() {
  console.log('🚀 Starting marketplace migration (Direct DB Access)...\n');

  try {
    // Get all verified businesses
    const snapshot = await db
      .collection('businesses')
      .where('verification.verified', '==', true)
      .get();

    console.log(`📊 Found ${snapshot.docs.length} verified businesses\n`);

    let migrated = 0;
    let alreadyActive = 0;
    let failed = 0;

    for (const doc of snapshot.docs) {
      const business = doc.data();
      const businessId = doc.id;
      const businessName = business.name || 'Unknown';

      try {
        // Check current marketplace status
        const currentStatus = business.marketplace?.status;

        if (currentStatus === 'active') {
          console.log(`⏭️  ${businessName} - Already active, skipping`);
          alreadyActive++;
          continue;
        }

        // Grant 1-month free marketplace
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

        await db
          .collection('businesses')
          .doc(businessId)
          .update({
            'marketplace.status': 'active',
            'marketplace.registeredAt': admin.firestore.FieldValue.serverTimestamp(),
            'marketplace.expiryDate': admin.firestore.Timestamp.fromDate(oneMonthFromNow),
            'marketplace.analytics': {
              views: 0,
              websiteClicks: 0,
              directionRequests: 0,
              phoneClicks: 0,
              whatsappClicks: 0,
              reviewsCount: 0,
              lastViewedAt: null,
            },
          });

        console.log(`✅ ${businessName} - Migrated (expires ${oneMonthFromNow.toLocaleDateString()})`);
        migrated++;
      } catch (error: any) {
        console.error(`❌ ${businessName} - Failed: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n🎉 Migration Complete!`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Already Active: ${alreadyActive}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total: ${snapshot.docs.length}\n`);

    // Final stats
    const activeSnapshot = await db
      .collection('businesses')
      .where('marketplace.status', '==', 'active')
      .get();

    console.log(`📊 Final Stats:`);
    console.log(`   Active marketplace listings: ${activeSnapshot.docs.length}\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
migrateMarketplace();
