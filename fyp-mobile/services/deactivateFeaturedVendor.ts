// fyp-mobile/services/deactivateFeaturedVendor.ts
import { growthApi } from './growthApiClient';
import { VendorPromotion } from '../types/promotion.types';

export async function deactivateFeaturedVendor(
  vendorId: string,
  promotionId: string,
): Promise<VendorPromotion> {
  return growthApi.delete<VendorPromotion>(
    `/vendor/growth/promotion/featured-vendor/${promotionId}?vendorId=${vendorId}`,
  );
}