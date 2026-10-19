// fyp-mobile/services/growthApiClient.ts

import { getSecureData } from '@/store';

export const API_BASE_URL = 'https://eventify-hub.onrender.com';

export class GrowthApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'GrowthApiError';
    this.status = status;
  }
}
async function requestOnce<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getSecureData('token');

  //const headers = new Headers(options.headers);
  //headers.set('Content-Type', 'application/json');

  const headers = new Headers(options.headers);

const isFormData =
  typeof FormData !== 'undefined' &&
  options.body instanceof FormData;

// JSON requests keep the existing behaviour.
// For FormData, do NOT manually set Content-Type.
// fetch will automatically add:
// multipart/form-data; boundary=...
if (!isFormData) {
  headers.set('Content-Type', 'application/json');
}

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const rawBody = await response.text();

  if (!response.ok) {
    let message = 'Unable to load this information. Please try again.';

    if (response.status < 500 && contentType.includes('application/json')) {
      try {
        const body = JSON.parse(rawBody);

        if (Array.isArray(body?.message)) {
          message = body.message.join(', ');
        } else if (body?.message) {
          message = body.message;
        }
      } catch {
        // Ignore invalid JSON.
      }
    }

    throw new GrowthApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!contentType.includes('application/json')) {
    throw new GrowthApiError(
      'Unable to load this information. Please try again.',
      response.status,
    );
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new GrowthApiError(
      'Unable to load this information. Please try again.',
      response.status,
    );
  }
}

// Retry public marketplace/profile reads and the read-only availability check.
// Availability writes, payments and package-list retries stay unchanged.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const retryAvailability = ((options.method ?? 'GET') === 'GET' && /^\/vendor-availability\/[^/?]+$/.test(path)) ||
    (options.method === 'POST' && path === '/vendor-availability/check');
  const retryProfile = (options.method ?? 'GET') === 'GET' && /^\/vendor\?userId=[^&]+$/.test(path);
  const retryRead = retryProfile || retryAvailability || ((options.method ?? 'GET') === 'GET' &&
    /^\/vendor\/growth\/(?:discount\/coupon\/public|campaign\/public\/active|promotion\/featured-(?:vendor|package)\/active)(?:\?|$)/.test(path));
  for (let attempt = 0; ; attempt++) {
    try {
      return await requestOnce<T>(path, options);
    } catch (error) {
      const transient = error instanceof TypeError ||
        (error instanceof GrowthApiError && [502, 503, 504, 520, 521, 522, 523, 524].includes(error.status));
      if (!retryRead || !transient || attempt >= 2 || options.signal?.aborted) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

export const growthApi = {
  get: <T>(path: string) =>
    request<T>(path, {
      method: 'GET',
    }),

  post: <T>(path: string, body?: unknown) => {
  const isFormData =
    typeof FormData !== 'undefined' &&
    body instanceof FormData;

  return request<T>(path, {
    method: 'POST',
    body:
      body === undefined
        ? undefined
        : isFormData
          ? body
          : JSON.stringify(body),
  });
},

    patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
};