import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cancelCartReminder } from "../services/cartReminder";
import { Platform } from "react-native";
import { API_BASE_URL } from "../services/apiConfig";

type ServerDraftKey = 'cartData' | 'eventDetails';
type DraftKey = ServerDraftKey | 'aiPackage';
type DraftSnapshot = {
  revision: number;
  cartData: Record<string, unknown> | null;
  eventDetails: Record<string, unknown> | null;
};

async function requestDraft(token: string, update?: { key: ServerDraftKey; value: unknown; revision: number }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${API_BASE_URL}/booking-draft`, {
      method: update ? 'PATCH' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(update && { 'Content-Type': 'application/json' }) },
      body: update ? JSON.stringify(update) : undefined,
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || !Number.isInteger(body.revision)) {
      throw new Error(typeof body?.message === 'string' ? body.message : 'Unable to sync your booking draft. Please try again.');
    }
    return body as DraftSnapshot;
  } finally {
    clearTimeout(timeout);
  }
}
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

  const aiKey = (userId: string) => `booking-draft.${userId}.aiPackage`;
  let snapshot: DraftSnapshot | undefined;
  let reading: Promise<DraftSnapshot> | undefined;

  async function load(token: string) {
    if (!reading) {
      reading = requestDraft(token).finally(() => { reading = undefined; });
    }
    snapshot = await reading;
    return snapshot;
  }

  function update(key: DraftKey, value: string | null) {
    return serialize(async () => {
      const session = await getSession();
      if (!session) return;
      if (key === 'aiPackage') {
        if (value === null) await remove(aiKey(session.userId));
        else await write(aiKey(session.userId), value);
        return;
      }
      const previous = snapshot ?? await load(session.token);
      if (!isCurrent()) return;
      snapshot = await requestDraft(session.token, {
        key, value: value === null ? null : JSON.parse(value), revision: previous.revision,
      });
      const vendors = snapshot.cartData?.vendors;
      if (previous.eventDetails?.eventId !== snapshot.eventDetails?.eventId ||
          (key === 'cartData' && (!Array.isArray(vendors) || !vendors.length))) {
        await cancelCartReminder();
      }
    });
  }

  return {
    isCurrent,
    getSession,
    getRevision: () => snapshot?.revision,
    async get(key: DraftKey) {
      const session = await getSession();
      if (!session) return null;
      const value = key === 'aiPackage' ? await read(aiKey(session.userId)) : (await load(session.token))[key];
      return !isCurrent() || value == null ? null : typeof value === 'string' ? value : JSON.stringify(value);
    },
    save(key: DraftKey, value: string) {
      return update(key, value);
    },
    delete(key: DraftKey) {
      return update(key, null);
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
    // Device drafts are retired. The server snapshot is the source of truth.
    await Promise.allSettled([
      remove('cartData'), remove('eventDetails'), remove('aiPackage'),
    ]);
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
