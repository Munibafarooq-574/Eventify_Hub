// fyp-mobile/services/getActiveFeaturedPackages.ts
//
// Not wired into any customer-facing screen yet — that's Phase 9. Added
// now since the backend endpoint already exists.
import { growthApi } from './growthApiClient';
import { FeaturedPackagePublicEntry } from '../types/promotion.types';

export async function getActiveFeaturedPackages(limit?: number): Promise<FeaturedPackagePublicEntry[]> {
  const query = limit ? `?limit=${limit}` : '';
  return growthApi.get<FeaturedPackagePublicEntry[]>(`/vendor/growth/promotion/featured-package/active${query}`);
}