// fyp-mobile/services/validateCoupon.ts
//
// For your existing Checkout/BookingScreen — call this when the customer
// taps "Apply" on a coupon code. Read-only: does NOT consume a use. The
// discount amount always comes back from the backend — never compute it
// client-side, per spec ("Never trust discount calculations from the
// mobile app").
import { growthApi } from './growthApiClient';
import { CouponValidationResult } from '../types/discount.types';

export async function validateCoupon(
  vendorId: string,
  code: string,
  orderAmount: number,
): Promise<CouponValidationResult> {
  return growthApi.post<CouponValidationResult>(
    `/vendor/growth/discount/coupon/validate?vendorId=${vendorId}`,
    { code, orderAmount },
  );
}