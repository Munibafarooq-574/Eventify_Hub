// fyp-mobile/services/createVendorCoupon.ts
import { growthApi } from './growthApiClient';
import { CreateCouponPayload, VendorDiscount } from '../types/discount.types';

export async function createVendorCoupon(
  vendorId: string,
  payload: CreateCouponPayload,
): Promise<VendorDiscount> {
  return growthApi.post<VendorDiscount>(`/vendor/growth/discount/coupon?vendorId=${vendorId}`, payload);
}