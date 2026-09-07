// fyp-mobile/services/admin/adminGetPopularServices.ts
import axios, { AxiosRequestConfig } from 'axios';

export interface PopularService {
  name: string;
  bookingCount: number;
}

export default async function adminGetPopularServices(): Promise<PopularService[]> {
  const url = `https://eventify-hub.onrender.com/admin/analytics/popular-services`;
  const config: AxiosRequestConfig = { method: 'GET', url };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Error fetching popular services:', error);
    throw error;
  }
}