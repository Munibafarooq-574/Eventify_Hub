import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { bookingCancellation, type CancellationRecord } from '@/utils/bookingCancellation';

export default function BookingCancellationDetails({ booking }: { booking: CancellationRecord }) {
  const details = bookingCancellation(booking);
  if (!details) return null;
  return <View style={styles.box}>
    <Text style={styles.title}>Cancellation details</Text>
    <Text style={styles.text}><Text style={styles.label}>Cancelled by: </Text>{details.cancelledBy}</Text>
    <Text style={styles.text}><Text style={styles.label}>Reason: </Text>{details.reason}</Text>
    <Text style={styles.text}><Text style={styles.label}>Cancelled at: </Text>{details.cancelledAt}</Text>
  </View>;
}
const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#FFF1F3', borderWidth: 1, borderColor: '#F1CFD6', gap: 5 },
  title: { color: '#8C2940', fontWeight: '800', fontSize: 13, marginBottom: 2 },
  label: { fontWeight: '700' }, text: { color: '#5F3041', fontSize: 12, lineHeight: 19 },
});
