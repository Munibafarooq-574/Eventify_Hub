//fyp-mobile/components/VendorAvailabilitySettings/VendorAvailabilitySettings.tsx
import getVendorAvailability from '@/services/getVendorAvailability';
import patchVendorAvailability from '@/services/patchVendorAvailability';
import { getUserData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';
const ACCENT = '#B84B9A';

const DAYS: { code: string; label: string }[] = [
  { code: 'MON', label: 'Monday' },
  { code: 'TUE', label: 'Tuesday' },
  { code: 'WED', label: 'Wednesday' },
  { code: 'THU', label: 'Thursday' },
  { code: 'FRI', label: 'Friday' },
  { code: 'SAT', label: 'Saturday' },
  { code: 'SUN', label: 'Sunday' },
];

const ADVANCE_OPTIONS = [
  { label: 'No minimum', value: 0 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '4 hours', value: 240 },
  { label: '8 hours', value: 480 },
  { label: '1 day', value: 1440 },
  { label: '2 days', value: 2880 },
];

const toKey = (d: string | Date) => new Date(d).toISOString().split('T')[0];

const timeToDate = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
const dateToTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const formatDisplayTime = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

const VendorAvailabilitySettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);

  const [workingDays, setWorkingDays] = useState(
    DAYS.map((d) => ({ day: d.code, enabled: true })),
  );
  const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00');
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [minimumAdvanceMinutes, setMinimumAdvanceMinutes] = useState(0);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showBlockCalendar, setShowBlockCalendar] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const user = await getUserData();
        if (!user?._id) {
          Alert.alert('Error', 'Could not identify vendor account.');
          setLoading(false);
          return;
        }
        setVendorId(user._id);

        const data = await getVendorAvailability(user._id);
        if (data?.workingDays?.length) setWorkingDays(data.workingDays);
        if (data?.workingHoursStart) setWorkingHoursStart(data.workingHoursStart);
        if (data?.workingHoursEnd) setWorkingHoursEnd(data.workingHoursEnd);
        if (data?.blockedDates) {
          setBlockedDates(data.blockedDates.map((d: string) => toKey(d)));
        }
        if (typeof data?.minimumAdvanceMinutes === 'number') {
          setMinimumAdvanceMinutes(data.minimumAdvanceMinutes);
        }
      } catch (error) {
        console.error('Error loading availability settings:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggleDay = (code: string) => {
    setWorkingDays((prev) =>
      prev.map((d) => (d.day === code ? { ...d, enabled: !d.enabled } : d)),
    );
  };

  const toggleBlockedDate = (dateStr: string) => {
    setBlockedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr],
    );
  };

  const handleSave = async () => {
    if (!vendorId) return;

    // Basic sanity check so vendors can't save an inverted working window
    if (workingHoursStart >= workingHoursEnd) {
      Alert.alert('Invalid hours', 'Working hours start must be before the end time.');
      return;
    }

    setSaving(true);
    try {
      await patchVendorAvailability(vendorId, {
        workingDays,
        workingHoursStart,
        workingHoursEnd,
        blockedDates,
        minimumAdvanceMinutes,
      });
      Alert.alert('Saved', 'Your availability settings have been updated.');
    } catch (error) {
      console.error('Error saving availability settings:', error);
      Alert.alert('Error', 'Could not save availability settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const blockedMarks = blockedDates.reduce((acc: Record<string, any>, dateStr) => {
    acc[dateStr] = {
      customStyles: {
        container: { backgroundColor: '#D9534F', borderRadius: 8 },
        text: { color: '#FFFFFF', fontWeight: '800' },
      },
    };
    return acc;
  }, {});

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Availability Settings</Text>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Working Days */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Working Days</Text>
          <Text style={styles.cardSubtitle}>
            Turn off any day you don't accept bookings on.
          </Text>
          {DAYS.map(({ code, label }) => {
            const entry = workingDays.find((d) => d.day === code);
            return (
              <View key={code} style={styles.row}>
                <Text style={styles.rowLabel}>{label}</Text>
                <Switch
                  value={!!entry?.enabled}
                  onValueChange={() => toggleDay(code)}
                  trackColor={{ false: '#E3D3DD', true: ACCENT }}
                  thumbColor="#FFFFFF"
                />
              </View>
            );
          })}
        </View>

        {/* Working Hours */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Working Hours</Text>
          <Text style={styles.cardSubtitle}>
            Bookings must fit entirely inside this window.
          </Text>

          <View style={styles.hoursRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="time-outline" size={16} color={PRIMARY} />
              <Text style={styles.timeButtonText}>
                {formatDisplayTime(workingHoursStart)}
              </Text>
            </TouchableOpacity>

            <Text style={styles.hoursSeparator}>to</Text>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="time-outline" size={16} color={PRIMARY} />
              <Text style={styles.timeButtonText}>
                {formatDisplayTime(workingHoursEnd)}
              </Text>
            </TouchableOpacity>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={timeToDate(workingHoursStart)}
              mode="time"
              display="default"
              onChange={(_, selected) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (selected) setWorkingHoursStart(dateToTime(selected));
              }}
            />
          )}
          {showEndPicker && (
            <DateTimePicker
              value={timeToDate(workingHoursEnd)}
              mode="time"
              display="default"
              onChange={(_, selected) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (selected) setWorkingHoursEnd(dateToTime(selected));
              }}
            />
          )}
        </View>

        {/* Minimum Advance Booking */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Minimum Advance Booking Time</Text>
          <Text style={styles.cardSubtitle}>
            How far ahead an organizer must book you before the event starts.
          </Text>
          <View style={styles.chipsWrap}>
            {ADVANCE_OPTIONS.map((opt) => {
              const active = minimumAdvanceMinutes === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setMinimumAdvanceMinutes(opt.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Blocked Dates */}
        <View style={styles.card}>
          <View style={styles.blockHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Unavailable Dates</Text>
              <Text style={styles.cardSubtitle}>
                Tap dates on the calendar to block or unblock them.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowBlockCalendar((v) => !v)}>
              <Ionicons
                name={showBlockCalendar ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={PRIMARY}
              />
            </TouchableOpacity>
          </View>

          {showBlockCalendar && (
            <Calendar
              markedDates={blockedMarks}
              markingType="custom"
              minDate={toKey(new Date())}
              onDayPress={(day) => toggleBlockedDate(day.dateString)}
              theme={{
                todayTextColor: PRIMARY,
                arrowColor: PRIMARY,
                monthTextColor: '#000000',
                textMonthFontWeight: '800',
              }}
              style={styles.calendar}
            />
          )}

          {blockedDates.length > 0 && (
            <View style={styles.blockedList}>
              {blockedDates
                .sort()
                .map((d) => (
                  <View key={d} style={styles.blockedPill}>
                    <Text style={styles.blockedPillText}>
                      {new Date(d).toDateString()}
                    </Text>
                    <TouchableOpacity onPress={() => toggleBlockedDate(d)}>
                      <Ionicons name="close-circle" size={16} color="#D9534F" />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Availability</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VendorAvailabilitySettings;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PRIMARY_LIGHT },
  centerState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PRIMARY,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  scrollContent: { padding: 16, paddingBottom: 140 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  cardSubtitle: { fontSize: 12, color: '#8A8A8A', marginTop: 4, marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EAF1',
  },
  rowLabel: { fontSize: 13, color: '#333', fontWeight: '600' },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  timeButtonText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  hoursSeparator: { fontSize: 12, color: '#8A8A8A' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: '#F0DDEA',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  chipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  chipText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  chipTextActive: { color: '#FFFFFF' },
  blockHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  calendar: { borderRadius: 12, marginTop: 8 },
  blockedList: { marginTop: 12, gap: 8 },
  blockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FDEAEC',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  blockedPillText: { fontSize: 12, color: '#8A2E2E', fontWeight: '600' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: PRIMARY_LIGHT,
    borderTopWidth: 1,
    borderTopColor: '#F0DDEA',
  },
  saveButton: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});