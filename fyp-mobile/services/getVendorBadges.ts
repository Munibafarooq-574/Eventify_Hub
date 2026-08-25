// fyp-mobile/services/getVendorBadges.ts
import { growthApi } from './growthApiClient';
import { VendorBadge } from '../types/badge.types';

// All 5 badges with earned: true/false — for the vendor's own
// VendorBadgesScreen ("why don't I have this yet").
export async function getVendorBadges(vendorId: string): Promise<VendorBadge[]> {
  return growthApi.get<VendorBadge[]>(`/vendor/growth/badges/${vendorId}`);
}