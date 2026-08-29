// fyp-mobile/services/activateFeaturedPackage.ts

import { growthApi } from './growthApiClient';

import { VendorPromotion } from '../types/promotion.types';

export async function activateFeaturedPackage(
  vendorId: string,
  packageId: string,
  durationDays: number,
): Promise<VendorPromotion> {

  return growthApi.post<VendorPromotion>(
    `/vendor/growth/promotion/featured-package/activate?vendorId=${vendorId}`,
    {
      packageId,
      durationDays,
    },
  );
}