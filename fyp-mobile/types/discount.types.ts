// fyp-mobile/types/discount.types.ts
//
// Mirrors fyp-backend/src/vendor/growth/discount/discount.types.ts
// Shared between Coupons (this phase) and Discount Codes (Phase 7).

export enum DiscountEntryType {
  COUPON = 'coupon',
  DISCOUNT_CODE = 'discountCode', // Phase 7
}

export enum DiscountKind {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum DiscountStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  EXHAUSTED = 'exhausted',
}

export interface VendorDiscount {
  _id: string;
  vendorId: string;
  type: DiscountEntryType;
  code: string;
  discountType: DiscountKind;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscountAmount: number | null;
  packageId: string | null;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  status: DiscountStatus;
  cancelledReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponPayload {
  code: string;
  discountType: DiscountKind;
  discountValue: number;
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  packageId?: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  usageLimit: number;
}

// Same shape — reused for Discount Codes (Phase 7) too, just posted to a
// different endpoint.
export type CreateDiscountCodePayload = CreateCouponPayload;

export interface UpdateCouponPayload {
  minimumOrderAmount?: number;
  maximumDiscountAmount?: number;
  endDate?: string;
  usageLimit?: number;
}

export interface CouponValidationResult {
  valid: true;
  discountEntryId: string;
  code: string;
  discountType: DiscountKind;
  discountAmount: number;
  finalAmount: number;
}