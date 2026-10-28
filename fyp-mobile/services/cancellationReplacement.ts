import axios from 'axios';
import { getSecureData } from '../store';
import { API_BASE_URL } from './apiConfig';
export type CancellationReplacementContext = {
  canReplace?: boolean;
  categoryId: string; categoryName: string; excludedVendorIds: string[]; orderId: string;
  eventDetails: { eventId: string; eventName: string; eventType: string; eventDate: string; startTime: string;
    durationMinutes: number; guests: number; eventCityId: string; eventAddress: string;
    selectedCategoryIds: string[]; selectedServices: string[]; replacementVendorOrderId: string };
};
async function auth() {
  const token = await getSecureData('token');
  if (!token) throw new Error('Please sign in again.');
  return { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 };
}
export async function requestLaterServiceTime(id: string, body: { reason: string; suggestedDate?: string; suggestedTime?: string }) {
  return (await axios.post(`${API_BASE_URL}/orders/vendor-order/${encodeURIComponent(id)}/later-time-request`, body, await auth())).data;
}
export async function getCancellationReplacement(id: string): Promise<CancellationReplacementContext> {
  return (await axios.get(`${API_BASE_URL}/orders/vendor-order/${encodeURIComponent(id)}/cancellation-replacement`, await auth())).data;
}
export async function continueWithoutCancelledVendor(id: string): Promise<void> {
  await axios.patch(`${API_BASE_URL}/orders/vendor-order/${encodeURIComponent(id)}/continue-without`, {}, await auth());
}
