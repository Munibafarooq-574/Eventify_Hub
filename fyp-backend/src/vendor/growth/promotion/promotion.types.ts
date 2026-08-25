// fyp-backend/src/vendor/growth/promotion/promotion.types.ts
//
// Shared between Featured Vendor (this phase) and Featured Package
// (Phase 4) — same underlying "promotion" concept, so one schema/service
// handles both instead of duplicating the whole flow later.

export enum PromotionType {
  FEATURED_VENDOR = 'featuredVendor',
  FEATURED_PACKAGE = 'featuredPackage', // used starting Phase 4
}

export enum PromotionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export interface DurationOption {
  label: string;
  days: number;
}

// Per spec section 4: Featured Vendor durations are 7 / 15 / 30 days.
export const FEATURED_VENDOR_DURATION_OPTIONS: DurationOption[] = [
  { label: '7 days', days: 7 },
  { label: '15 days', days: 15 },
  { label: '30 days', days: 30 },
];

export const FEATURED_VENDOR_ALLOWED_DAYS = FEATURED_VENDOR_DURATION_OPTIONS.map((o) => o.days);