import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { getVendorPublicSchedule, type VendorPublicSchedule } from '@/services/getVendorAvailability';

const PRIMARY = '#780C60';

type Props = {
  vendorId: string;
  initialDate?: string;
};

export default function VendorScheduleCalendar({ vendorId, initialDate }: Props) {
  const [calendarStart, setCalendarStart] = useState(initialDate);
  const [date, setDate] = useState(initialDate);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    requestedDate?: string;
    retry: number;
    schedule?: VendorPublicSchedule;
  }>();

  useEffect(() => {
    let active = true;
    getVendorPublicSchedule(vendorId, date).then(
      (schedule) => {
        if (!active) return;
        setCalendarStart(value => value ?? schedule.date);
        setResult({ requestedDate: date, retry, schedule });
      },
      () => { if (active) setResult({ requestedDate: date, retry }); },
    );
    return () => { active = false; };
  }, [vendorId, date, retry]);

  const current = result && result.requestedDate === date && result.retry === retry ? result : undefined;
  const schedule = current?.schedule;
  const selected = date ?? schedule?.date;
  const formatTime = (instant: string) => new Date(instant).toLocaleTimeString('en-US', {
    timeZone: schedule?.timeZone,
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Vendor availability</Text>
      <Text style={styles.secondary}>Select a date to view the vendor’s schedule.</Text>
      {selected && (
        <Calendar
          initialDate={calendarStart}
          onDayPress={day => setDate(day.dateString)}
          markedDates={{ [selected]: { selected: true, selectedColor: PRIMARY } }}
          theme={{ arrowColor: PRIMARY, todayTextColor: PRIMARY }}
        />
      )}
      {!current ? (
        <ActivityIndicator color={PRIMARY} accessibilityLabel="Loading schedule" />
      ) : !schedule ? (
        <View style={styles.section}>
          <Text accessibilityRole="alert">Couldn’t load the vendor’s schedule.</Text>
          <TouchableOpacity style={styles.retry} accessibilityRole="button" onPress={() => setRetry(value => value + 1)}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.secondary}>Times shown in {schedule.timeZone}</Text>
          {schedule.unavailable ? (
            <View style={styles.unavailable}>
              <Text style={styles.status}>Vendor unavailable on this date</Text>
              {!!schedule.reason && <Text style={styles.secondary}>{schedule.reason}</Text>}
            </View>
          ) : schedule.slots.map(slot => (
            <View key={slot.start} style={styles.slot}>
              <Text style={styles.slotTime}>{formatTime(slot.start)} – {formatTime(slot.end)}</Text>
              <Text style={[styles.status, { color: slot.booked ? '#9F3125' : '#226744' }]}>
                {slot.booked ? 'Booked' : 'Available'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: 16, padding: 16, gap: 10, backgroundColor: '#FFF', borderRadius: 16 },
  title: { fontSize: 19, fontWeight: '800', color: PRIMARY },
  secondary: { fontSize: 13, color: '#625560' },
  section: { gap: 8 },
  unavailable: { padding: 12, gap: 5, backgroundColor: '#FBEAE7', borderRadius: 10 },
  status: { fontWeight: '700', color: '#8C3026' },
  slot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: '#F9F1F6' },
  slotTime: { flex: 1, color: '#2B1B29' },
  retry: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  retryText: { color: PRIMARY, fontWeight: '700' },
});
