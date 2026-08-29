// fyp-mobile/services/redeemCoupon.ts
//
// IMPORTANT: call this from your EXISTING order/booking creation flow
// once the booking is actually confirmed — NOT when the customer taps
// "Apply" (that's validateCoupon, which is read-only). Calling this too
// early would burn a use on a coupon the customer never actually
// completed checkout with.
import { growthApi } from './growthApiClient';
import { VendorDiscount } from '../types/discount.types';

export async function redeemCoupon(vendorId: string, code: string): Promise<VendorDiscount> {
  return growthApi.post<VendorDiscount>(`/vendor/growth/discount/coupon/redeem?vendorId=${vendorId}`, { code });
}