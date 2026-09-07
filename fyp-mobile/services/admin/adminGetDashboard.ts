
// fyp-mobile/services/admin/adminGetDashboard.ts

import { adminGet } from "./adminApi";

/**
 * Admin dashboard summary statistics.
 */
export interface AdminDashboardStats {
  totalBookings: number;
  totalRevenue: number;
  totalCommission: number;
  totalVendors: number;
  totalRefunds: number;
  totalPayouts: number;
}

/**
 * GET /admin/dashboard
 *
 * Returns dashboard summary data for the admin home screen.
 */
export default async function adminGetDashboard(): Promise<AdminDashboardStats> {
  return adminGet<AdminDashboardStats>("/admin/dashboard");
}
