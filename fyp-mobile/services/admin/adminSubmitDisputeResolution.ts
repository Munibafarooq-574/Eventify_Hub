//fyp-mobile/services/admin/adminSubmitDisputeResolution.ts
import { adminPost } from "./adminApi";
import { DisputeDetails, DisputeResolutionInput } from "../../types/admin.types";

/**
 * POST /admin/disputes/:id/resolve
 * body: { resolution: "ORGANIZER" | "VENDOR" | "PARTIAL", note?, partialAmountLabel? }
 */
export async function adminSubmitDisputeResolution(
  id: string,
  input: DisputeResolutionInput
): Promise<DisputeDetails> {
  return adminPost<DisputeDetails>(`/admin/disputes/${id}/resolve`, input);
}