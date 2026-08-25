// fyp-mobile/services/deactivateFeaturedPackage.ts
import { growthApi } from './growthApiClient';
import { VendorPromotion } from '../types/promotion.types';

export async function deactivateFeaturedPackage(
  vendorId: string,
  promotionId: string,
): Promise<VendorPromotion> {
  return growthApi.delete<VendorPromotion>(
    `/vendor/growth/promotion/featured-package/${promotionId}?vendorId=${vendorId}`,
  );
}