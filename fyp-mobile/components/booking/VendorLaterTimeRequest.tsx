import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { requestLaterServiceTime } from '@/services/cancellationReplacement';
import { bookingActionError } from '@/services/bookingActionError';
import { formatBookingActivityTime } from '@/utils/bookingActivity';

export default function VendorLaterTimeRequest({ booking, event, available, onUpdated }: {
  booking: any; event: any; available: boolean; onUpdated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<any>(null);
  const lock = useRef(false);
  const request = booking.laterTimeRequest || sent;
  const future = new Date(event.eventStartDateTime).getTime() > Date.now();
  if (!request && (!available || booking.status !== 'pending' || !future)) return null;
  const labels: Record<string, string> = { PENDING: future && booking.status === 'pending' ? 'Awaiting client decision' : 'Request closed — original event or booking is no longer available', RESCHEDULE_REQUESTED: 'Client requested rescheduling — review the schedule request', REPLACED: 'Client requested a replacement vendor', CONTINUE_WITHOUT: 'Client chose to continue without this vendor' };
  const send = async () => {
    if (lock.current) return;
    if (!reason.trim()) { Alert.alert('Reason required', 'Please explain why a later service time is needed.'); return; }
    if ((date.trim() || time.trim()) && (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim()) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim()))) {
      Alert.alert('Check suggested time', 'Enter both date as YYYY-MM-DD and time as HH:mm, for example 2026-10-28 and 15:00.'); return;
    }
    lock.current = true; setBusy(true);
    try {
      const result = await requestLaterServiceTime(String(booking._id), { reason: reason.trim(), ...(date.trim() ? { suggestedDate: date.trim(), suggestedTime: time.trim() } : {}) });
      setSent(result); setOpen(false);
      await onUpdated();
    } catch (error: any) { Alert.alert('Request could not be sent', bookingActionError(error, 'Please refresh your booking and try again.').message); }
    finally { lock.current = false; setBusy(false); }
  };
  return <View style={styles.box}>
    <Text style={styles.title}>Later service time</Text>
    {request ? <>
      <Text style={styles.text}>{labels[request.status] || 'Request closed'}</Text>
      <Text style={styles.text}>{request.reason}</Text>
      <Text style={styles.text}>Requested: {formatBookingActivityTime(request.requestedAt, event.eventCityId?.timeZone)}</Text>
      {!!request.suggestedEventStart && <Text style={styles.text}>Suggested event time: {formatBookingActivityTime(request.suggestedEventStart, event.eventCityId?.timeZone)}</Text>}
      {!!request.resolvedAt && <Text style={styles.text}>Client decision: {formatBookingActivityTime(request.resolvedAt, event.eventCityId?.timeZone)}</Text>}
    </> : !open ? <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => setOpen(true)}><Text style={styles.buttonText}>Request later service time</Text></TouchableOpacity> : <>
      <Text style={styles.text}>The client chooses whether to reschedule, replace your booking or continue without you. Sending this request does not change the event time.</Text>
      <TextInput accessibilityLabel="Reason for later service time" placeholder="Reason (required)" value={reason} onChangeText={setReason} maxLength={500} multiline style={styles.input} />
      <Text style={styles.text}>Optional suggested event date/time, in {event.eventCityId?.timeZone || 'the event city timezone'}. Availability will be checked when rescheduling.</Text>
      <TextInput accessibilityLabel="Suggested date YYYY-MM-DD" placeholder="Date: YYYY-MM-DD" value={date} onChangeText={setDate} maxLength={10} style={styles.input} />
      <TextInput accessibilityLabel="Suggested time HH:mm" placeholder="Time: HH:mm (24-hour, e.g. 15:00)" value={time} onChangeText={setTime} maxLength={5} style={styles.input} />
      <TouchableOpacity accessibilityRole="button" disabled={busy || !reason.trim()} style={styles.button} onPress={() => void send()}><Text style={styles.buttonText}>{busy ? 'Sending…' : 'Send request'}</Text></TouchableOpacity>
      <TouchableOpacity disabled={busy} onPress={() => setOpen(false)}><Text style={styles.text}>Close</Text></TouchableOpacity>
    </>}
  </View>;
}
const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', padding: 12, marginVertical: 8, backgroundColor: '#F7EEF5', borderRadius: 12, gap: 8 },
  title: { fontWeight: '700', fontSize: 14, color: '#632052' }, text: { fontSize: 13, lineHeight: 19, color: '#63475D' },
  input: { borderWidth: 1, borderColor: '#D9C5D4', borderRadius: 8, padding: 10, backgroundColor: '#FFF', color: '#252025', minHeight: 44 },
  button: { backgroundColor: '#7B2869', borderRadius: 9, minHeight: 44, padding: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
