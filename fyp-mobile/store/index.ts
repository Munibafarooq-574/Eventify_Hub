/*import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export async function saveSecureData(key: string, value: string) {
    if (Platform.OS === "web") {
        localStorage.setItem(key, value);
        return;
    }
    await SecureStore.setItemAsync(key, value);
}

export async function getSecureData(key: string) {
    if (Platform.OS === "web") {
        return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
}

export async function deleteSecureData(key: string) {
    if (Platform.OS === "web") {
        localStorage.removeItem(key);
        return;
    }
    await SecureStore.deleteItemAsync(key);
}*/

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export async function saveSecureData(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function getSecureData(key: string) {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }

  return await SecureStore.getItemAsync(key);
}

export async function deleteSecureData(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

// ===============================
// User data storage
// ===============================

export async function saveUserData(user: any) {
  await AsyncStorage.setItem("user", JSON.stringify(user));
}

export async function getUserData() {
  const user = await AsyncStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

export async function deleteUserData() {
  await AsyncStorage.removeItem("user");
}