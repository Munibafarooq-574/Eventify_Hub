// fyp-mobile/types/analytics.types.ts
//
// Mirrors fyp-backend/src/vendor/growth/analytics/analytics.types.ts

export interface TrackedMetric {
  tracked: boolean; // false = view-tracking has never recorded anything for this vendor
  value: number;
}

export interface GrowthSales {
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyRevenueChangePct: number | null;
  averageOrderValue: number | null;
}

export interface GrowthCustomers {
  newCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number | null;
  bookingConversionRate: number | null;
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

export interface PackageSummary {
  packageId: string;
  packageName: string;
  bookingCount: number;
  revenue: number;
  views: TrackedMetric;
}

export interface PremiumAnalytics extends GrowthAnalytics {
  revenueTrend: MonthlyPoint[];
  bookingTrend: MonthlyPoint[];
  packagePerformance: PackageSummary[];
  topPerformingPackages: PackageSummary[];
  promotionPerformance: PromotionPerformanceEntry[];
  topPerformingPromotions: PromotionPerformanceEntry[];
}

export interface BusinessInsight {
  id: string;
  text: string;
}