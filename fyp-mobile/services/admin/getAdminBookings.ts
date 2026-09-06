
// fyp-mobile/services/admin/getAdminBookings.ts

import { adminGet } from "./adminApi";
import {
  BookingFilterKey,
  BookingListResponse,
} from "../../types/admin.types";

interface AdminGetBookingsParams {
  filter?: BookingFilterKey;
  search?: string;
  cursor?: string | null;
}

/**
 * GET /admin/bookings?status=&search=&cursor=
 *
 * Returns both parent Orders and individual VendorOrders.
 *
 * Each item's `entityType` tells the UI whether the item is:
 * - ORDER
 * - VENDOR_ORDER
 *
 * Filtering by status applies to the entity represented by the item.
 */
export async function adminGetBookings({
  filter = "ALL",
  search = "",
  cursor = null,
}: AdminGetBookingsParams = {}): Promise<BookingListResponse> {
  const params = new URLSearchParams();

  // Backend expects `status`, not `filter`
  if (filter !== "ALL") {
    params.set("status", filter);
  }

  if (search.trim()) {
    params.set("search", search.trim());
  }

  if (cursor) {
    params.set("cursor", cursor);
  }

  const query = params.toString();

  return adminGet<BookingListResponse>(
    `/admin/bookings${query ? `?${query}` : ""}`
  );
}
