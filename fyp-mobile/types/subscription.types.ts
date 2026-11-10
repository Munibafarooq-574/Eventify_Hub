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

export function formatSubscriptionPlanName(key?: string | null): string {
  return key?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Subscription';
}

export enum SubscriptionStatus {
  TRIAL = 'trial',
    ACTIVE = 'active',
  SCHEDULED = 'scheduled',
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

  plan: string;
  status: SubscriptionStatus;

  startDate: string;
  endDate: string | null;

  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider;
  paymentReference: string | null;

  amountDue: number;
  amountPaid: number;
  currency?: 'PKR' | 'USD';

  paymentSubmittedAt: string | null;

  verifiedAt: string | null;
  verifiedBy: string | null;

  rejectionReason: string | null;

    isCurrent: boolean;

  activationType?: 'immediate' | 'scheduled' | null;
  planChangeType?: 'upgrade' | 'downgrade' | 'renewal' | null;
  scheduledActivationDate?: string | null;

  cancelledReason: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface PlanDefinition {
  key: string;

  name: string;
  description: string;

  monthlyPrice: number | null;
  monthlyPriceUSD?: number | null;
  currency?: 'PKR' | 'USD';
  priceLabel: string;

  isMostPopular: boolean;
  isPurchasable: boolean;
  rank?: number;
  featureLabels?: string[];

  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
}

export interface PendingSubscriptionPayment {
  _id: string;
  plan: string;

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
  scheduledSubscription: ScheduledSubscription | null;

  isTrial: boolean;

  effectivePlan: string;
  planName?: string;
  planRank?: number;
  featureLabels?: string[];

  features: SubscriptionFeatures;
  limits: SubscriptionLimits;

  isPaidPlan: boolean;
   accessAllowed: boolean;
  subscriptionRequired: boolean;

  hasPendingPayment: boolean;
  pendingPayment: PendingSubscriptionPayment | null;

  trialDaysRemaining: number;
  daysRemaining: number;

  trialEndDate: string | null;
}

export interface ScheduledSubscription {
  subscriptionId: string;
  plan: string;
  activationType: 'immediate' | 'scheduled' | null;
  planChangeType: 'upgrade' | 'downgrade' | 'renewal' | null;
  scheduledActivationDate: string | null;
  startDate: string;
  endDate: string | null;
  paymentStatus: PaymentStatus;
}

export interface SubscriptionPaymentInstructions {
  provider: PaymentProvider.EASYPAISA | PaymentProvider.BANK_TRANSFER;
  currency: 'PKR' | 'USD';
  accountTitle: string;
  mobileNumber?: string;
  accountNumber?: string;
  bankName?: string;
  configured?: boolean;
}