
// fyp-mobile/services/getDiscoveredVendorsByCategory.ts
//
// Phase 9 — Discovery
//
// Calls the NEW discovery endpoint which returns vendors by category
// with featured vendors boosted to the top.
//
// IMPORTANT:
// Existing getAllVendorsByCategoryId.ts remains unchanged.

import { growthApi } from './growthApiClient';

export interface DiscoveredVendor {
  _id: string;
  name: string;
  coverImage?: string;
  city?: string;
  isFeatured: boolean;

  // Preserve any additional vendor fields returned by the backend.
  [key: string]: any;
}

export async function getDiscoveredVendorsByCategory(
  categoryId: string,
): Promise<DiscoveredVendor[]> {
  return growthApi.get<DiscoveredVendor[]>(
    `/vendor/growth/discovery/vendors-by-category?categoryId=${encodeURIComponent(
      categoryId,
    )}`,
  );
}

export default getDiscoveredVendorsByCategory;
