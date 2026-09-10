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

  const headers = new Headers(options.headers || {});

  // Only set JSON content type when body is NOT FormData.
  // FormData needs its own multipart boundary generated automatically.
  if (!(options.body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  } else {
    headers.delete("Content-Type");
  }

  return fetch(url, {
    ...options,
    cache: "no-store",
    headers,
  });
}