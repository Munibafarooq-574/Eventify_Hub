// fyp-mobile/services/getVendorPackagesList.ts
//
// Reuses the EXISTING GET /vendor/packages endpoint (VendorService.getPackages,
// already built) — no new backend route needed for listing packages.
//
// NOTE: In the current vendor.controller.ts, this route is declared as
// `@Get('packages') getPackages(@Param('userId') userId)` with no `:userId`
// in the path — that looks like it should be `@Query('userId')` instead,
// since there's no route param to bind. Worth double-checking with your
// backend before wiring FeaturedPackagesScreen — if calls here 404 or
// come back with an undefined userId, that existing route is why.
import { growthApi } from './growthApiClient';

export interface VendorPackageListItem {
  _id: string;
  packageName: string;
  price: number;
  services: string;
}

export async function getVendorPackagesList(vendorId: string): Promise<VendorPackageListItem[]> {
  return growthApi.get<VendorPackageListItem[]>(`/vendor/packages?userId=${vendorId}`);
}