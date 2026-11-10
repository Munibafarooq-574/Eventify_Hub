import { bookingDateKey } from '@/utils/bookingTimezone';
import PickerSheet from '@/components/booking/PickerSheet';
import DeliveryTimePicker from '@/components/booking/DeliveryTimePicker';
import { growthApi } from '@/services/growthApiClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { requestEventReschedule } from '@/services/rescheduleBooking';

const PRIMARY = '#7B2869';
const PRIMARY_DARK = '#3D1233';
const PRIMARY_SOFT = '#F1DDEB';
const BG = '#FBF4F8';
const BORDER = '#EBD9E4';
const MUTED = '#8A6B80';

const DURATION_PRESETS = [60, 120, 180, 240, 360, 480];

const formatPreset = (m: number) => (m % 60 === 0 ? `${m / 60}h` : `${m}m`);

export default function ClientRescheduleScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    orderId: string;
    eventName?: string;
    eventDate?: string;
    eventTime?: string;
    eventTimeZone?: string;
    durationMinutes?: string;
  }>();

  const initialDate = useMemo(() => {
    const key = String(params.eventDate || '').slice(0, 10);
    // Native pickers edit event-city calendar fields, not the UTC instant.
    const value = /^\d{4}-\d{2}-\d{2}$/.test(key) ? new Date(`${key}T12:00:00`) : new Date();
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

  const [deliveryBookings,setDeliveryBookings] = useState<any[]>([]);
  const [deliveryTimes,setDeliveryTimes] = useState<Record<string, { startDateTime: string; schedule: string } | null>>({});
  const [deliveryLoading,setDeliveryLoading] = useState(true);
  const [deliveryError,setDeliveryError] = useState('');
  useEffect(() => {
    let active = true;
    growthApi.get<any[]>(`/orders/${params.orderId}/delivery-context`).then(result => {if(active)setDeliveryBookings(result);}).catch(() => {if(active)setDeliveryError('Delivery details could not be checked. Please return to your event and try again.');}).finally(() => {if(active)setDeliveryLoading(false);});
    return () => {active=false;};
  },[params.orderId]);
  const newDateKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const newTimeKey = `${String(time.getHours()).padStart(2,'0')}:${String(time.getMinutes()).padStart(2,'0')}`;

  const schedule = `${newDateKey}|${newTimeKey}|${Number(duration)}`;
  const missingDeliveryTime = deliveryBookings.some(booking => deliveryTimes[String(booking._id)]?.schedule !== schedule);
  const submitDisabled = submitting || deliveryLoading || !!deliveryError || missingDeliveryTime;

  const submit = async () => {
    if (submitDisabled) return;
    const durationMinutes = Number(duration);
    if (!params.orderId) return Alert.alert('Error', 'Booking ID is missing.');
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      return Alert.alert('Invalid duration', 'Enter duration in minutes, for example 240.');
    }

    if (!reason.trim()) {
  return Alert.alert(
    'Reason required',
    'Please enter a reason for changing the event date/time.',
  );
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
        reason: reason.trim(),
        deliveryTimes: Object.fromEntries(deliveryBookings.flatMap(booking => {
          const id = String(booking._id);
          const selection = deliveryTimes[id];
          return selection?.schedule === schedule ? [[id, selection.startDateTime]] : [];
        })),
      });

      Alert.alert(
        'Schedule change request sent 💜',
        'We’ve shared your preferred date and time with your vendors. Your current schedule will stay in place until the update is confirmed.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (error: any) {
      Alert.alert('Could not request change', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const dateLabel = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const timeLabel = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const isIOS = Platform.OS === 'ios';

  return (
    <View style={styles.page}>
      <StatusBar barStyle="light-content" />

      {/* Hero header */}
      <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
        <View style={styles.heroDecorA} />
        <View style={styles.heroDecorB} />

        <View style={styles.heroTopRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Back" activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Request Date &amp; Time Change</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.heroEvent}>
          <View style={styles.heroIcon}>
            <Ionicons name="sparkles" size={20} color={PRIMARY} />
          </View>
          <Text style={styles.eventName} numberOfLines={2}>
            {params.eventName || 'Your event'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 130 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Notice */}
          <View style={styles.notice}>
            <View style={styles.noticeIcon}>
              <Ionicons name="information" size={16} color="#fff" />
            </View>
            <Text style={styles.noticeText}>
              Your preferred schedule will be shared with your vendors. Your current booking stays safely in place until the update is confirmed.
            </Text>
          </View>

          {/* Schedule card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar" size={18} color={PRIMARY} />
              <Text style={styles.cardTitle}>New schedule</Text>
            </View>

            <Text style={styles.label}>New event date</Text>
            <TouchableOpacity style={styles.field} activeOpacity={0.8} onPress={() => setShowDate(true)}>
              <View style={styles.fieldIcon}>
                <Ionicons name="calendar-outline" size={20} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldText}>{dateLabel}</Text>
                <Text style={styles.fieldSub}>{weekday}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={MUTED} />
            </TouchableOpacity>

            <Text style={styles.label}>New start time</Text>
            <TouchableOpacity style={styles.field} activeOpacity={0.8} onPress={() => setShowTime(true)}>
              <View style={styles.fieldIcon}>
                <Ionicons name="time-outline" size={20} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldText}>{timeLabel} · {params.eventTimeZone || 'UTC'}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Duration card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="hourglass" size={18} color={PRIMARY} />
              <Text style={styles.cardTitle}>Event duration (minutes)</Text>
            </View>

            <View style={styles.chipsRow}>
              {DURATION_PRESETS.map((m) => {
                const active = duration === String(m);
                return (
                  <TouchableOpacity
                    key={m}
                    activeOpacity={0.8}
                    onPress={() => setDuration(String(m))}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {formatPreset(m)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.inputWrap}>
              <TextInput
                style={styles.inputInner}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                placeholder="240"
                placeholderTextColor="#C2A8B9"
              />
              <Text style={styles.inputSuffix}>min</Text>
            </View>
          </View>

          {deliveryLoading && <ActivityIndicator color={PRIMARY} />}
          {!!deliveryError && <Text style={styles.warningText}>{deliveryError}</Text>}
          {deliveryBookings.map(booking => <View key={booking._id} style={styles.card}>
            <Text style={styles.cardTitle}>{booking.serviceName} · New delivery time</Text>
            <DeliveryTimePicker orderId={params.orderId} vendorOrderId={String(booking._id)} eventDate={newDateKey} eventStartTime={newTimeKey} eventDurationMinutes={Number(duration)} onChange={slot => setDeliveryTimes(current => ({...current,[String(booking._id)]:slot ? { startDateTime: slot.startDateTime, schedule } : null}))} />
          </View>)}
          {/* Reason card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubble-ellipses" size={18} color={PRIMARY} />
              <Text style={styles.cardTitle}>Reason *</Text>
            </View>
            <TextInput
              style={styles.reason}
              value={reason}
              onChangeText={setReason}
              multiline
              placeholder="Enter reason for changing the event date/time"
              placeholderTextColor="#C2A8B9"
            />
          </View>

          {/* What happens next */}
          <View style={styles.warning}>
            <View style={styles.warningIcon}>
              <Ionicons name="alert-circle" size={22} color="#B8860B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>What happens next?</Text>
              <Text style={styles.warningText}>
                Each vendor can confirm whether the new schedule works for them. If someone isn’t available, your current booking stays safe and you’ll have the option to choose another vendor.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableOpacity
            disabled={submitDisabled}
            accessibilityState={{ disabled: submitDisabled }}
            activeOpacity={0.9}
            style={[styles.submit, submitDisabled && { opacity: 0.6 }]}
            onPress={submit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={17} color="#fff" />
                <Text style={styles.submitText}>Send Schedule Change Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Pickers */}
      {isIOS ? (
        <>
          <PickerSheet visible={showDate} title="New event date" onDone={() => setShowDate(false)}>
            <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            minimumDate={new Date(`${bookingDateKey(new Date(), params.eventTimeZone || 'UTC')}T00:00:00`)}
            textColor={PRIMARY_DARK}
            themeVariant="light"
            style={{ width: '100%', height: 180 }}
            onChange={(_, selected) => {
              if (selected) setDate(selected);
            }}
          />
          </PickerSheet>
          <PickerSheet visible={showTime} title="New start time" onDone={() => setShowTime(false)}>
            <DateTimePicker
            value={time}
            mode="time"
            display="spinner"
            textColor={PRIMARY_DARK}
            themeVariant="light"
            style={{ width: '100%', height: 180 }}
            onChange={(_, selected) => {
              if (selected) setTime(selected);
            }}
          />
          </PickerSheet>
        </>
      ) : (
        <>
          {showDate && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              minimumDate={new Date(`${bookingDateKey(new Date(), params.eventTimeZone || 'UTC')}T00:00:00`)}
              onChange={(_, selected) => {
                setShowDate(false);
                if (selected) setDate(selected);
              }}
            />
          )}
          {showTime && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={(_, selected) => {
                setShowTime(false);
                if (selected) setTime(selected);
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG },

  // Hero
  hero: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingBottom: 26,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
  },
  heroDecorA: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -60,
    right: -50,
  },
  heroDecorB: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -40,
    left: -30,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  heroEvent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventName: { flex: 1, fontSize: 24, fontWeight: '800', color: '#fff' },

  content: { padding: 18 },

  // Notice
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: PRIMARY_SOFT,
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  noticeIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeText: { flex: 1, color: '#5C3452', lineHeight: 20, fontSize: 13 },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: PRIMARY,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  cardTitle: { color: PRIMARY_DARK, fontWeight: '800', fontSize: 15 },
  label: { color: MUTED, fontWeight: '700', fontSize: 12, marginBottom: 7, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  field: {
    minHeight: 58,
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: PRIMARY_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldText: { color: PRIMARY_DARK, fontWeight: '700', fontSize: 15 },
  fieldSub: { color: MUTED, fontSize: 12, marginTop: 1 },

  // Duration
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 12 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { color: PRIMARY_DARK, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  inputInner: { flex: 1, color: PRIMARY_DARK, fontSize: 16, fontWeight: '700', paddingVertical: 12 },
  inputSuffix: { color: MUTED, fontWeight: '700' },

  // Reason
  reason: {
    minHeight: 96,
    backgroundColor: BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingTop: 13,
    marginTop: 8,
    color: PRIMARY_DARK,
    textAlignVertical: 'top',
  },

  // Warning
  warning: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFF8E8',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F5E4B8',
    marginTop: 2,
  },
  warningIcon: { paddingTop: 1 },
  warningTitle: { fontWeight: '800', color: '#7A5A00', marginBottom: 5, fontSize: 14 },
  warningText: { color: '#725F27', lineHeight: 19, fontSize: 13 },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  submit: {
    backgroundColor: PRIMARY,
    minHeight: 54,
    borderRadius: 16,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // iOS picker sheet
});
