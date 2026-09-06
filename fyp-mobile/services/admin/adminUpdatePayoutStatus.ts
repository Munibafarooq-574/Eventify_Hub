//fyp-mobile/services/admin/adminUpdatePayoutStatus.ts
import { adminPatch } from "./adminApi";
import { PayoutAction, PayoutListItem } from "../../types/admin.types";

/**
 * PATCH /admin/payouts/:id
 * body: { action: "MARK_PROCESSING" | "MARK_PAID" }
 */
export async function adminUpdatePayoutStatus(
  id: string,
  action: PayoutAction
): Promise<PayoutListItem> {
  return adminPatch<PayoutListItem>(`/admin/payouts/${id}`, { action });
}