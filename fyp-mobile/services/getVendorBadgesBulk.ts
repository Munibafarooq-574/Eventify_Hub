// fyp-mobile/services/getVendorBadgesBulk.ts — NEW FILE
import { growthApi } from './growthApiClient';
import { VendorBadgeSummary } from '../types/badge.types';

export async function getVendorBadgesBulk(
  vendorIds: string[],
): Promise<VendorBadgeSummary[]> {
  if (!vendorIds.length) return [];
  return growthApi.get<VendorBadgeSummary[]>(
    `/vendor/growth/badges/bulk?vendorIds=${encodeURIComponent(vendorIds.join(','))}`,
  );
}