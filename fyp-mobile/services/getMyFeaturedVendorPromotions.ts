// fyp-mobile/services/getMyFeaturedVendorPromotions.ts
import { growthApi } from './growthApiClient';
import { VendorPromotion } from '../types/promotion.types';

export async function getMyFeaturedVendorPromotions(vendorId: string): Promise<VendorPromotion[]> {
  return growthApi.get<VendorPromotion[]>(`/vendor/growth/promotion/featured-vendor/mine/${vendorId}`);
}