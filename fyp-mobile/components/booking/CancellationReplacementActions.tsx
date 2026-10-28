import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { bookingActionError } from '@/services/bookingActionError';
import { formatBookingActivityTime } from '@/utils/bookingActivity';
import { getSecureData, saveSecureData } from '@/store';
import { continueWithoutCancelledVendor, getCancellationReplacement } from '@/services/cancellationReplacement';

type Props = { event: any; booking: any; onUpdated: () => Promise<void>; canReschedule?: boolean };
export default function CancellationReplacementActions({ event, booking, onUpdated, canReschedule = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lock = useRef(false);
  const [replacementState, setReplacementState] = useState<'checking' | 'available' | 'unavailable' | 'error'>('checking');
  useEffect(() => {
    let active = true;
    const eligible = (booking.status === 'pending' && booking.laterTimeRequest?.status === 'PENDING') || (booking.status === 'cancelled_by_vendor' && booking.cancelledBy === 'vendor');
    if (!eligible || !(new Date(event.eventStartDateTime).getTime() > Date.now())) return;
    setReplacementState('checking');
    getCancellationReplacement(String(booking._id)).then(context => { if (active) setReplacementState(context.canReplace === false ? 'unavailable' : 'available'); }).catch(() => { if (active) setReplacementState('error'); });
    return () => { active = false; };
  }, [booking._id, booking.status, booking.laterTimeRequest?.status, event.eventStartDateTime, now]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const replacement = (event.vendorOrders || []).find((item: any) =>
    String(item.replacesVendorOrderId || '') === String(booking._id) &&
    ['pending', 'accepted', 'completed'].includes(String(item.status)) && !['EXPIRED', 'PAYMENT_EXPIRED'].includes(item.paymentStatus));
  const later = booking.laterTimeRequest;
  const laterPending = booking.status === 'pending' && later?.status === 'PENDING' && !booking.replacementOutcome;
  if (later && !laterPending && booking.status !== 'cancelled_by_vendor') return <Text style={styles.hint}>{later.status === 'RESCHEDULE_REQUESTED' ? later.clientAcceptedSuggestion ? 'You agreed to the vendor’s suggested time. Check the event details for the updated schedule; other vendors must also confirm if involved.' : 'Your schedule change request has been sent for vendor review.' : later.status === 'REPLACED' ? 'You requested a replacement vendor.' : later.status === 'CONTINUE_WITHOUT' ? 'You chose to continue without this vendor.' : 'This later-time request is closed.'}{later.resolvedAt ? ` ${formatBookingActivityTime(later.resolvedAt, event.eventCityId?.timeZone)}` : ''}</Text>;
  if (!laterPending && (booking.status !== 'cancelled_by_vendor' || booking.cancelledBy !== 'vendor')) return null;
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
      if (context.canReplace === false) { setReplacementState('unavailable'); throw new Error('No replacement is available for this time. Please choose a later time or continue without this vendor.'); }
      await saveSecureData('eventDetails', JSON.stringify(context.eventDetails));
      router.push({ pathname: '/categoryvendorlisting', params: {
        categoryIds: JSON.stringify([context.categoryId]), categoryNames: JSON.stringify([context.categoryName]),
        eventCityId: context.eventDetails.eventCityId, eventDate: context.eventDetails.eventDate,
        startTime: context.eventDetails.startTime, durationMinutes: String(context.eventDetails.durationMinutes),
        replacementMode: 'true', replacementOrderId: context.orderId,
        excludedVendorIds: JSON.stringify(context.excludedVendorIds), excludedVendorId: String(booking.vendorId?._id || booking.vendorId),
      }});
    } catch (error: any) {
      Alert.alert('Unable to update booking', error?.response ? bookingActionError(error, 'Please refresh this event and try again.').message : error?.message || 'Please refresh this event and try again.');
    } finally { lock.current = false; setBusy(false); }
  };
  return <View style={styles.box}>
    <Text style={styles.title}>{laterPending ? 'Vendor requested a later service time' : 'Need another vendor?'}</Text>
    {laterPending && <>
      <Text style={styles.hint}>{later.reason}</Text>
      <Text style={styles.hint}>Requested: {formatBookingActivityTime(later.requestedAt, event.eventCityId?.timeZone)}</Text>
      {!!later.suggestedEventStart && <Text style={styles.hint}>Suggested event time: {formatBookingActivityTime(later.suggestedEventStart, event.eventCityId?.timeZone)}. Availability is checked when you reschedule.</Text>}
      {canReschedule ? <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.primary} onPress={() => {
        let suggestedDate = event.eventDate, suggestedTime = event.eventTime;
        if (later.suggestedEventStart && Number.isFinite(new Date(later.suggestedEventStart).getTime())) {
          const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: event.eventCityId?.timeZone || 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(later.suggestedEventStart)).map(part => [part.type, part.value]));
          suggestedDate = `${parts.year}-${parts.month}-${parts.day}`; suggestedTime = `${parts.hour}:${parts.minute}`;
        }
        router.push({ pathname: '/reschedulebooking', params: { orderId: event._id, eventName: event.eventName, eventDate: suggestedDate, eventTime: suggestedTime, durationMinutes: String(event.eventDurationMinutes || 60) } });
      }}><Text style={styles.primaryText}>Review &amp; reschedule</Text></TouchableOpacity>
      : <Text style={styles.hint}>Rescheduling is unavailable under this event’s existing payment or schedule-change rules.</Text>}
    </>}
    <Text style={styles.hint}>{booking.cancellationReplacementChoice === 'CONTINUE_WITHOUT'
      ? 'You chose to continue without this vendor. You can still find a replacement before the event starts.'
      : laterPending ? 'Choose a replacement for the current event time, or continue without this vendor. No payment has been taken for this pending booking.' : 'Find a replacement for this event, or continue with your remaining vendors. Your refund is handled separately.'}</Text>
    <TouchableOpacity accessibilityRole="button" disabled={busy || replacementState !== 'available'} style={[styles.primary, replacementState !== 'available' && { opacity: 0.5 }]} onPress={() => void run(false)}><Text style={styles.primaryText}>{busy ? 'Please wait…' : 'Find replacement'}</Text></TouchableOpacity>
    {replacementState === 'checking' && <Text style={styles.hint}>Checking available replacements…</Text>}
    {replacementState === 'unavailable' && <Text style={styles.hint}>No replacement is available for this time. You can choose a later time where offered, or continue without this vendor.</Text>}
    {replacementState === 'error' && <Text style={styles.hint}>We could not check replacements. Refresh this event to try again.</Text>}
    {booking.cancellationReplacementChoice !== 'CONTINUE_WITHOUT' && <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={() => Alert.alert('Continue without this vendor?', 'Only this vendor booking will be closed. Your event and other vendors will stay unchanged.', [
      { text: 'Keep booking', style: 'cancel' }, { text: 'Continue without', onPress: () => void run(true) },
    ])}><Text style={styles.secondaryText}>Continue without this vendor</Text></TouchableOpacity>}
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
