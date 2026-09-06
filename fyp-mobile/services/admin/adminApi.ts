// fyp-mobile/services/admin/adminApi.ts
//
// Thin fetch wrapper shared by all admin services. Reuses your existing
// auth/token pattern — replace `getAuthToken()` with however the rest of
// your app (organizer/vendor services) reads the stored session token.

import { getAuthToken } from "./authToken"; // <-- point this at your real helper

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://api.eventifyhub.com";

export class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function adminRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new AdminApiError(
      body?.message ?? `Request failed with status ${response.status}`,
      response.status
    );
  }

  return response.json() as Promise<T>;
}

export const adminGet = <T>(path: string) => adminRequest<T>(path, { method: "GET" });

export const adminPost = <T>(path: string, body?: unknown) =>
  adminRequest<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });

export const adminPatch = <T>(path: string, body?: unknown) =>
  adminRequest<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined });