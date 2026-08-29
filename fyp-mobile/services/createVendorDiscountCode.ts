// fyp-mobile/services/createVendorDiscountCode.ts
import { growthApi } from './growthApiClient';
import { CreateDiscountCodePayload, VendorDiscount } from '../types/discount.types';

export async function createVendorDiscountCode(
  vendorId: string,
  payload: CreateDiscountCodePayload,
): Promise<VendorDiscount> {
  return growthApi.post<VendorDiscount>(`/vendor/growth/discount/discount-code?vendorId=${vendorId}`, payload);
}