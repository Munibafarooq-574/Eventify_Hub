// fyp-backend/src/vendor/growth/plan-config.ts

import {
  FeatureKey,
  LimitKey,
  SubscriptionPlan,
} from './subscription/subscription.types';

export interface PlanDefinition {
  key: SubscriptionPlan;
  name: string;

  // Real backend-controlled subscription price.
  // null means Admin has not configured a price yet.
  monthlyPrice: number | null;

  priceLabel: string;

  isPurchasable: boolean;
  isMostPopular: boolean;

  description: string;

  features: Record<FeatureKey, boolean>;
  limits: Record<LimitKey, number>;
}

type StaticPlanDefinition = Omit<
  PlanDefinition,
  'monthlyPrice' | 'priceLabel'
>;

const BASE_FEATURES: Record<FeatureKey, boolean> = {
  [FeatureKey.FEATURED_VENDOR]: false,
  [FeatureKey.FEATURED_PACKAGE]: false,
  [FeatureKey.PROMOTIONAL_BADGES]: false,
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
};

const BASE_LIMITS: Record<LimitKey, number> = {
  [LimitKey.FEATURED_VENDOR_LIMIT]: 0,
  [LimitKey.FEATURED_PACKAGE_LIMIT]: 0,
  [LimitKey.COUPON_LIMIT]: 0,
  [LimitKey.DISCOUNT_CODE_LIMIT]: 0,
};

export const PLAN_CONFIG: Record<
  SubscriptionPlan,
  StaticPlanDefinition
> = {
  // ---------------------------------------------------------
  // LEGACY FREE
  // ---------------------------------------------------------
  // Existing old database documents may still contain this.
  // It is never returned as a purchasable plan.
  [SubscriptionPlan.FREE]: {
    key: SubscriptionPlan.FREE,
    name: 'Legacy Free',
    isPurchasable: false,
    isMostPopular: false,
    description:
      'Legacy subscription state retained only for database compatibility.',
    features: {
      ...BASE_FEATURES,
    },
    limits: {
      ...BASE_LIMITS,
    },
  },

  // ---------------------------------------------------------
  // 7-DAY TRIAL
  // ---------------------------------------------------------
  [SubscriptionPlan.TRIAL]: {
    key: SubscriptionPlan.TRIAL,
    name: '7-Day Free Trial',
    isPurchasable: false,
    isMostPopular: false,
    description:
      'Seven-day introductory access automatically provided to newly registered vendors.',
    features: {
      ...BASE_FEATURES,
    },
    limits: {
      ...BASE_LIMITS,
    },
  },

  // ---------------------------------------------------------
  // BASIC
  // ---------------------------------------------------------
  [SubscriptionPlan.BASIC]: {
    key: SubscriptionPlan.BASIC,
    name: 'Basic',
    isPurchasable: true,
    isMostPopular: false,
    description:
      'Core Eventify Hub vendor access after the free trial.',
    features: {
      ...BASE_FEATURES,
    },
    limits: {
      ...BASE_LIMITS,
    },
  },

  // ---------------------------------------------------------
  // GROWTH
  // ---------------------------------------------------------
  [SubscriptionPlan.GROWTH]: {
    key: SubscriptionPlan.GROWTH,
    name: 'Growth',
    isPurchasable: true,
    isMostPopular: true,
    description:
      'More visibility, featured placement, coupons and growth analytics.',
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

  // ---------------------------------------------------------
  // PREMIUM
  // ---------------------------------------------------------
  [SubscriptionPlan.PREMIUM]: {
    key: SubscriptionPlan.PREMIUM,
    name: 'Premium',
    isPurchasable: true,
    isMostPopular: false,
    description:
      'Advanced promotions, analytics, business insights and priority benefits.',
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

function parseConfiguredPrice(
  value: string | undefined,
): number | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

export function getConfiguredPlanPrice(
  plan: SubscriptionPlan,
): number | null {
  switch (plan) {
    case SubscriptionPlan.BASIC:
      return parseConfiguredPrice(
        process.env.SUBSCRIPTION_BASIC_PRICE_PKR,
      );

    case SubscriptionPlan.GROWTH:
      return parseConfiguredPrice(
        process.env.SUBSCRIPTION_GROWTH_PRICE_PKR,
      );

    case SubscriptionPlan.PREMIUM:
      return parseConfiguredPrice(
        process.env.SUBSCRIPTION_PREMIUM_PRICE_PKR,
      );

    case SubscriptionPlan.TRIAL:
    case SubscriptionPlan.FREE:
    default:
      return 0;
  }
}

function formatPriceLabel(
  plan: SubscriptionPlan,
  price: number | null,
): string {
  if (
    plan === SubscriptionPlan.TRIAL
  ) {
    return 'Free for 7 days';
  }

  if (
    plan === SubscriptionPlan.FREE
  ) {
    return 'Legacy';
  }

  if (price === null) {
    return 'Price not configured';
  }

  return `Rs. ${price.toLocaleString('en-PK')} / month`;
}

export function getPlanDefinition(
  plan: SubscriptionPlan,
): PlanDefinition {
  const base = PLAN_CONFIG[plan];

  if (!base) {
    throw new Error(
      `Unknown subscription plan: ${plan}`,
    );
  }

  const monthlyPrice =
    getConfiguredPlanPrice(plan);

  return {
    ...base,
    monthlyPrice,
    priceLabel: formatPriceLabel(
      plan,
      monthlyPrice,
    ),
  };
}

export function getAllPlanDefinitions(): PlanDefinition[] {
  // Only actual paid plans appear in purchase UI.
  return [
    getPlanDefinition(
      SubscriptionPlan.BASIC,
    ),
    getPlanDefinition(
      SubscriptionPlan.GROWTH,
    ),
    getPlanDefinition(
      SubscriptionPlan.PREMIUM,
    ),
  ];
}