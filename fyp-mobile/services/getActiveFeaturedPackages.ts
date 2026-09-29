// fyp-mobile/services/getActiveFeaturedPackages.ts

import { growthApi } from './growthApiClient';
import { FeaturedPackagePublicEntry } from '../types/promotion.types';

export interface FeaturedPackageQuery {
  limit?: number;
  eventCityId?: string;
  categoryIds?: string[];
}

export async function getActiveFeaturedPackages(
  options: FeaturedPackageQuery = {},
): Promise<FeaturedPackagePublicEntry[]> {
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

  const queryString =
    query.toString();

  return growthApi.get<
    FeaturedPackagePublicEntry[]
  >(
    `/vendor/growth/promotion/featured-package/active${
      queryString
        ? `?${queryString}`
        : ''
    }`,
  );
}