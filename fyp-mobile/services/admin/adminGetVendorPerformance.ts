// fyp-mobile/services/admin/adminGetVendorPerformance.ts
import axios, { AxiosRequestConfig } from 'axios';

export interface VendorPerformance {
  vendorId: string;
  vendorName: string;
  completionRate: number; // 0-100
}

export default async function adminGetVendorPerformance(): Promise<VendorPerformance[]> {
  const url = `https://eventify-hub.onrender.com/admin/analytics/vendor-performance`;
  const config: AxiosRequestConfig = { method: 'GET', url };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Error fetching vendor performance:', error);
    throw error;
  }
}