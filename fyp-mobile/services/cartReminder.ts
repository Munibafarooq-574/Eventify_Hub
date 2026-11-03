import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const CART_REMINDER = 'checkout-cart-reminder';
let pending = Promise.resolve();

function serialize(action: () => Promise<void>) {
  pending = pending.then(action).catch(error => console.warn('Cart reminder unavailable', error));
  return pending;
}

export function cancelCartReminder() {
  if (Platform.OS === 'web') return Promise.resolve();
  return serialize(() => Notifications.cancelScheduledNotificationAsync(CART_REMINDER));
}

export function scheduleCartReminder(userId: string, eventId: string, isCurrent: () => Promise<boolean>) {
  if (Platform.OS === 'web') return Promise.resolve();
  return serialize(async () => {
    const key = `cart-reminder:${userId}:${eventId}`;
    if (await AsyncStorage.getItem(key) || !(await Notifications.getPermissionsAsync()).granted || !await isCurrent()) return;
    await Notifications.scheduleNotificationAsync({
      identifier: CART_REMINDER,
      content: {
        title: 'Your cart is saved',
        body: 'Review your selections whenever you’re ready to book.',
        data: { type: CART_REMINDER, userId, eventId },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3600 },
    });
    await AsyncStorage.setItem(key, 'scheduled');
  });
}
