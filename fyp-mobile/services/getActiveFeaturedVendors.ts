// fyp-mobile/services/getActiveFeaturedVendors.ts
//
// Not wired into any customer-facing screen yet — that's Phase 9
// (HomeScreen "Featured Vendors" section, Vendor Search ranking). Added
// now since the backend endpoint already exists, so Phase 9 can import
// this directly instead of writing it from scratch.
import { growthApi } from './growthApiClient';
import { FeaturedVendorPublicEntry } from '../types/promotion.types';

export async function getActiveFeaturedVendors(limit?: number): Promise<FeaturedVendorPublicEntry[]> {
  const query = limit ? `?limit=${limit}` : '';
  return growthApi.get<FeaturedVendorPublicEntry[]>(`/vendor/growth/promotion/featured-vendor/active${query}`);
}