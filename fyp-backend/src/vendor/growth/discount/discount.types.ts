// fyp-backend/src/vendor/growth/discount/discount.types.ts
//
// Shared between Coupons (this phase) and Discount Codes (Phase 7) — same
// underlying "discount entry" concept (code, type of discount, limits,
// dates, usage tracking), so one schema/service handles both instead of
// duplicating the whole create -> validate -> redeem -> expire flow.
// Matches the spec's "Promotion / Coupon / Discount Code" reusable
// architecture note.

export enum DiscountEntryType {
  COUPON = 'coupon',
  DISCOUNT_CODE = 'discountCode', // used starting Phase 7
}

export enum DiscountKind {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum DiscountStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface DiscountCalculation {
  valid: true;
  discountEntryId: string;
  code: string;
  discountType: DiscountKind;
  discountAmount: number;
  finalAmount: number;
}

export enum DiscountAudience {
  ALL = 'all',
  NEW_ORGANIZERS = 'newOrganizers',
  SELECTED_ORGANIZERS = 'selectedOrganizers',
}