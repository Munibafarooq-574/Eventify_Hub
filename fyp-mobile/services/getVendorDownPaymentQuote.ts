import axios from 'axios';
import { getSecureData } from '@/store';
import { API_BASE_URL } from './apiConfig';
import { bookingActionError } from './bookingActionError';

export type VendorDownPaymentQuote = {
  currency: 'USD' | 'PKR';
  organizerId: string;
  vendorOrderId: string;
  quoteKey: string;
  packages: { vendorOrderId: string; name: string; amount: number; total: number; deadline: string }[];
  totalAmount: number;
  downPaymentAmount: number;
  remainingAmount: number;
  paidSoFar: number;
  outstandingAmount: number;
  fullyPaid: boolean;
  paymentStatus: string;
  paymentDeadline: string;
  eventTimeZone: string;
};

export default async function getVendorDownPaymentQuote(vendorOrderId: string): Promise<VendorDownPaymentQuote> {
  const token = await getSecureData('token');
  if (!token) throw new Error('Please sign in again.');
  try {
    const response = await axios.get(`${API_BASE_URL}/payment/vendor-order/${encodeURIComponent(vendorOrderId)}/down-payment-quote`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    throw bookingActionError(error, 'Could not load the vendor payment. Refresh the booking and try again.');
  }
}
