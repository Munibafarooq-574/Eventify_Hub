// fyp-mobile/services/getVendorDiscountCodes.ts
import { growthApi } from './growthApiClient';
import { VendorDiscount } from '../types/discount.types';

export async function getVendorDiscountCodes(vendorId: string): Promise<VendorDiscount[]> {
  return growthApi.get<VendorDiscount[]>(`/vendor/growth/discount/discount-code/mine/${vendorId}`);
}