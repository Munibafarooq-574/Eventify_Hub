//fyp-mobile/services/admin/adminGetRefunds.ts
import { adminGet } from "./adminApi";
import { RefundFilterKey, RefundListResponse } from "../../types/admin.types";

interface AdminGetRefundsParams {
  filter?: RefundFilterKey;
  cursor?: string | null;
}

/**
 * GET /admin/refunds?status=&cursor=
 */
export async function adminGetRefunds({
  filter = "ALL",
  cursor = null,
}: AdminGetRefundsParams = {}): Promise<RefundListResponse> {
  const params = new URLSearchParams();
  if (filter !== "ALL") params.set("status", filter);
  if (cursor) params.set("cursor", cursor);

  const query = params.toString();
  return adminGet<RefundListResponse>(`/admin/refunds${query ? `?${query}` : ""}`);
}