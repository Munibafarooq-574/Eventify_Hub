// fyp-mobile/services/deleteVendorCoupon.ts
//
// Despite the name (matching the original file-plan naming), this calls
// the cancel endpoint — the coupon's status flips to "cancelled" rather
// than being removed from the database, so usage history (needed for
// Phase 8 coupon-usage analytics) is preserved.
import { growthApi } from './growthApiClient';
import { VendorDiscount } from '../types/discount.types';

export async function deleteVendorCoupon(vendorId: string, couponId: string): Promise<VendorDiscount> {
  return growthApi.delete<VendorDiscount>(`/vendor/growth/discount/coupon/${couponId}?vendorId=${vendorId}`);
}