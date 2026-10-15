import axios from 'axios';
import { getSecureData } from '../store';

export interface ClientCancellationPreview {
  vendorOrderId: string;
  eligible: boolean;
  restrictionCode?: string;
  message?: string;
  serviceName: string;
  eventStartDateTime: string | null;
  amountPaid: number;
  refundAmount: number | null;
  withheldAmount: number | null;
  refundPercentage: number | null;
  daysBeforeEvent: number | null;
  hoursBeforeEvent: number | null;
  tier: string | null;
  cancellationPolicyApplied: string | null;
  policyRevision: number | null;
  previewToken?: string;
  expiresAt?: string;
}

export default async function calculateRefund(vendorOrderId: string): Promise<ClientCancellationPreview> {
  const token = await getSecureData('token');
  if (!token) throw new Error('Please sign in again to review cancellation.');
  const response = await axios.get(`https://eventify-hub.onrender.com/cancellation/vendor-order/${encodeURIComponent(vendorOrderId)}/calculate-refund`, {
    headers: { Authorization: `Bearer ${token}` }, timeout: 20000,
  });
  return response.data;
}
