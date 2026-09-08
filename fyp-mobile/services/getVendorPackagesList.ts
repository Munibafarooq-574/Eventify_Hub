
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
