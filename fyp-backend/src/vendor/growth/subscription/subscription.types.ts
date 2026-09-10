// fyp-backend/src/vendor/growth/subscription/subscription.types.ts


export enum SubscriptionPlan {
  
  FREE = 'free',

  BASIC = 'basic',

  GROWTH = 'growth',

  PREMIUM = 'premium',
}

export enum SubscriptionStatus {
 
  TRIAL = 'trial',

  ACTIVE = 'active',


  PENDING_PAYMENT = 'pending_payment',

  EXPIRED = 'expired',


  CANCELLED = 'cancelled',

  REJECTED = 'rejected',
}


export enum PaymentStatus {
 
  NONE = 'none',

  DEMO = 'demo',

 
  PENDING = 'pending',

  PAID = 'paid',


  FAILED = 'failed',
}


export enum PaymentProvider {
  
  NONE = 'none',


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

  CAMPAIGNS = 'campaigns',
  FEATURED_ELIGIBILITY = 'featuredEligibility',
  CAMPAIGN_ANALYTICS = 'campaignAnalytics',
  SEASONAL_CAMPAIGN_ELIGIBILITY = 'seasonalCampaignEligibility',
}

export enum LimitKey {
  FEATURED_VENDOR_LIMIT = 'featuredVendorLimit',
  FEATURED_PACKAGE_LIMIT = 'featuredPackageLimit',
  COUPON_LIMIT = 'couponLimit',
  DISCOUNT_CODE_LIMIT = 'discountCodeLimit',

  MAX_PACKAGES = 'maxPackages',
  MAX_PORTFOLIO_IMAGES = 'maxPortfolioImages',
  MAX_IMAGES_PER_PACKAGE = 'maxImagesPerPackage',
  MONTHLY_CAMPAIGN_LIMIT = 'monthlyCampaignLimit',
}

export const VENDOR_TRIAL_DURATION_DAYS = 7;


export const SUBSCRIPTION_DURATION_DAYS = 30;


export const DEMO_SUBSCRIPTION_DURATION_DAYS =
  SUBSCRIPTION_DURATION_DAYS;