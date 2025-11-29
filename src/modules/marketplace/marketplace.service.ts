import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { SearchMarketplaceDto } from '../business/dto/search-marketplace.dto';
import { MarketplaceActionType } from '../business/dto/track-action.dto';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private readonly db = admin.firestore();

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate ranking score based on distance and trust score
   * Formula: (Distance Score × 0.4) + (Trust Score × 0.6)
   */
  private calculateRankingScore(distance: number, trustScore: number): number {
    // Distance score: 0km = 100, 5km = 50, 10km = 0, >10km = 0
    let distanceScore = 0;
    if (distance <= 5) {
      distanceScore = 100 - (distance / 5) * 50;
    } else if (distance <= 10) {
      distanceScore = 50 - ((distance - 5) / 5) * 50;
    }

    return distanceScore * 0.4 + trustScore * 0.6;
  }

  /**
   * Check if business matches search query
   */
  private matchesSearchQuery(business: any, query: string): boolean {
    if (!query) return true;

    const searchLower = query.toLowerCase();
    const name = business.name?.toLowerCase() || '';
    const tagline = business.marketplace?.profile?.tagline?.toLowerCase() || '';
    const description =
      business.marketplace?.profile?.description?.toLowerCase() || '';
    const products = business.marketplace?.profile?.products || [];
    const services = business.marketplace?.profile?.services || [];

    // Check name (highest priority)
    if (name.includes(searchLower)) return true;

    // Check products (high priority)
    if (
      products.some((p: string) => p.toLowerCase().includes(searchLower))
    ) {
      return true;
    }

    // Check services (medium priority)
    if (
      services.some((s: string) => s.toLowerCase().includes(searchLower))
    ) {
      return true;
    }

    // Check tagline (medium priority)
    if (tagline.includes(searchLower)) return true;

    // Check description (low priority)
    if (description.includes(searchLower)) return true;

    return false;
  }

  /**
   * Search businesses in marketplace
   */
  async searchBusinesses(filters: SearchMarketplaceDto) {
    this.logger.log(
      `🔍 SEARCH REQUEST: query="${filters.q || 'all'}", location: ${filters.lat || 'N/A'}, ${filters.lng || 'N/A'}`,
    );

    try {
      // Query all verified businesses
      const snapshot = await this.db
        .collection('businesses')
        .where('verification.verified', '==', true)
        .get();

      this.logger.log(`✅ Found ${snapshot.docs.length} verified businesses total`);

      // Build businesses array with full doc data for search matching
      let businessesWithDocs = snapshot.docs
        .filter((doc) => {
          const data = doc.data();
          const hasActive = data.marketplace?.status === 'active';
          if (!hasActive) {
            this.logger.debug(`❌ Filtered out ${data.name}: marketplace status = ${data.marketplace?.status}`);
          }
          return hasActive;
        })
        .map((doc) => {
          const data = doc.data();
          return {
            doc: data, // Keep full doc for search
            businessId: doc.id,
            name: data.name,
            tagline: data.marketplace?.profile?.tagline || '',
            trustScore: data.trust_score || 0,
            products: data.marketplace?.profile?.products || [],
            services: data.marketplace?.profile?.services || [],
            rating: data.rating || 0,
            reviewCount: data.review_count || 0,
            thumbnail: data.marketplace?.profile?.photos?.primary || data.logo,
            location: data.marketplace?.profile?.location,
            coordinates: data.marketplace?.profile?.location?.coordinates,
            distance: 0, // Will be calculated
            rankingScore: 0, // Will be calculated
          };
        });

      this.logger.log(`✅ ${businessesWithDocs.length} have active marketplace status`);

      // Filter by search query
      if (filters.q) {
        this.logger.log(`🔍 Applying search filter for: "${filters.q}"`);
        const beforeFilter = businessesWithDocs.length;
        
        businessesWithDocs = businessesWithDocs.filter((b) => {
          const matches = this.matchesSearchQuery(b.doc, filters.q);
          if (matches) {
            this.logger.log(`   ✅ "${b.name}" matches "${filters.q}"`);
          } else {
            this.logger.debug(`   ❌ "${b.name}" does NOT match "${filters.q}"`);
          }
          return matches;
        });
        
        this.logger.log(`✅ ${businessesWithDocs.length}/${beforeFilter} match search query: "${filters.q}"`);
        
        if (businessesWithDocs.length === 0) {
          this.logger.warn(`⚠️  NO RESULTS for "${filters.q}" - Check business data structure!`);
        }
      }

      // Convert to businesses array (remove doc reference)
      let businesses = businessesWithDocs.map(({ doc, ...business }) => business);

      // Calculate distance if coordinates provided
      if (filters.lat && filters.lng) {
        businesses = businesses
          .map((b) => {
            if (b.coordinates) {
              b.distance = this.calculateDistance(
                filters.lat,
                filters.lng,
                b.coordinates.lat,
                b.coordinates.lng,
              );
            } else {
              b.distance = null; // No location = no distance
            }
            return b;
          })
          // Only filter by radius if business HAS coordinates
          .filter((b) => b.distance === null || b.distance <= filters.radius);
      }

      // Calculate ranking score
      businesses = businesses.map((b) => {
        b.rankingScore = this.calculateRankingScore(b.distance, b.trustScore);
        return b;
      });

      // Sort by ranking score (highest first)
      businesses.sort((a, b) => b.rankingScore - a.rankingScore);

      // Pagination
      const page = filters.page || 1;
      const limit = filters.limit || 5;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBusinesses = businesses.slice(startIndex, endIndex);

      this.logger.log(
        `Found ${businesses.length} businesses, returning ${paginatedBusinesses.length}`,
      );

      return {
        businesses: paginatedBusinesses.map((b) => ({
          businessId: b.businessId,
          name: b.name,
          tagline: b.tagline,
          trustScore: b.trustScore,
          products: b.products,
          services: b.services,
          distance: filters.lat && filters.lng && b.distance !== null 
            ? parseFloat(b.distance.toFixed(1)) 
            : null,
          rating: b.rating,
          reviewCount: b.reviewCount,
          thumbnail: b.thumbnail,
          location: {
            area: b.location?.area,
            city: b.location?.city,
          },
        })),
        totalResults: businesses.length,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error(
        `Marketplace search failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get full business profile for marketplace
   */
  async getBusinessProfile(businessId: string) {
    this.logger.log(`Fetching marketplace profile for: ${businessId}`);

    try {
      const doc = await this.db.collection('businesses').doc(businessId).get();

      if (!doc.exists) {
        throw new Error('Business not found');
      }

      const business = doc.data();

      // Increment profile views
      await this.db
        .collection('businesses')
        .doc(businessId)
        .update({
          'marketplace.analytics.views': admin.firestore.FieldValue.increment(1),
          'marketplace.analytics.lastViewedAt':
            admin.firestore.FieldValue.serverTimestamp(),
        });

      return {
        success: true,
        data: {
          businessId: doc.id,
          name: business.name,
          logo: business.logo,
          category: business.category,
          trustScore: business.trust_score || 0,
          rating: business.rating || 0,
          reviewCount: business.review_count || 0,
          profile: business.marketplace?.profile || {},
          analytics: business.marketplace?.analytics || {},
          verification: business.verification,
          hedera: business.hedera,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch business profile: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Track user action (website click, directions, etc.)
   */
  async trackAction(businessId: string, actionType: MarketplaceActionType) {
    this.logger.log(`Tracking ${actionType} for business: ${businessId}`);

    try {
      const fieldMap = {
        [MarketplaceActionType.WEBSITE_CLICK]: 'websiteClicks',
        [MarketplaceActionType.DIRECTIONS]: 'directionRequests',
        [MarketplaceActionType.PHONE_CALL]: 'phoneClicks',
        [MarketplaceActionType.WHATSAPP]: 'whatsappClicks',
      };

      const field = fieldMap[actionType];

      await this.db
        .collection('businesses')
        .doc(businessId)
        .update({
          [`marketplace.analytics.${field}`]:
            admin.firestore.FieldValue.increment(1),
        });

      return {
        success: true,
        message: 'Action tracked successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to track action: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Utility: Strip class instances and convert to plain objects
   */
  private toPlainObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.toPlainObject(item));
    }
    
    if (typeof obj === 'object') {
      // Use structuredClone if available, otherwise JSON parse/stringify
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch (error) {
        this.logger.error('Failed to serialize object:', error);
        throw new Error('Invalid data format');
      }
    }
    
    return obj;
  }

  /**
   * Update marketplace profile
   */
  async updateProfile(businessId: string, profileData: any) {
    this.logger.log(`Updating marketplace profile for: ${businessId}`);

    try {
      const updateData: any = {};

      if (profileData.tagline !== undefined) {
        updateData['marketplace.profile.tagline'] = profileData.tagline;
      }
      if (profileData.description !== undefined) {
        updateData['marketplace.profile.description'] =
          profileData.description;
      }
      if (profileData.products !== undefined) {
        updateData['marketplace.profile.products'] = profileData.products;
      }
      if (profileData.services !== undefined) {
        updateData['marketplace.profile.services'] = profileData.services;
      }
      if (profileData.photos !== undefined) {
        // Convert PhotosDto to plain object to avoid Firestore serialization error
        updateData['marketplace.profile.photos'] = this.toPlainObject(profileData.photos);
      }
      if (profileData.hours !== undefined) {
        updateData['marketplace.profile.hours'] = this.toPlainObject(profileData.hours);
      }
      if (profileData.contact !== undefined) {
        updateData['marketplace.profile.contact'] = this.toPlainObject(profileData.contact);
      }
      if (profileData.location !== undefined) {
        updateData['marketplace.profile.location'] = this.toPlainObject(profileData.location);
      }

      this.logger.log(`Update data prepared for Firestore: ${JSON.stringify(updateData, null, 2)}`);

      await this.db
        .collection('businesses')
        .doc(businessId)
        .update(updateData);

      return {
        success: true,
        message: 'Marketplace profile updated successfully',
      };
    } catch (error) {
      this.logger.error(
        `Failed to update marketplace profile: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Activate marketplace listing (auto-grant on registration)
   */
  async activateMarketplace(businessId: string) {
    this.logger.log(`Activating marketplace for business: ${businessId}`);

    try {
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      await this.db
        .collection('businesses')
        .doc(businessId)
        .update({
          'marketplace.status': 'active',
          'marketplace.registeredAt':
            admin.firestore.FieldValue.serverTimestamp(),
          'marketplace.expiryDate': admin.firestore.Timestamp.fromDate(
            oneMonthFromNow,
          ),
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

      return {
        success: true,
        message: 'Marketplace activated with 1-month free period',
        expiryDate: oneMonthFromNow.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to activate marketplace: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Renew marketplace subscription (direct - no payment)
   */
  async renewSubscription(businessId: string) {
    this.logger.log(`Renewing marketplace subscription for: ${businessId}`);

    try {
      const doc = await this.db.collection('businesses').doc(businessId).get();

      if (!doc.exists) {
        throw new Error('Business not found');
      }

      const business = doc.data();
      const currentExpiry = business.marketplace?.expiryDate?.toDate() || new Date();
      
      // If expired, renew from now; if active, extend from current expiry
      const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(baseDate);
      newExpiry.setMonth(newExpiry.getMonth() + 1);

      await this.db
        .collection('businesses')
        .doc(businessId)
        .update({
          'marketplace.status': 'active',
          'marketplace.expiryDate':
            admin.firestore.Timestamp.fromDate(newExpiry),
        });

      return {
        success: true,
        message: 'Subscription renewed successfully',
        newExpiryDate: newExpiry.toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to renew subscription: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Initialize Paystack payment for marketplace renewal (₦1,000)
   */
  async initializeRenewalPayment(businessId: string, email: string) {
    this.logger.log(`Initializing renewal payment for: ${businessId}`);

    try {
      const doc = await this.db.collection('businesses').doc(businessId).get();

      if (!doc.exists) {
        throw new Error('Business not found');
      }

      const business = doc.data();

      // Initialize Paystack payment for ₦1,000
      const paystackUrl = 'https://api.paystack.co/transaction/initialize';
      const paystackKey = process.env.PAYSTACK_SECRET_KEY;

      if (!paystackKey) {
        throw new Error('Paystack configuration missing');
      }

      const amount = 100000; // ₦1,000 in kobo
      const reference = `marketplace_renewal_${businessId}_${Date.now()}`;

      const paystackResponse = await fetch(paystackUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount,
          reference,
          metadata: {
            businessId,
            businessName: business.name,
            purpose: 'marketplace_renewal',
            custom_fields: [
              {
                display_name: 'Business ID',
                variable_name: 'business_id',
                value: businessId,
              },
              {
                display_name: 'Purpose',
                variable_name: 'purpose',
                value: 'Marketplace Subscription Renewal',
              },
            ],
          },
          callback_url: `${process.env.FRONTEND_URL || 'http://localhost:8081'}/business/dashboard?renewal=success`,
        }),
      });

      if (!paystackResponse.ok) {
        const error = await paystackResponse.json();
        this.logger.error('Paystack error:', error);
        throw new Error(error.message || 'Payment initialization failed');
      }

      const paystackData = await paystackResponse.json();

      // Store payment reference in Firestore
      await this.db
        .collection('marketplace_payments')
        .doc(reference)
        .set({
          businessId,
          reference,
          amount,
          email,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return {
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference,
      };
    } catch (error) {
      this.logger.error(
        `Failed to initialize renewal payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verify marketplace renewal payment and activate subscription
   */
  async verifyRenewalPayment(businessId: string, reference: string) {
    this.logger.log(`Verifying renewal payment for: ${businessId}, ref: ${reference}`);

    try {
      // Verify with Paystack
      const paystackKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackKey) {
        throw new Error('Paystack configuration missing');
      }

      const verifyUrl = `https://api.paystack.co/transaction/verify/${reference}`;
      const verifyResponse = await fetch(verifyUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackKey}`,
        },
      });

      if (!verifyResponse.ok) {
        throw new Error('Payment verification failed');
      }

      const verifyData = await verifyResponse.json();

      if (verifyData.data.status !== 'success') {
        throw new Error('Payment was not successful');
      }

      // Renew subscription
      const renewalResult = await this.renewSubscription(businessId);

      // Update payment record
      await this.db
        .collection('marketplace_payments')
        .doc(reference)
        .update({
          status: 'completed',
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          paystackData: verifyData.data,
        });

      return {
        success: true,
        message: 'Payment verified and subscription renewed',
        newExpiryDate: renewalResult.newExpiryDate,
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify renewal payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
