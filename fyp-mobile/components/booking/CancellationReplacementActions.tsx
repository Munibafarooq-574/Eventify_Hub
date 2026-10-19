import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { getSecureData, saveSecureData } from '@/store';
import { continueWithoutCancelledVendor, getCancellationReplacement } from '@/services/cancellationReplacement';

type Props = { event: any; booking: any; onUpdated: () => Promise<void> };
export default function CancellationReplacementActions({ event, booking, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lock = useRef(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const replacement = (event.vendorOrders || []).find((item: any) =>
    String(item.replacesVendorOrderId || '') === String(booking._id) &&
    ['pending', 'accepted', 'completed'].includes(String(item.status)) && !['EXPIRED', 'PAYMENT_EXPIRED'].includes(item.paymentStatus));
  if (booking.status !== 'cancelled_by_vendor' || booking.cancelledBy !== 'vendor') return null;
  if ((event.vendorOrders || []).some((item: any) => String(item.replacesVendorOrderId || '') === String(booking._id) && item.status === 'cancelled_by_vendor')) return <Text style={styles.hint}>The replacement vendor cancelled. Use its booking history to find another replacement.</Text>;
  if (replacement) return <Text style={styles.hint}>{replacement.status === 'pending' ? 'Replacement requested — awaiting vendor response.' : `Replaced by ${replacement.vendorId?.contactDetails?.brandName || replacement.vendorId?.name || replacement.serviceName || 'another vendor'}.`}</Text>;
  const start = new Date(event.eventStartDateTime).getTime();
  if (!Number.isFinite(start) || start <= now || ['completed', 'cancelled'].includes(event.status)) return null;
  const run = async (without: boolean) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (without) {
        await continueWithoutCancelledVendor(String(booking._id));
        await onUpdated();
        return;
      }
      const rawCart = await getSecureData('cartData');
      let cart: any = null;
      try { cart = rawCart ? JSON.parse(rawCart) : null; } catch { throw new Error('Please clear your current cart before finding a replacement.'); }
      if (cart?.vendors?.length) throw new Error('Complete or clear your current cart before finding a replacement.');
      const context = await getCancellationReplacement(String(booking._id));
      await saveSecureData('eventDetails', JSON.stringify(context.eventDetails));
      router.push({ pathname: '/categoryvendorlisting', params: {
        categoryIds: JSON.stringify([context.categoryId]), categoryNames: JSON.stringify([context.categoryName]),
        eventCityId: context.eventDetails.eventCityId, eventDate: context.eventDetails.eventDate,
        startTime: context.eventDetails.startTime, durationMinutes: String(context.eventDetails.durationMinutes),
        replacementMode: 'true', replacementOrderId: context.orderId,
        excludedVendorIds: JSON.stringify(context.excludedVendorIds), excludedVendorId: String(booking.vendorId?._id || booking.vendorId),
      }});
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message;
      Alert.alert('Replacement unavailable', typeof message === 'string' ? message : 'Please refresh this event and try again.');
    } finally { lock.current = false; setBusy(false); }
  };
  return <View style={styles.box}>
    <Text style={styles.title}>Need another vendor?</Text>
    <Text style={styles.hint}>{booking.cancellationReplacementChoice === 'CONTINUE_WITHOUT'
      ? 'You chose to continue without this vendor. You can still find a replacement before the event starts.'
      : 'Find a replacement for this event, or continue with your remaining vendors. Your refund is handled separately.'}</Text>
    <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.primary} onPress={() => void run(false)}><Text style={styles.primaryText}>{busy ? 'Please wait…' : 'Find replacement'}</Text></TouchableOpacity>
    {booking.cancellationReplacementChoice !== 'CONTINUE_WITHOUT' && <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => void run(true)}><Text style={styles.secondaryText}>Continue without this vendor</Text></TouchableOpacity>}
  </View>;
}
const styles = StyleSheet.create({
  box: { marginTop: 12, padding: 14, borderRadius: 14, backgroundColor: '#F5EBF2', borderWidth: 1, borderColor: '#E8D2E1' },
  title: { fontSize: 15, fontWeight: '700', color: '#632052' },
  hint: { fontSize: 13, lineHeight: 20, color: '#765D70', marginVertical: 8 },
  primary: { minHeight: 44, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7B2869' },
  primaryText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  secondary: { minHeight: 44, padding: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: '#7B2869', fontSize: 13, fontWeight: '600' },
});
