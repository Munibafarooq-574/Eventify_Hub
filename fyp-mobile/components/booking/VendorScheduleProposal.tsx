import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { formatBookingActivityTime } from '@/utils/bookingActivity';
import { formatBookingTime } from '@/utils/bookingTimezone';
import { bookingActionError } from '@/services/bookingActionError';
import { proposeVendorSchedule, respondToVendorSchedule, type VendorScheduleSlot } from '@/services/cancellationReplacement';

type Props = {
  anchorId: string;
  timeZone: string;
  onUpdated: () => Promise<unknown>;
  canPropose?: boolean;
  canRespond?: boolean;
  proposal?: { id: string; status: string; reason: string; slots: VendorScheduleSlot[] };
};

export default function VendorScheduleProposal({ anchorId, timeZone, onUpdated, canPropose, canRespond, proposal }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<VendorScheduleSlot[]>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  if (!proposal && !canPropose) return null;

  const perform = async (operation: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      Alert.alert('Date/time request', bookingActionError(error, 'Refresh the booking and try again.').message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const request = () => perform(async () => {
    const result = await proposeVendorSchedule(anchorId, { date: date.trim(), time: time.trim(), reason: reason.trim(), slots: preview });
    if (!preview) {
      setPreview(result.slots);
      return;
    }
    setOpen(false);
    setPreview(undefined);
    setReason('');
    await onUpdated();
  });

  const respond = (accept: boolean) => perform(async () => {
    if (!proposal) return;
    await respondToVendorSchedule(anchorId, proposal.id, accept);
    await onUpdated();
  });

  const windowLabel = (start: string, end: string) =>
    `${formatBookingActivityTime(start, timeZone)} – ${formatBookingTime(end, timeZone)}`;
  const action = (label: string, onPress: () => void) => (
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onPress} style={[styles.button, busy && { opacity: 0.5 }]}>
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
  const pending = proposal?.status === 'PENDING';
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Vendor package date & time</Text>
      {!!proposal && <>
        <Text style={styles.text}>{pending ? 'Awaiting client decision' : proposal.status === 'ACCEPTED' ? 'Schedule accepted' : 'Request declined'}</Text>
        <Text style={styles.text}>{proposal.reason}</Text>
      </>}
      {!!(proposal || preview) && <Text style={styles.text}>Times shown in {timeZone.replace(/_/g, ' ')}</Text>}
      {(open ? preview : proposal?.slots)?.map(slot => (
        <View key={slot.bookingId} style={styles.slot}>
          <Text style={styles.title}>{slot.name}</Text>
          <Text style={styles.text}>Current · {windowLabel(slot.currentStart, slot.currentEnd)}</Text>
          <Text style={styles.text}>Proposed · {windowLabel(slot.proposedStart, slot.proposedEnd)}</Text>
        </View>
      ))}
      {pending && canRespond && <>
        {action('Accept proposed times', () => void respond(true))}
        {action('Decline request', () => void respond(false))}
      </>}
      {!pending && canPropose && (open ? <>
        <Text style={styles.text}>Enter the new start for the earliest pending package in {timeZone.replace(/_/g, ' ')}. Other packages move by the same amount and keep their duration.</Text>
        <TextInput accessibilityLabel="Proposed date" style={styles.input} value={date} editable={!busy} placeholder="YYYY-MM-DD" onChangeText={value => { setDate(value); setPreview(undefined); }} />
        <TextInput accessibilityLabel="Proposed time" style={styles.input} value={time} editable={!busy} placeholder="HH:mm (24-hour)" onChangeText={value => { setTime(value); setPreview(undefined); }} />
        <TextInput accessibilityLabel="Reason for schedule change" style={styles.input} value={reason} editable={!busy} placeholder="Reason for schedule change" maxLength={500} onChangeText={value => { setReason(value); setPreview(undefined); }} />
        {action(preview ? 'Send one request' : 'Preview package times', () => void request())}
        {action('Close', () => { setOpen(false); setPreview(undefined); })}
      </> : action('Request new date & time', () => setOpen(true)))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 12, gap: 8, marginVertical: 8, borderRadius: 12, backgroundColor: '#F7EEF5' },
  title: { fontWeight: '700', color: '#632052' },
  text: { color: '#63475D', lineHeight: 19 },
  slot: { gap: 3, paddingVertical: 6 },
  input: { borderWidth: 1, borderColor: '#D9C5D4', borderRadius: 8, minHeight: 44, padding: 10, backgroundColor: '#FFF', color: '#252025' },
  button: { backgroundColor: '#7B2869', borderRadius: 9, minHeight: 44, padding: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFF', fontWeight: '700' },
});
