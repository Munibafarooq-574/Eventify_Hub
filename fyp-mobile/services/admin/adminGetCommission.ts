//fyp-mobile/services/admin/adminGetCommission.ts
import { adminGet } from "./adminApi";
import { CommissionResponse } from "../../types/admin.types";

/**
 * GET /admin/commission
 */
export async function adminGetCommission(): Promise<CommissionResponse> {
  return adminGet<CommissionResponse>("/admin/commission");
}