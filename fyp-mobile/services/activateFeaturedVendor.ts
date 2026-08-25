// fyp-mobile/services/activateFeaturedVendor.ts
import { growthApi } from './growthApiClient';
import { VendorPromotion } from '../types/promotion.types';

export async function activateFeaturedVendor(
  vendorId: string,
  durationDays: number,
): Promise<VendorPromotion> {
  return growthApi.post<VendorPromotion>(
    `/vendor/growth/promotion/featured-vendor/activate?vendorId=${vendorId}`,
    { durationDays },
  );
}