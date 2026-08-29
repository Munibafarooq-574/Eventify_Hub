// fyp-mobile/services/getVendorCoupons.ts
import { growthApi } from './growthApiClient';
import { VendorDiscount } from '../types/discount.types';

export async function getVendorCoupons(vendorId: string): Promise<VendorDiscount[]> {
  return growthApi.get<VendorDiscount[]>(`/vendor/growth/discount/coupon/mine/${vendorId}`);
}