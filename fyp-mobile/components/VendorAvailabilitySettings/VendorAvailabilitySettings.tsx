//fyp-mobile/components/VendorAvailabilitySettings/VendorAvailabilitySettings.tsx
import getVendorAvailability from '@/services/getVendorAvailability';
import patchVendorAvailability from '@/services/patchVendorAvailability';
import { getUserData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import {
  ActivityIndicator,
  Alert,
  Modal,
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

type TimeSlot = {
  start: string;
  end: string;
};

type DaySlotConfig = {
  day: string;
  enabled: boolean;
  slots: TimeSlot[];
  advanceNoticeOptionsMinutes?: number[];
};

const toKey = (d: string | Date) =>
  new Date(d).toISOString().split('T')[0];

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
const [resetting, setResetting] = useState(false);

const [loadError, setLoadError] = useState<string | null>(null);
const [hasAvailability, setHasAvailability] = useState(false);

const [vendorId, setVendorId] = useState<string | null>(null);

  const [workingDays, setWorkingDays] = useState(
    DAYS.map((d) => ({ day: d.code, enabled: true })),
  );
   const [workingHoursStart, setWorkingHoursStart] = useState('09:00');
const [workingHoursEnd, setWorkingHoursEnd] = useState('18:00');

const [daySlots, setDaySlots] = useState<DaySlotConfig[]>([]);

const [blockedDates, setBlockedDates] = useState<string[]>([]);
 const [minimumAdvanceMinutes, setMinimumAdvanceMinutes] = useState(0);

const [advanceNoticeOptionsMinutes, setAdvanceNoticeOptionsMinutes] =
  useState<number[]>([]);

  const [showStartPicker, setShowStartPicker] = useState(false);
const [showEndPicker, setShowEndPicker] = useState(false);
const [showBlockCalendar, setShowBlockCalendar] = useState(false);

// Multi-slot picker state
const [activeSlotDay, setActiveSlotDay] = useState<string | null>(null);
const [slotModalVisible, setSlotModalVisible] = useState(false);
const [slotPickerMode, setSlotPickerMode] = useState<'start' | 'end' | null>(
  null,
);
const [draftSlotStart, setDraftSlotStart] = useState<Date>(timeToDate('09:00'));
const [draftSlotEnd, setDraftSlotEnd] = useState<Date>(timeToDate('13:00'));

  const loadAvailability = async () => {
  setLoading(true);
  setLoadError(null);

  try {
    const user = await getUserData();

    if (!user?._id) {
      setVendorId(null);
      setHasAvailability(false);
      setLoadError('Could not identify vendor account.');
      return;
    }

    setVendorId(user._id);

    const data = await getVendorAvailability(user._id);

    const hasExistingAvailability =
  !!data &&
  (
    (Array.isArray(data.workingDays) &&
      data.workingDays.some((d) => d.enabled === false)) ||
    (data.workingHoursStart && data.workingHoursStart !== '09:00') ||
    (data.workingHoursEnd && data.workingHoursEnd !== '18:00') ||
    (Array.isArray(data.daySlots) && data.daySlots.length > 0) ||
    (Array.isArray(data.blockedDates) && data.blockedDates.length > 0) ||
    (typeof data.minimumAdvanceMinutes === 'number' &&
      data.minimumAdvanceMinutes !== 0) ||
    (Array.isArray(data.advanceNoticeOptionsMinutes) &&
      data.advanceNoticeOptionsMinutes.length > 0) ||
    (typeof data.maxConcurrentBookings === 'number' &&
      data.maxConcurrentBookings !== 1)
  );

    setHasAvailability(hasExistingAvailability);

    if (data?.workingDays?.length) {
      setWorkingDays(data.workingDays);
    }

    if (data?.workingHoursStart) {
      setWorkingHoursStart(data.workingHoursStart);
    }

    if (data?.workingHoursEnd) {
      setWorkingHoursEnd(data.workingHoursEnd);
    }

    if (Array.isArray(data?.daySlots)) {
      setDaySlots(
        data.daySlots.map((item: any) => ({
          day: item.day,
          enabled: item.enabled !== false,
          slots: Array.isArray(item.slots)
  ? item.slots.map((slot: any) => ({
      start: slot.start,
      end: slot.end,
    }))
  : [],
advanceNoticeOptionsMinutes: Array.isArray(
  item.advanceNoticeOptionsMinutes,
)
  ? item.advanceNoticeOptionsMinutes.filter(
      (value: number) =>
        Number.isFinite(value) && value >= 0,
    )
  : [],
        })),
      );
    }

    if (Array.isArray(data?.blockedDates)) {
      setBlockedDates(
        data.blockedDates.map((d: string) => toKey(d)),
      );
    }

    if (typeof data?.minimumAdvanceMinutes === 'number') {
  setMinimumAdvanceMinutes(data.minimumAdvanceMinutes);
}

if (Array.isArray(data?.advanceNoticeOptionsMinutes)) {
  setAdvanceNoticeOptionsMinutes(
    data.advanceNoticeOptionsMinutes.filter(
      (value: number) => Number.isFinite(value) && value >= 0,
    ),
  );
}
  } catch (error) {
    console.error('Error loading availability settings:', error);

    setHasAvailability(false);
    setLoadError(
      'Could not load availability settings. Please try again.',
    );
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadAvailability();
}, []);

  const toggleDay = (code: string) => {
    setWorkingDays((prev) =>
      prev.map((d) => (d.day === code ? { ...d, enabled: !d.enabled } : d)),
    );
  };

   const openTimePicker = (
  which: 'start' | 'end',
  currentValue: Date,
  onPicked: (date: Date) => void,
) => {
  if (Platform.OS === 'android') {
    DateTimePickerAndroid.open({
      value: currentValue,
      mode: 'time',
      display: 'default',
      onChange: (_, selected) => {
        if (selected) onPicked(selected);
      },
    });
  } else {
    setSlotPickerMode(which);
  }
};

 const addSlotForDay = (day: string) => {
  setActiveSlotDay(day);
  setDraftSlotStart(timeToDate('09:00'));
  setDraftSlotEnd(timeToDate('13:00'));
  setSlotPickerMode(null);
  setSlotModalVisible(true);
};

const confirmDraftSlot = () => {
  if (!activeSlotDay) return;

  if (draftSlotStart >= draftSlotEnd) {
    Alert.alert('Invalid slot', 'End time must be after start time.');
    return;
  }

  const newSlot: TimeSlot = {
    start: dateToTime(draftSlotStart),
    end: dateToTime(draftSlotEnd),
  };

  setDaySlots((prev) => {
    const existing = prev.find((item) => item.day === activeSlotDay);

    if (!existing) {
      return [
        ...prev,
        { day: activeSlotDay, enabled: true, slots: [newSlot] },
      ];
    }

    return prev.map((item) =>
      item.day === activeSlotDay
        ? { ...item, enabled: true, slots: [...item.slots, newSlot] }
        : item,
    );
  });

  setSlotModalVisible(false);
  setActiveSlotDay(null);
};

const cancelDraftSlot = () => {
  setSlotModalVisible(false);
  setActiveSlotDay(null);
  setSlotPickerMode(null);
};

const toggleDayAdvanceNotice = (day: string, value: number) => {
  setDaySlots((prev) => {
    const existing = prev.find((item) => item.day === day);

    if (!existing) {
      return [
        ...prev,
        {
          day,
          enabled: true,
          slots: [],
          advanceNoticeOptionsMinutes: [value],
        },
      ];
    }

    const current = existing.advanceNoticeOptionsMinutes ?? [];

    const updated = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value].sort((a, b) => a - b);

    return prev.map((item) =>
      item.day === day
        ? {
            ...item,
            advanceNoticeOptionsMinutes: updated,
          }
        : item,
    );
  });
};

const removeSlotForDay = (day: string, index: number) => {
  setDaySlots((prev) =>
    prev
      .map((config) =>
        config.day === day
          ? {
              ...config,
              slots: config.slots.filter((_, i) => i !== index),
            }
          : config,
      )
      .filter(
        (config) =>
          config.slots.length > 0 ||
          config.enabled === false ||
          (config.advanceNoticeOptionsMinutes?.length ?? 0) > 0,
      ),
  );
};


const toggleBlockedDate = (dateStr: string) => {
  const today = toKey(new Date());

  if (dateStr < today) {
    Alert.alert(
      'Invalid date',
      'Past dates cannot be added as unavailable dates.',
    );
    return;
  }

  setBlockedDates((prev) =>
    prev.includes(dateStr)
      ? prev.filter((d) => d !== dateStr)
      : [...prev, dateStr],
  );
};

 const handleSave = async () => {
  if (!vendorId) return;

  // Legacy working-hours validation remains for backward compatibility.
  if (workingHoursStart >= workingHoursEnd) {
    Alert.alert(
      'Invalid hours',
      'Working hours start must be before the end time.',
    );
    return;
  }

  // Validate every custom slot before saving.
  for (const config of daySlots) {
    for (const slot of config.slots) {
      if (slot.start >= slot.end) {
        Alert.alert(
          'Invalid slot',
          `${config.day}: slot end time must be after start time.`,
        );
        return;
      }
    }
  }

  setSaving(true);

  try {
    await patchVendorAvailability(vendorId, {
      // Existing fields stay untouched.
      workingDays,
      workingHoursStart,
      workingHoursEnd,

      // NEW: multiple working windows per day.
      daySlots,

            blockedDates,
      minimumAdvanceMinutes,
      advanceNoticeOptionsMinutes,
    });

    setHasAvailability(true);

    Alert.alert(
      'Saved',
      'Your availability settings have been updated.',
    );
  } catch (error) {
    console.error('Error saving availability settings:', error);
    Alert.alert(
      'Error',
      'Could not save availability settings. Please try again.',
    );
  } finally {
    setSaving(false);
  }
};

const handleResetAvailability = () => {
  if (!vendorId || saving || resetting) return;

  Alert.alert(
    'Reset Availability',
    'This will remove your custom slots, blocked dates, and advance-notice settings and restore the default availability. Continue?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          setResetting(true);

          const defaultWorkingDays = DAYS.map((d) => ({
            day: d.code,
            enabled: true,
          }));

          try {
            await patchVendorAvailability(vendorId, {
              workingDays: defaultWorkingDays,
              workingHoursStart: '09:00',
              workingHoursEnd: '18:00',
              daySlots: [],
              blockedDates: [],
              minimumAdvanceMinutes: 0,
              advanceNoticeOptionsMinutes: [],
              maxConcurrentBookings: 1,
            });

            setWorkingDays(defaultWorkingDays);
            setWorkingHoursStart('09:00');
            setWorkingHoursEnd('18:00');
            setDaySlots([]);
            setBlockedDates([]);
            setMinimumAdvanceMinutes(0);
            setAdvanceNoticeOptionsMinutes([]);
            setShowBlockCalendar(false);
            setHasAvailability(false);

            Alert.alert(
              'Reset Complete',
              'Your custom availability has been removed and default availability restored.',
            );
          } catch (error) {
            console.error(
              'Error resetting availability settings:',
              error,
            );

            Alert.alert(
              'Error',
              'Could not reset availability settings. Please try again.',
            );
          } finally {
            setResetting(false);
          }
        },
      },
    ],
  );
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
      <Text style={{ marginTop: 12, color: '#666' }}>
        Loading availability...
      </Text>
    </View>
  );
}

