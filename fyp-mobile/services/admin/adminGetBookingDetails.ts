// fyp-mobile/services/admin/adminGetBookingDetails.ts
import axios, { AxiosRequestConfig } from 'axios';

export interface AdminBookingDetails {
  _id: string;
  eventName: string;
  eventType?: string;
  eventDate: string;
  guests?: number;
  organizerId?: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  vendorOrders: {
    _id: string;
    vendorId: { _id: string; name?: string; contactDetails?: any } | string;
    serviceName: string;
    price: number;
    status: string;
    downPaymentAmount?: number;
    remainingAmount?: number;
    downPaymentPaid?: boolean;
  }[];
  totalAmount: number;
  discount?: number;
  finalAmount?: number;
  status: string;
  createdAt?: string;
}

export default async function adminGetBookingDetails(
  bookingId: string,
): Promise<AdminBookingDetails> {
  const url = `https://eventify-hub.onrender.com/admin/bookings/${bookingId}`;
  const config: AxiosRequestConfig = { method: 'GET', url };

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Error fetching admin booking details:', error);
    throw error;
  }
}