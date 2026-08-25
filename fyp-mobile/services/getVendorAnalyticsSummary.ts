
//fyp-mobile/services/getVendorAnalyticsSummary.ts
import { growthApi } from './growthApiClient';

export interface VendorAnalyticsSummary {
  totalRevenue: number;
  monthlyRevenue: number;
  monthlyRevenueChangePct: number | null;
  averageRating: number | null;
  totalReviews: number;
  repeatCustomers: number;
  newCustomers: number;
  cancelledOrders: number;
  popularPackage: {
    name: string;
    bookingCount: number;
  } | null;
}

export async function getVendorAnalyticsSummary(
  vendorId: string,
): Promise<VendorAnalyticsSummary> {
  return growthApi.get<VendorAnalyticsSummary>(
    `/vendor/analytics/${vendorId}`,
  );
}