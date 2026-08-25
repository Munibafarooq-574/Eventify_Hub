// fyp-mobile/types/promotion.types.ts
//
// Mirrors fyp-backend/src/vendor/growth/promotion/promotion.types.ts

export enum PromotionType {
  FEATURED_VENDOR = 'featuredVendor',
  FEATURED_PACKAGE = 'featuredPackage', // Phase 4
}

export enum PromotionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface VendorPromotion {
  _id: string;
  vendorId: string;
  type: PromotionType;
  packageId: string | null;
  durationDays: number;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export const FEATURED_VENDOR_DURATION_OPTIONS = [
  { label: '7 days', days: 7 },
  { label: '15 days', days: 15 },
  { label: '30 days', days: 30 },
];

export interface FeaturedVendorPublicEntry {
  promotionId: string;
  vendorId: string;
  vendorName: string;
  coverImage: string | null;
  businessCategoryName: string | null;
  city: string | null;
  featuredUntil: string;
}