if (loadError) {
  return (
    <View style={styles.centerState}>
      <Text
        style={{
          color: '#B91C1C',
          textAlign: 'center',
          marginBottom: 16,
          paddingHorizontal: 24,
        }}
      >
        {loadError}
      </Text>

      <TouchableOpacity
        onPress={loadAvailability}
        style={{
          backgroundColor: PRIMARY,
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>
          Retry
        </Text>
      </TouchableOpacity>
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
  {!hasAvailability && (
    <View
      style={{
        backgroundColor: '#F8F5F8',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: PRIMARY,
          marginBottom: 4,
        }}
      >
        Default Availability
      </Text>

      <Text
        style={{
          fontSize: 13,
          color: '#666',
          lineHeight: 19,
        }}
      >
        No custom availability has been set yet. Update the settings below and
        save them to create your availability.
      </Text>
    </View>
  )}
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

        {/* Working Hours / Multiple Slots */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>Working Hours</Text>

  <Text style={styles.cardSubtitle}>
    Add one or more working windows for each day. For example,
    9 AM - 1 PM and 4 PM - 10 PM.
  </Text>

  {DAYS.map(({ code, label }) => {
    const config = daySlots.find((item) => item.day === code);
    const slots = config?.slots ?? [];

    return (
      <View key={code} style={styles.slotDayContainer}>
        <View style={styles.slotDayHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>{label}</Text>

            {slots.length === 0 && (
              <Text style={styles.slotHint}>
                Using default working hours
              </Text>
            )}
          </View>

          <Switch
            value={config ? config.enabled : true}
            onValueChange={() => {
              setDaySlots((prev) => {
                const existing = prev.find((item) => item.day === code);

                if (!existing) {
                  return [
                    ...prev,
                    {
                      day: code,
                      enabled: false,
                      slots: [],
                    },
                  ];
                }

                return prev.map((item) =>
                  item.day === code
                    ? { ...item, enabled: !item.enabled }
                    : item,
                );
              });
            }}
            trackColor={{ false: '#E3D3DD', true: ACCENT }}
            thumbColor="#FFFFFF"
          />
        </View>

        {config?.enabled !== false && (
          <>
            {slots.map((slot, index) => (
              <View key={`${code}-${index}`} style={styles.slotRow}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={PRIMARY}
                />

                <Text style={styles.slotText}>
                  {formatDisplayTime(slot.start)} -{' '}
                  {formatDisplayTime(slot.end)}
                </Text>

                <TouchableOpacity
                  onPress={() => removeSlotForDay(code, index)}
                  style={styles.removeSlotButton}
                >
                  <Ionicons
                    name="trash-outline"
                    size={17}
                    color="#D9534F"
                  />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
  style={styles.addSlotButton}
  onPress={() => addSlotForDay(code)}
>
  <Ionicons
    name="add-circle-outline"
    size={17}
    color={PRIMARY}
  />
  <Text style={styles.addSlotButtonText}>Add Slot</Text>
</TouchableOpacity>

<View style={{ marginTop: 10 }}>
  <Text style={styles.slotHint}>
    Advance notice for {label}
  </Text>

  <View style={[styles.chipsWrap, { marginTop: 7 }]}>
    {ADVANCE_OPTIONS.map((opt) => {
      const selected =
        config?.advanceNoticeOptionsMinutes ?? [];

      const active = selected.includes(opt.value);

      return (
        <TouchableOpacity
          key={`${code}-advance-${opt.value}`}
          style={[
            styles.chip,
            active && styles.chipActive,
          ]}
          onPress={() =>
            toggleDayAdvanceNotice(code, opt.value)
          }
        >
          <Text
            style={[
              styles.chipText,
              active && styles.chipTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>
          </>
        )}
      </View>
    );
  })}

  {/* Existing legacy global hours remain available */}
  <View style={styles.legacyHoursDivider}>
    <Text style={styles.legacyHoursTitle}>
      Default Working Hours
    </Text>

    <Text style={styles.slotHint}>
      Used for days where no custom slots are configured.
    </Text>
  </View>

  <View style={styles.hoursRow}>
       <TouchableOpacity
      style={styles.timeButton}
      onPress={() =>
        openTimePicker('start', timeToDate(workingHoursStart), (d) =>
          setWorkingHoursStart(dateToTime(d)),
        )
      }
    >
      <Ionicons name="time-outline" size={16} color={PRIMARY} />
      <Text style={styles.timeButtonText}>
        {formatDisplayTime(workingHoursStart)}
      </Text>
    </TouchableOpacity>

    <Text style={styles.hoursSeparator}>to</Text>

    <TouchableOpacity
      style={styles.timeButton}
      onPress={() =>
        openTimePicker('end', timeToDate(workingHoursEnd), (d) =>
          setWorkingHoursEnd(dateToTime(d)),
        )
      }
    >
      <Ionicons name="time-outline" size={16} color={PRIMARY} />
      <Text style={styles.timeButtonText}>
        {formatDisplayTime(workingHoursEnd)}
      </Text>
    </TouchableOpacity>
  </View>

  {Platform.OS === 'ios' && showStartPicker && (
    <DateTimePicker
      value={timeToDate(workingHoursStart)}
      mode="time"
      display="default"
      onChange={(_, selected) => {
        setShowStartPicker(false);

        if (selected) {
          setWorkingHoursStart(dateToTime(selected));
        }
      }}
    />
  )}

  {Platform.OS === 'ios' && showEndPicker && (
    <DateTimePicker
      value={timeToDate(workingHoursEnd)}
      mode="time"
      display="default"
      onChange={(_, selected) => {
        setShowEndPicker(false);

        if (selected) {
          setWorkingHoursEnd(dateToTime(selected));
        }
      }}
    />
  )}
</View>

        {/* Minimum Advance Booking */}
<View style={styles.card}>
  <Text style={styles.cardTitle}>Advance Booking Options</Text>

  <Text style={styles.cardSubtitle}>
    Select one or more advance-notice options. These are used when a day
    does not have its own advance-notice settings.
  </Text>

  <View style={styles.chipsWrap}>
    {ADVANCE_OPTIONS.map((opt) => {
      const active =
        advanceNoticeOptionsMinutes.length > 0
          ? advanceNoticeOptionsMinutes.includes(opt.value)
          : minimumAdvanceMinutes === opt.value;

      return (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, active && styles.chipActive]}
          onPress={() => {
            setAdvanceNoticeOptionsMinutes((prev) => {
              const base =
                prev.length > 0 ? prev : [minimumAdvanceMinutes];

              const updated = base.includes(opt.value)
                ? base.filter((value) => value !== opt.value)
                : [...base, opt.value].sort((a, b) => a - b);

              return updated;
            });
          }}
        >
          <Text
            style={[
              styles.chipText,
              active && styles.chipTextActive,
            ]}
          >
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

            {/* Add Time Slot Modal - clear, non-chained UX */}
      <Modal
        visible={slotModalVisible}
        transparent
        animationType="fade"
        onRequestClose={cancelDraftSlot}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Time Slot</Text>
            <Text style={styles.modalSubtitle}>
              {DAYS.find((d) => d.code === activeSlotDay)?.label}
            </Text>

            <View style={styles.modalTimeRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalFieldLabel}>Start</Text>
                   <TouchableOpacity
                  style={styles.modalTimeButton}
                  onPress={() =>
                    openTimePicker('start', draftSlotStart, setDraftSlotStart)
                  }
                >
                  <Ionicons name="time-outline" size={16} color={PRIMARY} />
                  <Text style={styles.modalTimeButtonText}>
                    {formatDisplayTime(dateToTime(draftSlotStart))}
                  </Text>
                </TouchableOpacity>
              </View>

              <Ionicons
                name="arrow-forward"
                size={16}
                color="#B0B0B0"
                style={{ marginTop: 22 }}
              />

              <View style={{ flex: 1 }}>
                <Text style={styles.modalFieldLabel}>End</Text>
                   <TouchableOpacity
                  style={styles.modalTimeButton}
                  onPress={() =>
                    openTimePicker('end', draftSlotEnd, setDraftSlotEnd)
                  }
                >
                  <Ionicons name="time-outline" size={16} color={PRIMARY} />
                  <Text style={styles.modalTimeButtonText}>
                    {formatDisplayTime(dateToTime(draftSlotEnd))}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

                        {Platform.OS === 'ios' && slotPickerMode === 'start' && (
              <DateTimePicker
                value={draftSlotStart}
                mode="time"
                display="default"
                onChange={(_, selected) => {
                  setSlotPickerMode(null);
                  if (selected) setDraftSlotStart(selected);
                }}
              />
            )}

            {Platform.OS === 'ios' && slotPickerMode === 'end' && (
              <DateTimePicker
                value={draftSlotEnd}
                mode="time"
                display="default"
                onChange={(_, selected) => {
                  setSlotPickerMode(null);
                  if (selected) setDraftSlotEnd(selected);
                }}
              />
            )}

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={cancelDraftSlot}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={confirmDraftSlot}
              >
                <Text style={styles.modalConfirmButtonText}>Add Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

     <View style={styles.footer}>
  <TouchableOpacity
    style={[
      styles.resetButton,
      (saving || resetting) && { opacity: 0.6 },
    ]}
    onPress={handleResetAvailability}
    disabled={saving || resetting}
  >
    {resetting ? (
      <ActivityIndicator size="small" color="#B91C1C" />
    ) : (
      <>
        <Ionicons
          name="refresh-outline"
          size={17}
          color="#B91C1C"
        />
        <Text style={styles.resetButtonText}>
          Reset Availability
        </Text>
      </>
    )}
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.saveButton,
      (saving || resetting) && { opacity: 0.7 },
    ]}
    onPress={handleSave}
    disabled={saving || resetting}
  >
    {saving ? (
      <ActivityIndicator size="small" color="#FFFFFF" />
    ) : (
      <Text style={styles.saveButtonText}>
        Save Availability
      </Text>
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

  slotDayContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EAF1',
  },

  slotDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  slotHint: {
    fontSize: 10,
    color: '#999999',
    marginTop: 2,
  },

  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginTop: 7,
    gap: 7,
  },

  slotText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },

  removeSlotButton: {
    padding: 3,
  },

  addSlotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 8,
    paddingVertical: 5,
  },

  addSlotButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: PRIMARY,
  },

  legacyHoursDivider: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0DDEA',
  },

  legacyHoursTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#333333',
  },

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
  resetButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  borderWidth: 1.5,
  borderColor: '#B91C1C',
  borderRadius: 14,
  paddingVertical: 11,
  marginBottom: 9,
  backgroundColor: '#FFFFFF',
},

resetButtonText: {
  color: '#B91C1C',
  fontWeight: '800',
  fontSize: 13,
},
  saveButton: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  modalSubtitle: { fontSize: 12, color: '#8A8A8A', marginTop: 2, marginBottom: 16 },
  modalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8A',
    marginBottom: 6,
  },
  modalTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  modalTimeButtonText: { fontSize: 13, fontWeight: '700', color: PRIMARY },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E3D3DD',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButtonText: { fontSize: 13, fontWeight: '700', color: '#666' },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmButtonText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
});