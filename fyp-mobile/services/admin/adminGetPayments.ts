//fyp-mobile/services/admin/adminGetPayments.ts
import { adminGet } from "./adminApi";
import { PaymentFilterKey, PaymentListResponse } from "../../types/admin.types";

interface AdminGetPaymentsParams {
  filter?: PaymentFilterKey;
  cursor?: string | null;
}

/**
 * GET /admin/payments?status=&cursor=
 */
export async function adminGetPayments({
  filter = "ALL",
  cursor = null,
}: AdminGetPaymentsParams = {}): Promise<PaymentListResponse> {
  const params = new URLSearchParams();
  if (filter !== "ALL") params.set("status", filter);
  if (cursor) params.set("cursor", cursor);

  const query = params.toString();
  return adminGet<PaymentListResponse>(`/admin/payments${query ? `?${query}` : ""}`);
}