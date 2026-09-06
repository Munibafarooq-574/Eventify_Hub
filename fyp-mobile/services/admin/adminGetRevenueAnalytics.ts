// fyp-mobile/services/admin/adminGetRevenueAnalytics.ts
import { adminGet } from "./adminApi";
import { RevenueAnalytics } from "../../types/admin.types";

export type RevenueRange = "7d" | "30d" | "12m";

/**
 * GET /admin/analytics/revenue?range=7d|30d|12m
 */
export async function adminGetRevenueAnalytics(
  range: RevenueRange = "30d"
): Promise<RevenueAnalytics> {
  return adminGet<RevenueAnalytics>(`/admin/analytics/revenue?range=${range}`);
}