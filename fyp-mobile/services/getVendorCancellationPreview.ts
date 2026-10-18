import axios from 'axios';
import { getSecureData } from '../store';
import { API_BASE_URL } from './apiConfig';
export type VendorCancellationPreview = {
  payments?: { amount: number; type: string; method?: string; paidAt?: string }[];
  vendorOrderId: string; calculatedAt: string; policyRevision: number;
  bookingAmount: number; amountPaid: number; remainingAmount: number;
  refundAmount: number; withheldAmount: number; penaltyAmount: number;
  refundPercentage: number; penaltyPercentage: number; hoursBeforeService: number;
};
export default async function getVendorCancellationPreview(id: string): Promise<VendorCancellationPreview> {
  const token = await getSecureData('token');
  if (!token) throw new Error('Please sign in again to review cancellation.');
  const response = await axios.get(`${API_BASE_URL}/cancellation/vendor-order/${encodeURIComponent(id)}/vendor-cancellation-preview`, {
    headers: { Authorization: `Bearer ${token}` }, timeout: 20000,
  });
  return response.data;
}
