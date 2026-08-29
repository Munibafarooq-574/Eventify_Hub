// fyp-mobile/types/discount.types.ts

export enum DiscountEntryType {
  COUPON = 'coupon',
  DISCOUNT_CODE = 'discountCode',
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

export enum DiscountAudience {
  ALL = 'all',
  NEW_ORGANIZERS = 'newOrganizers',
  SELECTED_ORGANIZERS = 'selectedOrganizers',
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

  // Discount Code audience targeting
  audience: DiscountAudience;
  selectedOrganizerIds: string[];

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
  startDate: string;
  endDate: string;
  usageLimit: number;
}

// Discount Code supports targeted audience.
export interface CreateDiscountCodePayload
  extends CreateCouponPayload {
  audience: DiscountAudience;
  selectedOrganizerIds?: string[];
}

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