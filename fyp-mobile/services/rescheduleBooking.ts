// fyp-mobile/services/rescheduleBooking.ts
import axios from 'axios';
import { getSecureData } from '@/store';
import { API_BASE_URL } from './apiConfig';

export type RescheduleStatus =
  | 'CHANGE_REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED';

async function authHeaders() {
  const token = await getSecureData('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function apiError(error: any): Error {
  const data = error?.response?.data;
  const message = Array.isArray(data?.message)
    ? data.message.join(', ')
    : data?.message?.message || data?.message || data?.error || error?.message;
  return new Error(message || 'Rescheduling request failed.');
}

export async function requestEventReschedule(
  orderId: string,
  payload: {
    eventDate: string;
    eventTime: string;
    durationMinutes: number;
    reason?: string;
  },
) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/orders/${orderId}/reschedule`,
      payload,
      { headers: await authHeaders() },
    );
    return response.data;
  } catch (error) {
    throw apiError(error);
  }
}

export async function getRescheduleRequests(orderId?: string) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/orders/reschedule/requests`,
      {
        headers: await authHeaders(),
        params: orderId ? { orderId } : undefined,
      },
    );
    return response.data;
  } catch (error) {
    throw apiError(error);
  }
}

export async function respondToRescheduleRequest(
  requestId: string,
  status: 'ACCEPTED' | 'REJECTED',
  message?: string,
) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}/orders/reschedule/${requestId}/respond`,
      { status, message },
      { headers: await authHeaders() },
    );
    return response.data;
  } catch (error) {
    throw apiError(error);
  }
}
