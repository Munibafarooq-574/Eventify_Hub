import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { requestEventReschedule } from '@/services/rescheduleBooking';

const PRIMARY = '#7B2869';

export default function ClientRescheduleScreen() {
  const params = useLocalSearchParams<{
    orderId: string;
    eventName?: string;
    eventDate?: string;
    eventTime?: string;
    durationMinutes?: string;
  }>();

  const initialDate = useMemo(() => {
    const value = params.eventDate ? new Date(params.eventDate) : new Date();
    if (params.eventTime && /^\d{1,2}:\d{2}$/.test(params.eventTime)) {
      const [h, m] = params.eventTime.split(':').map(Number);
      value.setHours(h, m, 0, 0);
    }
    return value;
  }, [params.eventDate, params.eventTime]);

  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialDate);
  const [duration, setDuration] = useState(
    String(Number(params.durationMinutes || 60)),
  );
  const [reason, setReason] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const durationMinutes = Number(duration);
    if (!params.orderId) return Alert.alert('Error', 'Booking ID is missing.');
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      return Alert.alert('Invalid duration', 'Enter duration in minutes, for example 240.');
    }

    try {
      setSubmitting(true);
      const eventDate = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
      const eventTime =
        `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

      await requestEventReschedule(params.orderId, {
        eventDate,
        eventTime,
        durationMinutes,
        reason: reason.trim() || undefined,
      });

      Alert.alert(
        'Request sent',
        'Each vendor will review the new date/time independently. Your original booking stays unchanged until all required vendors accept and the backend completes final validation.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert('Could not request change', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={23} color={PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Date/Time Change</Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={22} color={PRIMARY} />
          <Text style={styles.noticeText}>
            This sends a rescheduling request. It does not automatically move any vendor booking.
          </Text>
        </View>

        <Text style={styles.eventName}>{params.eventName || 'Your event'}</Text>
        <Text style={styles.label}>New event date</Text>
        <TouchableOpacity style={styles.field} onPress={() => setShowDate(true)}>
          <Ionicons name="calendar-outline" size={19} color={PRIMARY} />
          <Text style={styles.fieldText}>{date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>New start time</Text>
        <TouchableOpacity style={styles.field} onPress={() => setShowTime(true)}>
          <Ionicons name="time-outline" size={19} color={PRIMARY} />
          <Text style={styles.fieldText}>{time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Event duration (minutes)</Text>
        <TextInput
          style={styles.input}
          value={duration}
          onChangeText={setDuration}
          keyboardType="number-pad"
          placeholder="240"
        />

        <Text style={styles.label}>Reason (optional)</Text>
        <TextInput
          style={[styles.input, styles.reason]}
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="Tell vendors why the event timing changed"
        />

        <View style={styles.warning}>
          <Text style={styles.warningTitle}>What happens next?</Text>
          <Text style={styles.warningText}>
            Each affected vendor can accept or reject independently. If anyone rejects, your original booking remains unchanged and you can decide what to do next.
          </Text>
        </View>

        <TouchableOpacity
          disabled={submitting}
          style={[styles.submit, submitting && { opacity: 0.6 }]}
          onPress={submit}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Send Rescheduling Request</Text>}
        </TouchableOpacity>
      </ScrollView>

      {showDate && (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, selected) => {
            setShowDate(Platform.OS === 'ios');
            if (selected) setDate(selected);
          }}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={time}
          mode="time"
          onChange={(_, selected) => {
            setShowTime(Platform.OS === 'ios');
            if (selected) setTime(selected);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8EAF2' },
  header: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0DCE7' },
  back: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#3D1233', fontSize: 17, fontWeight: '800' },
  content: { padding: 18, paddingBottom: 42 },
  notice: { flexDirection: 'row', gap: 10, backgroundColor: '#F1DDEB', padding: 14, borderRadius: 14, marginBottom: 20 },
  noticeText: { flex: 1, color: '#5C3452', lineHeight: 20, fontSize: 13 },
  eventName: { fontSize: 22, fontWeight: '800', color: '#3D1233', marginBottom: 20 },
  label: { color: '#5C3452', fontWeight: '700', marginBottom: 7, marginTop: 12 },
  field: { height: 52, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#E8D4E1', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldText: { color: '#3D1233', fontWeight: '600' },
  input: { minHeight: 52, backgroundColor: '#fff', borderRadius: 13, borderWidth: 1, borderColor: '#E8D4E1', paddingHorizontal: 14, color: '#3D1233' },
  reason: { minHeight: 92, paddingTop: 13, textAlignVertical: 'top' },
  warning: { backgroundColor: '#FFF8E8', borderRadius: 14, padding: 14, marginTop: 20 },
  warningTitle: { fontWeight: '800', color: '#7A5A00', marginBottom: 5 },
  warningText: { color: '#725F27', lineHeight: 19, fontSize: 13 },
  submit: { marginTop: 24, backgroundColor: PRIMARY, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
