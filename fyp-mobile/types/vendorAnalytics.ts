// fyp-mobile/types/vendorAnalytics.ts

export interface VendorAnalytics {
    cancelledOrders: number;
    cancellationRate: number | null;

    totalRevenue: number;
    monthlyRevenue: number;
    previousMonthRevenue: number;
    monthlyRevenueChangePct: number | null;

    averageRating: number | null;
    totalReviews: number;

    responseTimeMinutes: number | null;

    popularPackage: {
        name: string;
        bookingCount: number;
    } | null;

    repeatCustomers: number;
    newCustomers: number;
    repeatCustomerRate: number | null;

    monthlyRevenueTrend: { month: number; year: number; revenue: number }[];
}