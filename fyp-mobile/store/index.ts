import * as SecureStore from "expo-secure-store";

export async function saveSecureData(key: string, value: string) {
    await SecureStore.setItemAsync(key, value);
}

export async function getSecureData(key: string) {
    return await SecureStore.getItemAsync(key);
}

export async function deleteSecureData(key: string) {
    await SecureStore.deleteItemAsync(key);
}
