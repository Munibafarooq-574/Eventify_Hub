// fyp-mobile/services/admin/adminGetPopularServices.ts
import { adminGet } from "./adminApi";
import { PopularServiceItem } from "../../types/admin.types";

/**
 * GET /admin/analytics/popular-services
 */
export async function adminGetPopularServices(): Promise<PopularServiceItem[]> {
  return adminGet<PopularServiceItem[]>("/admin/analytics/popular-services");
}