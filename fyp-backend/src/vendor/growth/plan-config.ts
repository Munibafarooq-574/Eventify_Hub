// fyp-backend/src/vendor/growth/plan-config.ts

import {
  FeatureKey,
  LimitKey,
  SubscriptionPlan,
} from './subscription/subscription.types';

export interface PlanDefinition {
  key: SubscriptionPlan;
  name: string;

  /**
   * Backend-controlled monthly subscription price.
   *
   * null = price has not been configured
   * in environment variables.
   */
  monthlyPrice: number | null;

  priceLabel: string;

  isPurchasable: boolean;
  isMostPopular: boolean;

  description: string;

  features: Record<
    FeatureKey,
    boolean
  >;

  limits: Record<
    LimitKey,
    number
  >;
}

type StaticPlanDefinition =
  Omit<
    PlanDefinition,
    'monthlyPrice' | 'priceLabel'
  >;

// =========================================================
// BASE FEATURES
// =========================================================

const BASE_FEATURES: Record<
  FeatureKey,
  boolean
> = {
  [FeatureKey.FEATURED_VENDOR]:
    false,

  [FeatureKey.FEATURED_PACKAGE]:
    false,

  [FeatureKey.PROMOTIONAL_BADGES]:
    false,

  [FeatureKey.COUPONS]:
    false,

  [FeatureKey.DISCOUNT_CODES]:
    false,

  [FeatureKey.ADVANCED_PROMOTIONS]:
    false,

  [FeatureKey.GROWTH_ANALYTICS]:
    false,

  [FeatureKey.ADVANCED_ANALYTICS]:
    false,

  [FeatureKey.BUSINESS_INSIGHTS]:
    false,

  [FeatureKey.PREMIUM_BADGE]:
    false,

  [FeatureKey.PRIORITY_VISIBILITY]:
    false,

  [FeatureKey.PRIORITY_NOTIFICATIONS]:
    false,

  [FeatureKey.PRIORITY_SUPPORT]:
    false,

  [FeatureKey.CAMPAIGNS]:
    false,

  [FeatureKey.FEATURED_ELIGIBILITY]:
    false,

  [FeatureKey.CAMPAIGN_ANALYTICS]:
    false,

  [FeatureKey.SEASONAL_CAMPAIGN_ELIGIBILITY]:
    false,
};

// =========================================================
// BASE LIMITS
// =========================================================

const BASE_LIMITS: Record<
  LimitKey,
  number
> = {
  [LimitKey.FEATURED_VENDOR_LIMIT]:
    0,

  [LimitKey.FEATURED_PACKAGE_LIMIT]:
    0,

  [LimitKey.COUPON_LIMIT]:
    0,

  [LimitKey.DISCOUNT_CODE_LIMIT]:
    0,

  [LimitKey.MAX_PACKAGES]:
    0,

  [LimitKey.MAX_PORTFOLIO_IMAGES]:
    0,

  [LimitKey.MAX_IMAGES_PER_PACKAGE]:
    0,

  [LimitKey.MONTHLY_CAMPAIGN_LIMIT]:
    0,
};

// =========================================================
// PLAN CONFIG
// =========================================================
//
// IMPORTANT:
//
// Trial is NOT a separate plan.
//
// Trial Vendor:
//
// plan   = BASIC
// status = TRIAL
//
// Therefore the 7-day trial automatically uses
// BASIC plan entitlements.
//
// =========================================================

export const PLAN_CONFIG: Record<
  SubscriptionPlan,
  StaticPlanDefinition
