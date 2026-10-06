import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Request Date/Time Change</Text>
          <View style={styles.backBtn} />
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
              This sends a rescheduling request. It does not automatically move any vendor booking.
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
                <Text style={styles.fieldText}>{timeLabel}</Text>
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
                Each affected vendor can accept or reject independently. If anyone rejects, your original booking remains unchanged and you can decide what to do next.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Sticky bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <TouchableOpacity
            disabled={submitting}
            activeOpacity={0.9}
            style={[styles.submit, submitting && { opacity: 0.6 }]}
            onPress={submit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={17} color="#fff" />
                <Text style={styles.submitText}>Send Rescheduling Request</Text>
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
            minimumDate={new Date()}
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
              minimumDate={new Date()}
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

function PickerSheet({
  visible,
  title,
  onDone,
  children,
}: {
  visible: boolean;
  title: string;
  onDone: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDone}>
      <View style={styles.sheetBackdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onDone} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onDone}>
              <Text style={styles.sheetDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: 'center' }}>{children}</View>
        </View>
      </View>
    </Modal>
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
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(61,18,51,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: BORDER,
    marginBottom: 12,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle: { color: PRIMARY_DARK, fontWeight: '800', fontSize: 16 },
  sheetDone: { color: PRIMARY, fontWeight: '800', fontSize: 16 },
});