
// fyp-mobile/services/getVendorPackagesList.ts

import { growthApi } from './growthApiClient';

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
  return growthApi.get<VendorPackageListItem[]>(
    `/vendor/packages?userId=${vendorId}`,
  );
}
