//fyp-backend/src/vendor/growth/badges/badge.service.ts
//
// Badges are entirely COMPUTED from real data on every request — there is
// no schema/collection for them (deliberately, per "don't implement
// unnecessary complexity"). A vendor can never set/claim a badge; this
// service is the only thing that decides who has one.

import { Injectable } from '@nestjs/common';
import { VendorAnalyticsService } from 'src/vendor/vendor-analytics.service';
import { PromotionService } from '../promotion/promotion.service';
import { FeatureAccessService } from '../feature-access.service';
import { FeatureKey } from '../subscription/subscription.types';
import { BADGE_CONFIG } from './badge-config';
import { BADGE_DEFINITIONS, BadgeKey, VendorBadgeResult } from './badge.types';

@Injectable()
export class BadgeService {
  constructor(
    private readonly vendorAnalyticsService: VendorAnalyticsService,
    private readonly promotionService: PromotionService,
    private readonly featureAccessService: FeatureAccessService,
  ) {}

  async getVendorBadges(vendorId: string): Promise<VendorBadgeResult[]> {
    const [analytics, isFeatured, isPremium] = await Promise.all([
      this.vendorAnalyticsService.getVendorAnalytics(vendorId),
      this.promotionService.hasActiveFeaturedVendorPromotion(vendorId),
      this.featureAccessService.canUseFeature(vendorId, FeatureKey.PREMIUM_BADGE),
    ]);

    const totalCustomers = analytics.repeatCustomers + analytics.newCustomers;

    const earned: Record<BadgeKey, boolean> = {
      [BadgeKey.TOP_RATED]:
        analytics.averageRating !== null &&
        analytics.averageRating >= BADGE_CONFIG.topRated.minAverageRating &&
        analytics.totalReviews >= BADGE_CONFIG.topRated.minReviewCount,

      [BadgeKey.FAST_RESPONSE]:
        analytics.responseTimeMinutes !== null &&
        analytics.responseTimeMinutes <= BADGE_CONFIG.fastResponse.maxAverageResponseMinutes,

      [BadgeKey.POPULAR]: totalCustomers >= BADGE_CONFIG.popular.minTotalCustomers,

      [BadgeKey.FEATURED]: isFeatured,

      [BadgeKey.PREMIUM]: isPremium,
    };

    return Object.values(BADGE_DEFINITIONS).map((def) => ({
      key: def.key,
      label: def.label,
      emoji: def.emoji,
      howToEarn: def.howToEarn,
      earned: earned[def.key],
    }));
  }

  /**
   * Convenience for places that only want the badges the vendor actually
   * has (e.g. rendering a compact badge row on a vendor card).
   */
  async getEarnedVendorBadges(vendorId: string): Promise<VendorBadgeResult[]> {
    const all = await this.getVendorBadges(vendorId);
    return all.filter((b) => b.earned);
  }
}