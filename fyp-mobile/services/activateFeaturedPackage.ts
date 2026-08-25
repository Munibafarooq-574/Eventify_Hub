// fyp-mobile/services/activateFeaturedPackage.ts
import { growthApi } from './growthApiClient';
import { VendorPromotion } from '../types/promotion.types';

export async function activateFeaturedPackage(
  vendorId: string,
  packageId: string,
): Promise<VendorPromotion> {
  return growthApi.post<VendorPromotion>(
    `/vendor/growth/promotion/featured-package/activate?vendorId=${vendorId}`,
    { packageId },
  );
}