//fyp-backend/src/vendor/growth/subscription/subscription.types.ts
//
// Shared enums/types for the whole Vendor Growth system (subscription,
// plan-config, feature-access, and later promotion/discount/badge modules
// will all import from here — single source of truth).

export enum SubscriptionPlan {
  FREE = 'free',
  GROWTH = 'growth',
  PREMIUM = 'premium',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

// Kept deliberately generic so a real payment gateway can slot in later
// without changing the schema.
export enum PaymentStatus {
  NONE = 'none', // Free plan — no payment involved
  DEMO = 'demo', // Manual/Demo Activation (current mode)
  PENDING = 'pending', // reserved for real gateway flow
  PAID = 'paid', // reserved for real gateway flow
  FAILED = 'failed', // reserved for real gateway flow
}

export enum PaymentProvider {
  NONE = 'none',
  DEMO = 'demo',
  // future real providers go here, e.g. STRIPE = 'stripe', JAZZCASH = 'jazzcash'
}

// Every togglable feature across Growth/Premium. Boolean-style features
// (does the vendor get this at all) live here.
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

// Numeric-limit features (how many of X is the vendor allowed).
export enum LimitKey {
  FEATURED_VENDOR_LIMIT = 'featuredVendorLimit',
  FEATURED_PACKAGE_LIMIT = 'featuredPackageLimit',
  COUPON_LIMIT = 'couponLimit',
  DISCOUNT_CODE_LIMIT = 'discountCodeLimit',
}

// Demo activation cycle length. Single source so it's easy to change
// later, or to expand into real per-plan billing periods.
export const DEMO_SUBSCRIPTION_DURATION_DAYS = 30;