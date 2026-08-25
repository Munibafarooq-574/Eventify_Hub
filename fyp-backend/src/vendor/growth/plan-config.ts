// fyp-backend/src/vendor/growth/plan-config.ts
//
// SINGLE SOURCE OF TRUTH for what each plan includes. Nothing else in the
// codebase should hardcode `if (plan === 'premium')`-style feature checks —
// everything should go through FeatureAccessService, which reads from here.
//
// To change a limit (e.g. Growth coupon limit 5 -> 8), edit this file only.

import { FeatureKey, LimitKey, SubscriptionPlan } from './subscription/subscription.types';

export interface PlanDefinition {
  key: SubscriptionPlan;
  name: string;
  priceLabel: string; // display only — demo mode has no real billing yet
  isMostPopular: boolean;
  description: string;
  features: Record<FeatureKey, boolean>;
  limits: Record<LimitKey, number>;
}

export const PLAN_CONFIG: Record<SubscriptionPlan, PlanDefinition> = {
  [SubscriptionPlan.FREE]: {
    key: SubscriptionPlan.FREE,
    name: 'Free',
    priceLabel: 'Rs. 0 / month',
    isMostPopular: false,
    description: 'Basic business tools',
    features: {
      [FeatureKey.FEATURED_VENDOR]: false,
      [FeatureKey.FEATURED_PACKAGE]: false,
      [FeatureKey.PROMOTIONAL_BADGES]: false, // earned/system badges only
      [FeatureKey.COUPONS]: false,
      [FeatureKey.DISCOUNT_CODES]: false,
      [FeatureKey.ADVANCED_PROMOTIONS]: false,
      [FeatureKey.GROWTH_ANALYTICS]: false,
      [FeatureKey.ADVANCED_ANALYTICS]: false,
      [FeatureKey.BUSINESS_INSIGHTS]: false,
      [FeatureKey.PREMIUM_BADGE]: false,
      [FeatureKey.PRIORITY_VISIBILITY]: false,
      [FeatureKey.PRIORITY_NOTIFICATIONS]: false,
      [FeatureKey.PRIORITY_SUPPORT]: false,
    },
    limits: {
      [LimitKey.FEATURED_VENDOR_LIMIT]: 0,
      [LimitKey.FEATURED_PACKAGE_LIMIT]: 0,
      [LimitKey.COUPON_LIMIT]: 0,
      [LimitKey.DISCOUNT_CODE_LIMIT]: 0,
    },
  },

  [SubscriptionPlan.GROWTH]: {
    key: SubscriptionPlan.GROWTH,
    name: 'Growth',
    priceLabel: 'Rs. XXX / month',
    isMostPopular: true,
    description: 'More customers, featured visibility, coupons, advanced analytics',
    features: {
      [FeatureKey.FEATURED_VENDOR]: true,
      [FeatureKey.FEATURED_PACKAGE]: true,
      [FeatureKey.PROMOTIONAL_BADGES]: true,
      [FeatureKey.COUPONS]: true,
      [FeatureKey.DISCOUNT_CODES]: true,
      [FeatureKey.ADVANCED_PROMOTIONS]: false,
      [FeatureKey.GROWTH_ANALYTICS]: true,
      [FeatureKey.ADVANCED_ANALYTICS]: false,
      [FeatureKey.BUSINESS_INSIGHTS]: false,
      [FeatureKey.PREMIUM_BADGE]: false,
      [FeatureKey.PRIORITY_VISIBILITY]: true,
      [FeatureKey.PRIORITY_NOTIFICATIONS]: false,
      [FeatureKey.PRIORITY_SUPPORT]: false,
    },
    limits: {
      [LimitKey.FEATURED_VENDOR_LIMIT]: 1,
      [LimitKey.FEATURED_PACKAGE_LIMIT]: 1,
      [LimitKey.COUPON_LIMIT]: 5,
      [LimitKey.DISCOUNT_CODE_LIMIT]: 5,
    },
  },

  [SubscriptionPlan.PREMIUM]: {
    key: SubscriptionPlan.PREMIUM,
    name: 'Premium',
    priceLabel: 'Rs. XXX / month',
    isMostPopular: false,
    description: 'More visibility, advanced promotions, advanced analytics, business insights',
    features: {
      [FeatureKey.FEATURED_VENDOR]: true,
      [FeatureKey.FEATURED_PACKAGE]: true,
      [FeatureKey.PROMOTIONAL_BADGES]: true,
      [FeatureKey.COUPONS]: true,
      [FeatureKey.DISCOUNT_CODES]: true,
      [FeatureKey.ADVANCED_PROMOTIONS]: true,
      [FeatureKey.GROWTH_ANALYTICS]: true,
      [FeatureKey.ADVANCED_ANALYTICS]: true,
      [FeatureKey.BUSINESS_INSIGHTS]: true,
      [FeatureKey.PREMIUM_BADGE]: true,
      [FeatureKey.PRIORITY_VISIBILITY]: true,
      [FeatureKey.PRIORITY_NOTIFICATIONS]: true,
      [FeatureKey.PRIORITY_SUPPORT]: true,
    },
    limits: {
      [LimitKey.FEATURED_VENDOR_LIMIT]: 2,
      [LimitKey.FEATURED_PACKAGE_LIMIT]: 3,
      [LimitKey.COUPON_LIMIT]: 15,
      [LimitKey.DISCOUNT_CODE_LIMIT]: 15,
    },
  },
};

export function getPlanDefinition(plan: SubscriptionPlan): PlanDefinition {
  return PLAN_CONFIG[plan];
}

export function getAllPlanDefinitions(): PlanDefinition[] {
  return [
    PLAN_CONFIG[SubscriptionPlan.FREE],
    PLAN_CONFIG[SubscriptionPlan.GROWTH],
    PLAN_CONFIG[SubscriptionPlan.PREMIUM],
  ];
}