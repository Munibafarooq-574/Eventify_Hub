// fyp-backend/src/vendor/growth/feature-access.service.ts
//
// THE single place that answers "can this vendor do X". Every future
// module (promotion, discount, badges, analytics) should inject this
// service instead of re-checking `subscription.plan === '...'` itself.

import { Injectable } from '@nestjs/common';
import { SubscriptionService } from './subscription/subscription.service';
import { FeatureKey, LimitKey, SubscriptionPlan } from './subscription/subscription.types';
import { getPlanDefinition } from './plan-config';

@Injectable()
export class FeatureAccessService {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async getCurrentPlan(vendorId: string): Promise<SubscriptionPlan> {
    const subscription = await this.subscriptionService.getCurrentSubscription(vendorId);
    return subscription.plan;
  }

  async hasActiveSubscription(vendorId: string): Promise<boolean> {
    const plan = await this.getCurrentPlan(vendorId);
    return plan !== SubscriptionPlan.FREE;
  }

  /**
   * Boolean-style feature check, e.g.
   *   featureAccessService.canUseFeature(vendorId, FeatureKey.COUPONS)
   */
  async canUseFeature(vendorId: string, feature: FeatureKey): Promise<boolean> {
    const plan = await this.getCurrentPlan(vendorId);
    return getPlanDefinition(plan).features[feature] === true;
  }

  /**
   * Numeric-limit check, e.g.
   *   featureAccessService.getFeatureLimit(vendorId, LimitKey.COUPON_LIMIT)
   * Returns 0 if the vendor's plan doesn't include that limit at all.
   */
  async getFeatureLimit(vendorId: string, limit: LimitKey): Promise<number> {
    const plan = await this.getCurrentPlan(vendorId);
    return getPlanDefinition(plan).limits[limit] ?? 0;
  }

  /**
   * Convenience helper for count-limited features (coupons, featured
   * packages, etc). Pass in the vendor's current count of that resource;
   * returns whether they're allowed to create one more.
   */
  async canCreateMore(vendorId: string, limit: LimitKey, currentCount: number): Promise<boolean> {
    const max = await this.getFeatureLimit(vendorId, limit);
    return currentCount < max;
  }
}