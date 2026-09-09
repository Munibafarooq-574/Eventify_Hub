import { cookies } from "next/headers";
import { backendFetch } from "@/lib/backend";

export const ADMIN_AUTH_COOKIE = "eventify_admin_token";

export type AdminDashboardSummary = {
  totalBookings: number;
  completedBookings: number;
  grossBookingValue: number;
  eventifyCommission: number;
  vendorEarnings: number;
  pendingPayouts: number;
  totalRefunds: number;
};

export async function getAdminToken() {
  const cookieStore = await cookies();

  return cookieStore.get(ADMIN_AUTH_COOKIE)?.value ?? null;
}

export async function verifyAdminSession(): Promise<{
  authenticated: boolean;
  dashboard?: AdminDashboardSummary;
}> {
  const token = await getAdminToken();

  if (!token) {
    return {
      authenticated: false,
    };
  }

  try {
    const response = await backendFetch("/admin/dashboard", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return {
        authenticated: false,
      };
    }

    const dashboard =
      (await response.json()) as AdminDashboardSummary;

    return {
      authenticated: true,
      dashboard,
    };
  } catch {
    return {
      authenticated: false,
    };
  }
}