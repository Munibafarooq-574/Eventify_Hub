import axios from 'axios';
import { getSecureData } from '../store';
import { API_BASE_URL } from './apiConfig';

export type ClientRefund = {
  _id: string; vendorOrderId: string;
  amountPaid: number; refundAmount: number; withheldAmount: number;
  status: string; rejectionReason?: string | null;
  processedAt?: string | null; refundedAt?: string | null; paidAt?: string | null;
  rejectedAt?: string | null; closedAt?: string | null; updatedAt?: string | null;
};
export default async function getClientRefunds(): Promise<ClientRefund[]> {
  const token = await getSecureData('token');
  if (!token) throw new Error('Please sign in again.');
  const response = await axios.get(`${API_BASE_URL}/cancellation/refunds`, {
    headers: { Authorization: `Bearer ${token}` }, timeout: 20000,
  });
  if (!Array.isArray(response.data)) throw new Error('Unable to load refund updates.');
  return response.data;
}
