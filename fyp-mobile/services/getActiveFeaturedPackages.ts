// fyp-mobile/services/getActiveFeaturedPackages.ts

import { growthApi } from './growthApiClient';
import { FeaturedPackagePublicEntry } from '../types/promotion.types';

export interface FeaturedPackageQuery {
  limit?: number;
  eventCityId?: string;
  categoryIds?: string[];
  eventDate?: string;
  startTime?: string;
  durationMinutes?: number;
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

 if (options.eventDate?.trim()) {
  query.append(
    'eventDate',
    options.eventDate.trim(),
  );
}

if (options.startTime?.trim()) {
  query.append(
    'startTime',
    options.startTime.trim(),
  );
}

if (
  typeof options.durationMinutes === 'number' &&
  Number.isFinite(options.durationMinutes) &&
  options.durationMinutes > 0
) {
  query.append(
    'durationMinutes',
    String(options.durationMinutes),
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