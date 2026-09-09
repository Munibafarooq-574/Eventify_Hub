const BACKEND_API_URL =
  process.env.BACKEND_API_URL || "http://localhost:3000";

export function getBackendApiUrl() {
  return BACKEND_API_URL;
}

export async function backendFetch(
  path: string,
  options: RequestInit = {},
) {
  const url = `${BACKEND_API_URL}${path}`;

  return fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
}