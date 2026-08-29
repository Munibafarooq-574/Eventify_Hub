// fyp-backend/src/vendor/growth/analytics/analytics.types.ts

// Any metric that depends on view-tracking (which nothing calls yet —
// see vendor-view-event.schema.ts) uses this shape instead of a bare
// number, so the frontend can render "Not tracked yet" instead of a
// misleading 0.
export interface TrackedMetric {
  tracked: boolean; // false = no view events ever recorded for this vendor
  value: number;
}

export interface GrowthSales {
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyRevenueChangePct: number | null;
  averageOrderValue: number | null; // null if no completed orders yet
}

export interface GrowthCustomers {
  newCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number | null;
  bookingConversionRate: number | null; // completed / total booking requests, null if no requests yet
}

export interface PackageSummary {
  packageId: string;
  packageName: string;
  bookingCount: number;
  revenue: number;
  views: TrackedMetric;
}

export interface GrowthPackages {
  mostBookedPackage: { name: string; bookingCount: number } | null;
  highestRevenuePackage: { name: string; revenue: number } | null;
  mostViewedPackage: (TrackedMetric & { packageName: string | null }) | null;
}

export interface GrowthPromotions {
  featuredVendorViews: TrackedMetric;
  couponRedemptions: number;
  discountCodeRedemptions: number;
}

export interface GrowthAnalytics {
  sales: GrowthSales;
  customers: GrowthCustomers;
  packages: GrowthPackages;
  promotions: GrowthPromotions;
}

export interface MonthlyPoint {
  year: number;
  month: number;
  value: number;
}

export interface PromotionPerformanceEntry {
  code: string;
  type: 'coupon' | 'discountCode';
  usedCount: number;
  usageLimit: number;
}

export interface PremiumAnalytics extends GrowthAnalytics {
  revenueTrend: MonthlyPoint[]; // 6 months
  bookingTrend: MonthlyPoint[]; // 6 months, completed bookings/month
  packagePerformance: PackageSummary[]; // sorted by revenue desc
  topPerformingPackages: PackageSummary[]; // top 3 of the above
  promotionPerformance: PromotionPerformanceEntry[]; // sorted by usedCount desc
  topPerformingPromotions: PromotionPerformanceEntry[]; // top 3
}

export interface BusinessInsight {
  id: string;
  text: string;
}