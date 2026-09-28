// fyp-mobile/services/getVendorOrderStats.ts

import axios, { AxiosRequestConfig } from "axios";
import { withRetry } from "@/utils/httpRetry";

interface OrderStats {
  totalOrders: number;
  pending: number;
  processing: number;
  completed: number;
}

export default async function getVendorOrderStats(
  type: string,
  userId: string,
): Promise<OrderStats> {
  const url = `https://eventify-hub.onrender.com/orders/stats`;
  // const url = `http://192.168.100.15:3000/orders/stats`;

  const params = {
    type,
    userId,
  };

  const config: AxiosRequestConfig = {
    method: "GET",
    url,
    params,
    // Give the backend a reasonable window to wake up from a
    // cold start before we consider the request timed out.
    timeout: 15000,
  };

  try {
    const response = await withRetry(() => axios(config), {
      retries: 1,
      delayMs: 4000,
      onRetry: (attempt, error) => {
        const status = (error as any)?.response?.status;
        console.warn(
          `[getVendorOrderStats] Attempt ${attempt} retry after server error` +
            (status ? ` (status ${status})` : " (no response / timeout)"),
        );
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching order stats:", error);
    throw error;
  }
}