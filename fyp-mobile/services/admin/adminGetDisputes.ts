//fyp-mobile/services/admin/adminGetDisputes.ts
import { adminGet } from "./adminApi";
import { DisputeFilterKey, DisputeListResponse } from "../../types/admin.types";

interface AdminGetDisputesParams {
  filter?: DisputeFilterKey;
  cursor?: string | null;
}

/**
 * GET /admin/disputes?status=&cursor=
 */
export async function adminGetDisputes({
  filter = "ALL",
  cursor = null,
}: AdminGetDisputesParams = {}): Promise<DisputeListResponse> {
  const params = new URLSearchParams();
  if (filter !== "ALL") params.set("status", filter);
  if (cursor) params.set("cursor", cursor);

  const query = params.toString();
  return adminGet<DisputeListResponse>(`/admin/disputes${query ? `?${query}` : ""}`);
}