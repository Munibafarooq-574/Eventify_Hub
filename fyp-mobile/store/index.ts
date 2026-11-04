import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cancelCartReminder } from "../services/cartReminder";
import { Platform } from "react-native";

type DraftKey = 'cartData' | 'eventDetails' | 'aiPackage';
const isDraftKey = (key: string): key is DraftKey => key === 'cartData' || key === 'eventDetails' || key === 'aiPackage';

let sessionVersion = 0;
let sessionAvailable = true;
let pending = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.then(() => undefined, () => undefined);
  return result;
}

async function read(key: string) {
  return Platform.OS === 'web' ? localStorage.getItem(key) : SecureStore.getItemAsync(key);
}

async function write(key: string, value: string) {
  if (Platform.OS === 'web') localStorage.setItem(key, value);
  else await SecureStore.setItemAsync(key, value);
}

async function remove(key: string) {
  if (Platform.OS === 'web') localStorage.removeItem(key);
  else await SecureStore.deleteItemAsync(key);
}

export function createBookingDraftStore() {
  const version = sessionVersion;
  const isCurrent = () => sessionAvailable && version === sessionVersion;

  async function getSession() {
    if (!isCurrent()) return null;
    const [user, token] = await Promise.all([getUserData(), read('token')]);
    const userId = user?._id;
    return isCurrent() && token && typeof userId === 'string' && /^[a-f\d]{24}$/i.test(userId)
      ? { userId, token }
      : null;
  }

  const keyFor = (key: DraftKey, userId: string) => `booking-draft.${userId}.${key}`;
  return {
    isCurrent,
    getSession,
    async get(key: DraftKey) {
      const session = await getSession();
      if (!session) return null;
      const value = await read(keyFor(key, session.userId));
      return isCurrent() ? value : null;
    },
    save(key: DraftKey, value: string) {
      return serialize(async () => {
        const session = await getSession();
        if (!session) return;
        const storageKey = keyFor(key, session.userId);
        const replacesEvent = key === 'eventDetails' &&
          JSON.parse(await read(storageKey) || '{}')?.eventId !== JSON.parse(value)?.eventId;
        if (!isCurrent()) return;
        await write(storageKey, value);
        if (replacesEvent || (key === 'cartData' && !JSON.parse(value)?.vendors?.length)) {
          await cancelCartReminder();
        }
      });
    },
    delete(key: DraftKey) {
      return serialize(async () => {
        const session = await getSession();
        if (!session) return;
        await remove(keyFor(key, session.userId));
        await cancelCartReminder();
      });
    },
  };
}

export async function saveSecureData(key: string, value: string) {
  if (isDraftKey(key)) throw new Error('Booking draft writes require a session-bound store.');
  await write(key, value);
}

export async function getSecureData(key: string) {
  if (isDraftKey(key)) return createBookingDraftStore().get(key);
  if (key === 'token' && !sessionAvailable) return null;
  return read(key);
}

export async function deleteSecureData(key: string) {
  if (isDraftKey(key)) throw new Error('Booking draft deletion requires a session-bound store.');
  await remove(key);
}

export async function startUserSession(token: string, user: any) {
  const version = ++sessionVersion;
  sessionAvailable = false;
  await serialize(async () => {
    await cancelCartReminder();
    // Shared drafts predate account ownership. Never adopt them into an account.
    await Promise.allSettled([remove('cartData'), remove('eventDetails'), remove('aiPackage')]);
    try {
      await remove('token');
      await remove('user');
      await AsyncStorage.setItem('user', JSON.stringify(user));
      await write('token', token);
      if (version === sessionVersion) sessionAvailable = true;
    } catch (error) {
      await Promise.allSettled([AsyncStorage.removeItem('user'), remove('token')]);
      throw error;
    }
  });
}

export async function saveUserData(user: any) {
  const version = sessionVersion;
  await serialize(async () => {
    if (!sessionAvailable || version !== sessionVersion) return;
    const current = await getUserData();
    if (current?._id && String(current._id) === String(user?._id) && version === sessionVersion) {
      await AsyncStorage.setItem("user", JSON.stringify(user));
    }
  });
}

export async function getUserData() {
  const version = sessionVersion;
  if (!sessionAvailable) return null;
  const user = await AsyncStorage.getItem("user");
  return sessionAvailable && version === sessionVersion && user ? JSON.parse(user) : null;
}

export async function deleteUserData() {
  sessionVersion++;
  sessionAvailable = false;
  await serialize(async () => {
    await cancelCartReminder();
    const results = await Promise.allSettled([
      AsyncStorage.removeItem("user"), remove('token'), remove('user'), remove('cartData'), remove('eventDetails'), remove('aiPackage'),
    ]);
    const failure = results.find(result => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
  });
}
