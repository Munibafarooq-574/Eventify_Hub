// fyp-mobile/hooks/useTrackVendorView.ts
//
// Drop-in hook that records a profile or package view on mount. This is
// what makes "Most Viewed Package" and "Featured Views" in
// GrowthAnalyticsScreen (Phase 8) go from "Not tracked yet" to real data.
//
// Usage in your VendorProfileDetailsScreen (profile view):
//   useTrackVendorView(vendor._id);
//
// Usage wherever a customer opens a specific package's details:
//   useTrackVendorView(vendor._id, pkg._id);
//
// Fires once per mount, fails silently (a tracking hiccup should never
// break the screen the customer is trying to view).

import { useEffect } from 'react';
import { trackVendorView } from '../services/trackVendorView';

export function useTrackVendorView(vendorId: string | undefined, packageId?: string) {
  useEffect(() => {
    if (!vendorId) return;
    trackVendorView(vendorId, packageId).catch(() => {
      // Non-critical — ignore.
    });
    // Only track once per mount, not on every re-render.
     
  }, [vendorId, packageId]);
}