// fyp-mobile/services/getPackagesByService.ts
//
// Same idea as getVendorsByCategory.ts — wraps your existing package
// search with a Featured Package boost. NOTE: isFeatured will read false
// for everything until vendor.service.ts's findAllVendorPackagesForService
// also returns each package's _id — see PHASE_9_README.md for the exact
// one-line addition needed.
import { growthApi } from './growthApiClient';

export interface DiscoveredPackage {
  vendorId: string;
  vendorName: string;
  packageName: string;
  price: number;
  services: string;
  maximumCapacity: number;
  isFeatured: boolean;
}

export async function getPackagesByService(service: string, guests: number): Promise<DiscoveredPackage[]> {
  return growthApi.get<DiscoveredPackage[]>(
    `/vendor/growth/discovery/packages-by-service?service=${encodeURIComponent(service)}&guests=${guests}`,
  );
}