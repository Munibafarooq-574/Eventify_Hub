
//fyp-mobile/store/index.ts
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cancelCartReminder } from "../services/cartReminder";
import { Platform } from "react-native";

export async function saveSecureData(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }

  const replacesEvent = key === 'eventDetails' &&
    JSON.parse(await SecureStore.getItemAsync(key) || '{}')?.eventId !== JSON.parse(value)?.eventId;
  await SecureStore.setItemAsync(key, value);
  if (replacesEvent || (key === 'cartData' && !JSON.parse(value)?.vendors?.length)) {
    await cancelCartReminder();
  }
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
  if (key === 'cartData' || key === 'eventDetails') await cancelCartReminder();
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
  await cancelCartReminder();
}