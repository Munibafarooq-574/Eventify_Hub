// fyp-mobile/services/admin/adminGetBookingDetails.ts
import { adminGet } from "./adminApi";
import { BookingDetails, BookingEntityType } from "../../types/admin.types";

/**
 * GET /admin/bookings/:id?type=ORDER|VENDOR_ORDER
 *
 * `type` must be passed through so the backend knows whether to resolve
 * the id against the Order table or the VendorOrder table.
 */
export async function adminGetBookingDetails(
  id: string,
  entityType: BookingEntityType
): Promise<BookingDetails> {
  return adminGet<BookingDetails>(`/admin/bookings/${id}?type=${entityType}`);
}