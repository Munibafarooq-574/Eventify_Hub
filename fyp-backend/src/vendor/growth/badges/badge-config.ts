//fyp-backend/src/vendor/growth/badges/badge-config.ts
//
// Thresholds for the "earned" badges (Top Rated, Fast Response, Popular).
// Kept in one place — like plan-config.ts — so tuning them doesn't mean
// hunting through badge.service.ts. These are starting values; adjust
// once you have real usage data to calibrate against.

export const BADGE_CONFIG = {
  topRated: {
    minAverageRating: 4.5,
    minReviewCount: 5, // avoids a single 5-star review qualifying a vendor
  },
  fastResponse: {
    maxAverageResponseMinutes: 60,
  },
  popular: {
    // "Popular" = served enough distinct customers (repeat + new) —
    // reuses VendorAnalyticsService's existing customer-insight numbers
    // rather than adding a new query. Tune this once real data exists.
    minTotalCustomers: 10,
  },
};