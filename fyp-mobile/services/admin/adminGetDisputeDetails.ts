//fyp-mobile/services/admin/adminGetDisputeDetails.ts
import { adminGet } from "./adminApi";
import { DisputeDetails } from "../../types/admin.types";

/**
 * GET /admin/disputes/:id
 */
export async function adminGetDisputeDetails(id: string): Promise<DisputeDetails> {
  return adminGet<DisputeDetails>(`/admin/disputes/${id}`);
}