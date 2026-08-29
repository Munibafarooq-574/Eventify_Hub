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
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getSecureData('token');

  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE_URL}${path}`;

  console.log('[Growth API] Request:', {
    method: options.method ?? 'GET',
    url,
  });

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const rawBody = await response.text();

  console.log('[Growth API] Response:', {
    status: response.status,
    contentType,
    bodyPreview: rawBody.slice(0, 300),
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    if (contentType.includes('application/json')) {
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
    } else if (rawBody) {
      message = `Request failed (${response.status}): ${rawBody.slice(0, 200)}`;
    }

    throw new GrowthApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!contentType.includes('application/json')) {
    throw new GrowthApiError(
      `Expected JSON but received ${contentType || 'unknown content type'} from ${url}`,
      response.status,
    );
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new GrowthApiError(
      `Server returned invalid JSON from ${url}. Response starts with: ${rawBody.slice(0, 100)}`,
      response.status,
    );
  }
}

export const growthApi = {
  get: <T>(path: string) =>
    request<T>(path, {
      method: 'GET',
    }),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

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