import axios from 'axios';
import { getSecureData } from '../store';

export default async function cancelConfirmedBooking(
  vendorOrderId: string,
  role: 'organizer' | 'vendor',
  reason?: string,
  previewToken?: string,
) {
  const token = await getSecureData('token');
  if (!token) throw new Error('Please sign in again to cancel a booking.');
  if (role === 'organizer' && !previewToken) throw new Error('Review the cancellation before confirming.');
  const endpoint = role === 'organizer' ? 'organizer-cancel-confirmed' : 'vendor-cancel-confirmed';
  const response = await axios.patch(
    `https://eventify-hub.onrender.com/cancellation/vendor-order/${encodeURIComponent(vendorOrderId)}/${endpoint}`,
    { reason, ...(role === 'organizer' ? { previewToken } : {}) },
    { headers: { Authorization: `Bearer ${token}` }, timeout: 20000 },
  );
  return response.data;
}
