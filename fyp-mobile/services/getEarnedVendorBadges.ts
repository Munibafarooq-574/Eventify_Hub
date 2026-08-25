// fyp-mobile/services/getEarnedVendorBadges.ts
import { growthApi } from './growthApiClient';
import { VendorBadge } from '../types/badge.types';

// Only badges the vendor currently has — use this in VendorProfileDetailsScreen
// and on vendor cards (see VendorBadgeChips.tsx for a ready-made display component).
export async function getEarnedVendorBadges(vendorId: string): Promise<VendorBadge[]> {
  return growthApi.get<VendorBadge[]>(`/vendor/growth/badges/${vendorId}/earned`);
}