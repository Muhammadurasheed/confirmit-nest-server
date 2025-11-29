import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function diagnoseMarketplace() {
  try {
    console.log('🔍 MARKETPLACE DIAGNOSTIC TOOL\n');
    console.log('=' .repeat(80));

    // Initialize Firebase Admin
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      console.error('\n❌ Firebase credentials missing!');
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
    
    // Get all businesses
    const businessesSnapshot = await db.collection('businesses').get();
    
    console.log(`\n📊 Total Businesses in Database: ${businessesSnapshot.size}\n`);
    
    if (businessesSnapshot.empty) {
      console.log('⚠️  No businesses found!');
      process.exit(0);
    }

    let verifiedCount = 0;
    let activeMarketplaceCount = 0;
    let hasProfileCount = 0;
    let hasProductsCount = 0;

    console.log('=' .repeat(80));
    console.log('BUSINESS DETAILS:');
    console.log('=' .repeat(80));

    businessesSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const name = data.name || 'Unnamed';
      const verified = data.verification?.verified === true;
      const marketplaceStatus = data.marketplace?.status;
      const marketplaceProfile = data.marketplace?.profile;
      const products = marketplaceProfile?.products || [];
      const services = marketplaceProfile?.services || [];
      const tagline = marketplaceProfile?.tagline;
      const description = marketplaceProfile?.description;

      if (verified) verifiedCount++;
      if (marketplaceStatus === 'active') activeMarketplaceCount++;
      if (marketplaceProfile) hasProfileCount++;
      if (products.length > 0) hasProductsCount++;

      console.log(`\n${index + 1}. ${name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Verified: ${verified ? '✅' : '❌'}`);
      console.log(`   Marketplace Status: ${marketplaceStatus || 'NOT SET'}`);
      console.log(`   Has Profile: ${marketplaceProfile ? '✅' : '❌'}`);
      
      if (marketplaceProfile) {
        console.log(`   Tagline: ${tagline || 'NOT SET'}`);
        console.log(`   Description: ${description ? description.substring(0, 50) + '...' : 'NOT SET'}`);
        console.log(`   Products (${products.length}): ${products.length > 0 ? products.join(', ') : 'NONE'}`);
        console.log(`   Services (${services.length}): ${services.length > 0 ? services.join(', ') : 'NONE'}`);
        
        // Check location
        const location = marketplaceProfile.location;
        if (location) {
          console.log(`   Location: ${location.area || 'N/A'}, ${location.city || 'N/A'}`);
          console.log(`   Coordinates: ${location.coordinates ? `${location.coordinates.lat}, ${location.coordinates.lng}` : 'NOT SET'}`);
        } else {
          console.log(`   Location: NOT SET`);
        }
      }
      
      console.log(`   Searchable: ${verified && marketplaceStatus === 'active' ? '✅' : '❌'}`);
    });

    console.log('\n' + '=' .repeat(80));
    console.log('SUMMARY:');
    console.log('=' .repeat(80));
    console.log(`Total Businesses: ${businessesSnapshot.size}`);
    console.log(`✅ Verified: ${verifiedCount}`);
    console.log(`✅ Active Marketplace: ${activeMarketplaceCount}`);
    console.log(`✅ Has Profile: ${hasProfileCount}`);
    console.log(`✅ Has Products: ${hasProductsCount}`);
    console.log(`✅ Searchable (Verified + Active): ${verifiedCount} verified, ${activeMarketplaceCount} active`);

    // Test search functionality
    console.log('\n' + '=' .repeat(80));
    console.log('SEARCH TEST:');
    console.log('=' .repeat(80));
    
    const testQueries = ['nova', 'iphone', 'phone'];
    
    for (const query of testQueries) {
      console.log(`\n🔍 Searching for: "${query}"`);
      
      let matchCount = 0;
      
      businessesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const verified = data.verification?.verified === true;
        const marketplaceStatus = data.marketplace?.status;
        
        if (!verified || marketplaceStatus !== 'active') {
          return;
        }
        
        const name = (data.name || '').toLowerCase();
        const tagline = (data.marketplace?.profile?.tagline || '').toLowerCase();
        const description = (data.marketplace?.profile?.description || '').toLowerCase();
        const products = (data.marketplace?.profile?.products || []).map((p: string) => p.toLowerCase());
        const services = (data.marketplace?.profile?.services || []).map((s: string) => s.toLowerCase());
        
        const searchLower = query.toLowerCase();
        
        const nameMatch = name.includes(searchLower);
        const taglineMatch = tagline.includes(searchLower);
        const descMatch = description.includes(searchLower);
        const productMatch = products.some((p: string) => p.includes(searchLower));
        const serviceMatch = services.some((s: string) => s.includes(searchLower));
        
        if (nameMatch || taglineMatch || descMatch || productMatch || serviceMatch) {
          matchCount++;
          console.log(`   ✅ MATCH: ${data.name}`);
          if (nameMatch) console.log(`      - Name contains "${query}"`);
          if (productMatch) console.log(`      - Product contains "${query}": ${products.filter((p: string) => p.includes(searchLower)).join(', ')}`);
          if (serviceMatch) console.log(`      - Service contains "${query}"`);
          if (taglineMatch) console.log(`      - Tagline contains "${query}"`);
          if (descMatch) console.log(`      - Description contains "${query}"`);
        }
      });
      
      console.log(`   Total matches: ${matchCount}`);
      
      if (matchCount === 0) {
        console.log(`   ❌ NO MATCHES FOUND!`);
        console.log(`   This indicates a search bug or data issue.`);
      }
    }

    console.log('\n' + '=' .repeat(80));

  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run diagnostic
diagnoseMarketplace()
  .then(() => {
    console.log('\n✅ Diagnostic complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Diagnostic failed:', error);
    process.exit(1);
  });