> = {
  // ---------------------------------------------------------
  // LEGACY FREE
  // ---------------------------------------------------------

  /**
   * Existing old database documents may still contain FREE.
   *
   * It must never appear as a purchasable plan.
   *
   * SubscriptionService converts legacy FREE records into
   * the BASIC trial lifecycle before normal feature access
   * is evaluated.
   */
  [SubscriptionPlan.FREE]: {
    key:
      SubscriptionPlan.FREE,

    name:
      'Legacy Free',

    isPurchasable:
      false,

    isMostPopular:
      false,

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
  // BASIC
  // ---------------------------------------------------------

  /**
   * BASIC is:
   *
   * - the entry paid subscription
   * - the entitlement plan used during the 7-day trial
   *
   * Trial:
   * plan = BASIC
   * status = TRIAL
   *
   * Paid:
   * plan = BASIC
   * status = ACTIVE
   * paymentStatus = PAID
   */
  [SubscriptionPlan.BASIC]: {
    key:
      SubscriptionPlan.BASIC,

    name:
      'Basic',

    isPurchasable:
      true,

    isMostPopular:
      false,

    description:
      'Essential tools to run your Eventify Hub vendor business.',

    features: {
      ...BASE_FEATURES,
    },

    limits: {
      ...BASE_LIMITS,

      [LimitKey.MAX_PACKAGES]:
        5,

      [LimitKey.MAX_PORTFOLIO_IMAGES]:
        10,

      [LimitKey.MAX_IMAGES_PER_PACKAGE]:
        3,

      [LimitKey.MONTHLY_CAMPAIGN_LIMIT]:
        0,
    },
  },

  // ---------------------------------------------------------
  // GROWTH
  // ---------------------------------------------------------

  [SubscriptionPlan.GROWTH]: {
    key:
      SubscriptionPlan.GROWTH,

    name:
      'Growth',

    isPurchasable:
      true,

    isMostPopular:
      true,

    description:
      'Grow your business with increased visibility, promotions and analytics.',

    features: {
      [FeatureKey.FEATURED_VENDOR]:
        true,

      [FeatureKey.FEATURED_PACKAGE]:
        true,

      [FeatureKey.PROMOTIONAL_BADGES]:
        true,

      [FeatureKey.COUPONS]:
        true,

      [FeatureKey.DISCOUNT_CODES]:
        true,

      [FeatureKey.ADVANCED_PROMOTIONS]:
        false,

      [FeatureKey.GROWTH_ANALYTICS]:
        true,

      [FeatureKey.ADVANCED_ANALYTICS]:
        true,

      [FeatureKey.BUSINESS_INSIGHTS]:
        true,

      [FeatureKey.PREMIUM_BADGE]:
        false,

      [FeatureKey.PRIORITY_VISIBILITY]:
        true,

      [FeatureKey.PRIORITY_NOTIFICATIONS]:
        false,

      [FeatureKey.PRIORITY_SUPPORT]:
        false,

      [FeatureKey.CAMPAIGNS]:
        true,

      [FeatureKey.FEATURED_ELIGIBILITY]:
        true,

      [FeatureKey.CAMPAIGN_ANALYTICS]:
        true,

      [FeatureKey.SEASONAL_CAMPAIGN_ELIGIBILITY]:
        true,
    },

    limits: {
      [LimitKey.FEATURED_VENDOR_LIMIT]:
        1,

      [LimitKey.FEATURED_PACKAGE_LIMIT]:
        1,

      [LimitKey.COUPON_LIMIT]:
        5,

      [LimitKey.DISCOUNT_CODE_LIMIT]:
        5,

      [LimitKey.MAX_PACKAGES]:
        10,

      [LimitKey.MAX_PORTFOLIO_IMAGES]:
        30,

      [LimitKey.MAX_IMAGES_PER_PACKAGE]:
        6,

      [LimitKey.MONTHLY_CAMPAIGN_LIMIT]:
        2,
    },
  },

  // ---------------------------------------------------------
  // PREMIUM
  // ---------------------------------------------------------

  [SubscriptionPlan.PREMIUM]: {
    key:
      SubscriptionPlan.PREMIUM,

    name:
      'Premium',

    isPurchasable:
      true,

    isMostPopular:
      false,

    description:
      'Maximum exposure with advanced promotions, analytics and priority benefits.',

    features: {
      [FeatureKey.FEATURED_VENDOR]:
        true,

      [FeatureKey.FEATURED_PACKAGE]:
        true,

      [FeatureKey.PROMOTIONAL_BADGES]:
        true,

      [FeatureKey.COUPONS]:
        true,

      [FeatureKey.DISCOUNT_CODES]:
        true,

      [FeatureKey.ADVANCED_PROMOTIONS]:
        true,

      [FeatureKey.GROWTH_ANALYTICS]:
        true,

      [FeatureKey.ADVANCED_ANALYTICS]:
        true,

      [FeatureKey.BUSINESS_INSIGHTS]:
        true,

      [FeatureKey.PREMIUM_BADGE]:
        true,

      [FeatureKey.PRIORITY_VISIBILITY]:
        true,

      [FeatureKey.PRIORITY_NOTIFICATIONS]:
        true,

      [FeatureKey.PRIORITY_SUPPORT]:
        true,

      [FeatureKey.CAMPAIGNS]:
        true,

      [FeatureKey.FEATURED_ELIGIBILITY]:
        true,

      [FeatureKey.CAMPAIGN_ANALYTICS]:
        true,

      [FeatureKey.SEASONAL_CAMPAIGN_ELIGIBILITY]:
        true,
    },

    limits: {
      [LimitKey.FEATURED_VENDOR_LIMIT]:
        2,

      [LimitKey.FEATURED_PACKAGE_LIMIT]:
        3,

      [LimitKey.COUPON_LIMIT]:
        15,

      [LimitKey.DISCOUNT_CODE_LIMIT]:
        15,

      [LimitKey.MAX_PACKAGES]:
        20,

      [LimitKey.MAX_PORTFOLIO_IMAGES]:
        60,

      [LimitKey.MAX_IMAGES_PER_PACKAGE]:
        10,

      [LimitKey.MONTHLY_CAMPAIGN_LIMIT]:
        5,
    },
  },
};

// =========================================================
// PRICE PARSING
// =========================================================

function parseConfiguredPrice(
  value: string | undefined,
): number | null {
  if (!value?.trim()) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

// =========================================================
// BACKEND-CONTROLLED PLAN PRICE
// =========================================================

export function getConfiguredPlanPrice(
  plan: SubscriptionPlan,
): number | null {
  switch (plan) {
    case SubscriptionPlan.BASIC:
      return parseConfiguredPrice(
        process.env
          .SUBSCRIPTION_BASIC_PRICE_PKR,
      );

    case SubscriptionPlan.GROWTH:
      return parseConfiguredPrice(
        process.env
          .SUBSCRIPTION_GROWTH_PRICE_PKR,
      );

    case SubscriptionPlan.PREMIUM:
      return parseConfiguredPrice(
        process.env
          .SUBSCRIPTION_PREMIUM_PRICE_PKR,
      );

    /**
     * FREE is legacy-only and never purchasable.
     */
    case SubscriptionPlan.FREE:
    default:
      return 0;
  }
}

// =========================================================
// PRICE LABEL
// =========================================================

function formatPriceLabel(
  plan: SubscriptionPlan,
  price: number | null,
): string {
  if (
    plan ===
    SubscriptionPlan.FREE
  ) {
    return 'Legacy';
  }

  if (
    price === null
  ) {
    return 'Price not configured';
  }

  return `Rs. ${price.toLocaleString(
    'en-PK',
  )} / month`;
}

// =========================================================
// SINGLE PLAN DEFINITION
// =========================================================

export function getPlanDefinition(
  plan: SubscriptionPlan,
): PlanDefinition {
  const base =
    PLAN_CONFIG[plan];

  if (!base) {
    throw new Error(
      `Unknown subscription plan: ${plan}`,
    );
  }

  const monthlyPrice =
    getConfiguredPlanPrice(
      plan,
    );

  return {
    ...base,

    monthlyPrice,

    priceLabel:
      formatPriceLabel(
        plan,
        monthlyPrice,
      ),
  };
}

// =========================================================
// PURCHASABLE PLANS
// =========================================================

export function getAllPlanDefinitions():
  PlanDefinition[] {
  /**
   * Trial is NOT included here.
   *
   * Purchase UI receives only:
   *
   * BASIC
   * GROWTH
   * PREMIUM
   */
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