// services/authToken.ts
//
// PLACEHOLDER — delete this file and update the import in adminApi.ts
// to point at wherever your app already stores the logged-in user's
// token (e.g. SecureStore, AsyncStorage, or an auth context).

import * as SecureStore from "expo-secure-store";

export async function getAuthToken(): Promise<string | null> {
  return SecureStore.getItemAsync("auth_token");
}