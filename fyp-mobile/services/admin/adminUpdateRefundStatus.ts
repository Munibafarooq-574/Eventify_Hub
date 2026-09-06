//fyp-mobile/services/admin/adminUpdateRefundStatus.ts
import { adminPatch } from "./adminApi";
import { RefundAction, RefundListItem } from "../../types/admin.types";

/**
 * PATCH /admin/refunds/:id
 * body: { action: "APPROVE" | "REJECT" | "MARK_PROCESSING" | "MARK_PAID" }
 *
 * Returns the updated refund so the list can be patched in place without
 * a full refetch.
 */
export async function adminUpdateRefundStatus(
  id: string,
  action: RefundAction
): Promise<RefundListItem> {
  return adminPatch<RefundListItem>(`/admin/refunds/${id}`, { action });
}