// fyp-mobile/services/getActiveFeaturedVendors.ts

import { growthApi } from './growthApiClient';
import { FeaturedVendorPublicEntry } from '../types/promotion.types';

export interface FeaturedVendorQuery {
  limit?: number;
  eventCityId?: string;
  categoryIds?: string[];
}

export async function getActiveFeaturedVendors(
  options: FeaturedVendorQuery = {},
): Promise<FeaturedVendorPublicEntry[]> {
  const query = new URLSearchParams();

  if (
    typeof options.limit === 'number' &&
    Number.isFinite(options.limit) &&
    options.limit > 0
  ) {
    query.append(
      'limit',
      String(Math.floor(options.limit)),
    );
  }

  if (options.eventCityId?.trim()) {
    query.append(
      'eventCityId',
      options.eventCityId.trim(),
    );
  }

  const categoryIds = Array.from(
    new Set(
      (options.categoryIds ?? [])
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  );

  if (categoryIds.length > 0) {
    query.append(
      'categoryIds',
      categoryIds.join(','),
    );
  }

  const queryString = query.toString();

  return growthApi.get<FeaturedVendorPublicEntry[]>(
    `/vendor/growth/promotion/featured-vendor/active${
      queryString ? `?${queryString}` : ''
    }`,
  );
}