// Use a development backend when explicitly configured; production is the default.
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "https://eventify-hub.onrender.com").replace(/\/+$/, "");
