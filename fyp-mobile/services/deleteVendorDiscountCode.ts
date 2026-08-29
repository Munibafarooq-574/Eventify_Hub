// fyp-mobile/services/deleteVendorDiscountCode.ts
//
// Same soft-cancel behavior as deleteVendorCoupon.ts — status flips to
// "cancelled", history preserved.
import { growthApi } from './growthApiClient';
import { VendorDiscount } from '../types/discount.types';

export async function deleteVendorDiscountCode(vendorId: string, discountCodeId: string): Promise<VendorDiscount> {
  return growthApi.delete<VendorDiscount>(
    `/vendor/growth/discount/discount-code/${discountCodeId}?vendorId=${vendorId}`,
  );
}