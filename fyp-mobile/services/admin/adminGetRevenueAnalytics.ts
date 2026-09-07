// fyp-mobile/services/admin/adminGetRevenueAnalytics.ts
import axios, { AxiosRequestConfig } from 'axios';

export interface RevenuePoint {
  label: string; // e.g. "Jan", "Feb"
  amount: number;
}

export default async function adminGetRevenueAnalytics(): Promise<RevenuePoint[]> {
  const url = `https://eventify-hub.onrender.com/admin/analytics/revenue`;
  const config: AxiosRequestConfig = { method: 'GET', url };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    throw error;
  }
}