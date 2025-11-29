/**
 * Migration Script: Set Default Trust Scores for Existing Businesses
 * 
 * This script updates all approved businesses that have trust_score = 0 or missing
 * to have a default trust score of 50 (Basic tier default).
 * 
 * Run this script once after deploying the production fixes.
 * 
 * Usage: node backend/scripts/set-default-trust-scores.js
 */

const admin = require('firebase-admin');
require('dotenv').config({ path: '../.env' });

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  }),
});

const db = admin.firestore();

async function setDefaultTrustScores() {
  console.log('🚀 Starting trust score migration...\n');

  try {
    // Fetch all approved businesses
    const snapshot = await db
      .collection('businesses')
      .where('verification.status', '==', 'approved')
      .get();

    console.log(`📊 Found ${snapshot.size} approved businesses\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentTrustScore = data.trust_score;

      // Only update if trust_score is 0, null, or undefined
      if (!currentTrustScore || currentTrustScore === 0) {
        // Calculate tier-based default score
        const tier = data.verification?.tier || 1;
        const defaultScore = tier === 3 ? 85 : tier === 2 ? 70 : 50;

        batch.update(doc.ref, { trust_score: defaultScore });
        updated++;
        batchCount++;

        console.log(`✅ ${doc.id} → trust_score: ${defaultScore} (Tier ${tier})`);

        // Commit batch if we hit the limit
        if (batchCount >= batchSize) {
          await batch.commit();
          console.log(`\n📦 Batch committed (${batchCount} updates)\n`);
          batch = db.batch();
          batchCount = 0;
        }
      } else {
        skipped++;
        console.log(`⏭️  ${doc.id} → already has trust_score: ${currentTrustScore}`);
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n📦 Final batch committed (${batchCount} updates)\n`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 MIGRATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`✅ Updated: ${updated} businesses`);
    console.log(`⏭️  Skipped: ${skipped} businesses (already had trust scores)`);
    console.log(`❌ Errors: ${errors} businesses`);
    console.log('='.repeat(60) + '\n');

    console.log('💡 Next steps:');
    console.log('  1. Verify marketplace search shows trust scores');
    console.log('  2. Check business dashboards show trust scores');
    console.log('  3. Test account checks show verified businesses with scores\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
setDefaultTrustScores()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
