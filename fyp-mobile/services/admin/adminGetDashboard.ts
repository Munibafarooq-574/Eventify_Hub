// services/admin/adminGetDashboard.ts

import { adminGet } from "./adminApi";
import { AdminDashboardResponse } from "../../types/admin.types";

/**
 * GET /admin/dashboard
 * Returns dashboard summary data for the admin home screen.
 */
export async function adminGetDashboard(): Promise<AdminDashboardResponse> {
  return adminGet<AdminDashboardResponse>("/admin/dashboard");
}