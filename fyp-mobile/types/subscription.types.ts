// fyp-mobile/types/subscription.types.ts
//
// Mirrors fyp-backend/src/vendor/growth/subscription/subscription.types.ts
// and plan-config.ts. Keep these two in sync if the backend enums change.

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
}

export interface VendorSubscription {
  _id: string;
  vendorId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: string; // ISO date string from the API
  endDate: string | null;
  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider;
  paymentReference: string | null;
  amountPaid: number;
  isCurrent: boolean;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// Matches the shape returned by GET /vendor/growth/subscription/plans
export interface PlanDefinition {
  key: SubscriptionPlan;
  name: string;
  priceLabel: string;
  isMostPopular: boolean;
  description: string;
  features: {
    featuredVendor: boolean;
    featuredPackage: boolean;
    promotionalBadges: boolean;
    coupons: boolean;
    discountCodes: boolean;
    advancedPromotions: boolean;
    growthAnalytics: boolean;
    advancedAnalytics: boolean;
    businessInsights: boolean;
    premiumBadge: boolean;
    priorityVisibility: boolean;
    priorityNotifications: boolean;
    prioritySupport: boolean;
  };
  limits: {
    featuredVendorLimit: number;
    featuredPackageLimit: number;
    couponLimit: number;
    discountCodeLimit: number;
  };
}