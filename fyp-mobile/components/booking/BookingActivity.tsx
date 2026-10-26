import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { bookingActivity, formatBookingActivityTime, type BookingActivityRecord } from '@/utils/bookingActivity';

export default function BookingActivity({ booking, timeZone, cancellationDetailsVisible = false }: {
  booking: BookingActivityRecord; timeZone?: string; cancellationDetailsVisible?: boolean;
}) {
  const rows = bookingActivity(booking, cancellationDetailsVisible);
  if (!rows.length) return null;
  return <View style={styles.box}>
    <Text style={styles.title}>Booking activity</Text>
    {rows.map(row => <Text key={row.label} style={styles.row}>
      <Text style={styles.label}>{row.label}: </Text>{formatBookingActivityTime(row.at, timeZone)}
    </Text>)}
    {!!timeZone && <Text style={styles.zone}>Times shown in {timeZone.replace(/_/g, ' ')}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', marginVertical: 8, padding: 10, borderRadius: 10, backgroundColor: '#F7F3F8', gap: 4 },
  title: { fontSize: 12, fontWeight: '700', color: '#632052', marginBottom: 2 },
  row: { fontSize: 12, lineHeight: 18, color: '#534B57', flexShrink: 1 },
  label: { fontWeight: '600' }, zone: { fontSize: 10, color: '#736B77', marginTop: 2 },
});
