// fyp-backend/src/vendor/growth/subscription/subscription.types.ts

export enum SubscriptionPlan {
  // LEGACY ONLY.
  // Old database documents may still contain "free".
  // New subscriptions must never create this plan.
  FREE = 'free',

  TRIAL = 'trial',
  BASIC = 'basic',
  GROWTH = 'growth',
  PREMIUM = 'premium',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',

  // A vendor has submitted subscription payment details
  // and is waiting for Admin verification.
  PENDING_PAYMENT = 'pending_payment',

  EXPIRED = 'expired',

  // Renewal disabled. Existing access remains until endDate.
  CANCELLED = 'cancelled',

  // Submitted subscription payment was rejected.
  REJECTED = 'rejected',
}

export enum PaymentStatus {
  NONE = 'none',

  // Development-only compatibility.
  DEMO = 'demo',

  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
}

export enum PaymentProvider {
  NONE = 'none',

  // Development-only.
  DEMO = 'demo',

  BANK_TRANSFER = 'bank_transfer',
  JAZZCASH = 'jazzcash',
  EASYPAISA = 'easypaisa',
}

export enum FeatureKey {
  FEATURED_VENDOR = 'featuredVendor',
  FEATURED_PACKAGE = 'featuredPackage',
  PROMOTIONAL_BADGES = 'promotionalBadges',
  COUPONS = 'coupons',
  DISCOUNT_CODES = 'discountCodes',
  ADVANCED_PROMOTIONS = 'advancedPromotions',
  GROWTH_ANALYTICS = 'growthAnalytics',
  ADVANCED_ANALYTICS = 'advancedAnalytics',
  BUSINESS_INSIGHTS = 'businessInsights',
  PREMIUM_BADGE = 'premiumBadge',
  PRIORITY_VISIBILITY = 'priorityVisibility',
  PRIORITY_NOTIFICATIONS = 'priorityNotifications',
  PRIORITY_SUPPORT = 'prioritySupport',
}

export enum LimitKey {
  FEATURED_VENDOR_LIMIT = 'featuredVendorLimit',
  FEATURED_PACKAGE_LIMIT = 'featuredPackageLimit',
  COUPON_LIMIT = 'couponLimit',
  DISCOUNT_CODE_LIMIT = 'discountCodeLimit',
}

// Exactly seven days from Vendor account creation.
export const VENDOR_TRIAL_DURATION_DAYS = 7;

// One paid subscription billing cycle.
export const SUBSCRIPTION_DURATION_DAYS = 30;

// Existing demo flow compatibility.
export const DEMO_SUBSCRIPTION_DURATION_DAYS =
  SUBSCRIPTION_DURATION_DAYS;