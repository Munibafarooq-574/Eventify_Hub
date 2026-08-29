// fyp-mobile/services/trackVendorView.ts
//
// Not called from any screen yet. This is what "Most Viewed Package" and
// "Featured views" in GrowthAnalyticsScreen depend on — until this is
// called from your customer-facing VendorProfileDetailsScreen (profile
// view) and package detail view (package view), those metrics report as
// "Not tracked yet" rather than a fake 0. Wiring this in is a Phase 9 task.
//
// Usage once wired in:
//   trackVendorView(vendor._id)                 // profile view
//   trackVendorView(vendor._id, pkg._id)         // package view
import { growthApi } from './growthApiClient';

export async function trackVendorView(vendorId: string, packageId?: string): Promise<void> {
  await growthApi.post('/vendor/growth/analytics/track-view', { vendorId, packageId });
}