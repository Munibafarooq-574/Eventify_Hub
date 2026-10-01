import { growthApi } from './growthApiClient';
import { VendorDiscount } from '../types/discount.types';

export async function getPublicDashboardCoupons(
  limit = 10,
): Promise<VendorDiscount[]> {
  return growthApi.get<VendorDiscount[]>(
    `/vendor/growth/discount/coupon/public?limit=${limit}`,
  );
}