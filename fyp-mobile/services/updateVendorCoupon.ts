// fyp-mobile/services/updateVendorCoupon.ts
import { growthApi } from './growthApiClient';
import { UpdateCouponPayload, VendorDiscount } from '../types/discount.types';

export async function updateVendorCoupon(
  vendorId: string,
  couponId: string,
  payload: UpdateCouponPayload,
): Promise<VendorDiscount> {
  return growthApi.patch<VendorDiscount>(
    `/vendor/growth/discount/coupon/${couponId}?vendorId=${vendorId}`,
    payload,
  );
}