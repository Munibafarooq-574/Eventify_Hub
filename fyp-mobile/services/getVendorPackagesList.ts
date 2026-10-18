
// fyp-mobile/services/getVendorPackagesList.ts

import { growthApi, GrowthApiError } from './growthApiClient';

export interface VendorPackageDuration {
  value: number;
  unit: 'HOURS' | 'DAYS';
  price: number;
}

export interface VendorPackageListItem {
  _id: string;

  packageName: string;

  // Package description
  description?: string;

  // Old package price - backward compatibility
  price?: number;

    // Services included in package
  services: string;

  // Booking configuration
  bookingType?:
    | 'DURATION_BASED'
    | 'TIME_SLOT_BASED'
    | 'DELIVERY_BASED'
    | 'SETUP_BASED'
    | 'CUSTOM';

  requiredServiceDurationMinutes?: number;

  serviceWindowStartOffsetMinutes?: number;

  serviceWindowEndOffsetMinutes?: number;

  // Fixed duration options
  durations?: VendorPackageDuration[];

  // Custom duration settings
  allowCustomDuration?: boolean;

  customDurationUnit?: 'HOURS' | 'DAYS';

  customDurationRate?: number;

  // Package-specific images
  images?: string[];
}

export async function getVendorPackagesList(
  vendorId: string,
): Promise<VendorPackageListItem[]> {
  // Retry transient failures only for this read; never replay a payment or write.
  for (let attempt = 0; ; attempt++) {
    try {
      const packages = await growthApi.get<VendorPackageListItem[]>(
        `/vendor/packages?userId=${encodeURIComponent(vendorId)}`,
      );
      if (!Array.isArray(packages)) throw new GrowthApiError('Unable to load package list.', 200);
      return packages;
    } catch (error) {
      const transient = error instanceof TypeError || (error instanceof GrowthApiError &&
        [502, 503, 504, 520, 521, 522, 523, 524].includes(error.status));
      if (!transient || attempt >= 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}
