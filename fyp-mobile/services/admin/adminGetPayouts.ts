//fyp-mobile/services/admin/adminGetPayouts.ts
import { adminGet } from "./adminApi";
import { PayoutFilterKey, PayoutListResponse } from "../../types/admin.types";

interface AdminGetPayoutsParams {
  filter?: PayoutFilterKey;
  cursor?: string | null;
}

/**
 * GET /admin/payouts?status=&cursor=
 */
export async function adminGetPayouts({
  filter = "ALL",
  cursor = null,
}: AdminGetPayoutsParams = {}): Promise<PayoutListResponse> {
  const params = new URLSearchParams();
  if (filter !== "ALL") params.set("status", filter);
  if (cursor) params.set("cursor", cursor);

  const query = params.toString();
  return adminGet<PayoutListResponse>(`/admin/payouts${query ? `?${query}` : ""}`);
}