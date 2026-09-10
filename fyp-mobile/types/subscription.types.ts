// fyp-mobile/types/subscription.types.ts
//
// Mirrors backend subscription.types.ts + plan-config.ts.
// Keep this file in sync with the backend.

export enum SubscriptionPlan {
  FREE = 'free', // legacy compatibility only
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

export interface SubscriptionFeatures {
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

  campaigns: boolean;
  featuredEligibility: boolean;
  campaignAnalytics: boolean;
  seasonalCampaignEligibility: boolean;
}

export interface SubscriptionLimits {
  featuredVendorLimit: number;
  featuredPackageLimit: number;
  couponLimit: number;
  discountCodeLimit: number;

  maxPackages: number;
  maxPortfolioImages: number;
  maxImagesPerPackage: number;
  monthlyCampaignLimit: number;
}

export interface VendorSubscription {
  _id: string;
  vendorId: string;

  plan: SubscriptionPlan;
  status: SubscriptionStatus;

  startDate: string;
  endDate: string | null;

  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider;
  paymentReference: string | null;

  amountDue: number;
  amountPaid: number;

  paymentSubmittedAt: string | null;

  verifiedAt: string | null;
  verifiedBy: string | null;

  rejectionReason: string | null;

  isCurrent: boolean;

  cancelledReason: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface PlanDefinition {
  key: SubscriptionPlan;

  name: string;
  description: string;

  monthlyPrice: number | null;
  priceLabel: string;

  isMostPopular: boolean;
  isPurchasable: boolean;

  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
}

export interface PendingSubscriptionPayment {
  _id: string;
  plan: SubscriptionPlan;

  status: SubscriptionStatus;

  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider;

  paymentReference: string | null;

  amountDue: number;
  amountPaid: number;

  paymentSubmittedAt: string | null;

  rejectionReason?: string | null;
}

export interface SubscriptionAccessState {
  subscription: VendorSubscription;

  isTrial: boolean;

  effectivePlan: SubscriptionPlan;

  features: SubscriptionFeatures;
  limits: SubscriptionLimits;

  isPaidPlan: boolean;

  subscriptionRequired: boolean;

  hasPendingPayment: boolean;
  pendingPayment: PendingSubscriptionPayment | null;

  trialDaysRemaining: number;
  daysRemaining: number;

  trialEndDate: string | null;
}

export interface SubscriptionPaymentInstructions {
  provider: PaymentProvider.EASYPAISA;
  accountTitle: string;
  mobileNumber: string;
}