// fyp-mobile/services/getMyFeaturedPackages.ts
import { growthApi } from './growthApiClient';
import { VendorPromotion } from '../types/promotion.types';

export async function getMyFeaturedPackages(vendorId: string): Promise<VendorPromotion[]> {
  return growthApi.get<VendorPromotion[]>(`/vendor/growth/promotion/featured-package/mine/${vendorId}`);
}