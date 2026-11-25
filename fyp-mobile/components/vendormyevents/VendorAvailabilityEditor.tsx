import BookingLimitStepper from '@/components/booking/BookingLimitStepper';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import patchVendorAvailability from '@/services/patchVendorAvailability';
import HourPromptModal from './HourPromptModal';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';
const ACCENT = '#B84B9A';
const ACCENT_LIGHT = '#F0DDEA';

const DAYS = [
  { code: 'MON', label: 'Monday' },
  { code: 'TUE', label: 'Tuesday' },
  { code: 'WED', label: 'Wednesday' },
  { code: 'THU', label: 'Thursday' },
  { code: 'FRI', label: 'Friday' },
  { code: 'SAT', label: 'Saturday' },
  { code: 'SUN', label: 'Sunday' },
];

type TimeSlotConfig = { start: string; end: string };

export type DaySlotConfig = {
  day: string;
  enabled: boolean;
  slots: TimeSlotConfig[];
  // How many minutes before the event this day can be booked.
  // Empty = fall back to the vendor-wide notice options.
  advanceNoticeOptionsMinutes?: number[];
};

type BlockedDateReason = { date: string; reason: string };

type AvailabilitySettings = {
  maxConcurrentBookings?: number;
  minimumWorkingWindowMinutes?: number;
  minimumAdvanceMinutes?: number;
  workingDays?: { day: string; enabled: boolean }[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  daySlots?: DaySlotConfig[];
  blockedDates?: string[];
  blockedDateReasons?: BlockedDateReason[];
  advanceNoticeOptionsMinutes?: number[];
};

const parseTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return date;
};

const toHHMM = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const minutesBetween = (start: string, end: string) => {
  const s = parseTime(start);
  const e = parseTime(end);
  return Math.max(0, (e.getTime() - s.getTime()) / 60000);
};

const formatDisplayTime = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const formatNoticeLabel = (minutes: number) => {
  if (minutes % 1440 === 0 && minutes >= 1440) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? 'day' : 'days'} before`;
  }
  const hours = minutes / 60;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} ${hours === 1 ? 'hour' : 'hours'} before`;
};

const toKey = (date: string | Date) => {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

const formatBlockedDate = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

type Props = {
  visible: boolean;
  vendorId: string | null;
  availability: AvailabilitySettings | null;
  selectedDate: string;
  bookingDates: string[];
  onClose: () => void;
  onSaved: (data: {
    maxConcurrentBookings: number;
    daySlots: DaySlotConfig[];
    blockedDates: string[];
    blockedDateReasons: BlockedDateReason[];
  }) => void;
};

const VendorAvailabilityEditor = ({
  visible,
  vendorId,
  availability,
  selectedDate,
  bookingDates,
  onClose,
  onSaved,
}: Props) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'weekly' | 'blocked'>('weekly');
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [sameHours, setSameHours] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const initialCalendarDate = selectedDate >= today ? selectedDate : today;
  const [calendarMonth, setCalendarMonth] = useState(initialCalendarDate.slice(0, 7));
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [rangeField, setRangeField] = useState<'start' | 'end'>('start');
  const [selectingRange, setSelectingRange] = useState(false);
  const [copyHours, setCopyHours] = useState(true);
  const [copyNotice, setCopyNotice] = useState(true);
  const [pickedStart, setPickedStart] = useState(false);
  const [pickedEnd, setPickedEnd] = useState(false);
  const savedDraft = useRef('');
  const [maxConcurrentBookings, setMaxConcurrentBookings] = useState(1);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorDaySlots, setEditorDaySlots] = useState<DaySlotConfig[]>([]);
  const [blockedDateReasons, setBlockedDateReasons] = useState<BlockedDateReason[]>([]);
  const [newBlockReason, setNewBlockReason] = useState('');
  const [editorBlockedDates, setEditorBlockedDates] = useState<string[]>([]);

  const [activeDayForSlot, setActiveDayForSlot] = useState<string | null>(null);
  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [slotPickerMode, setSlotPickerMode] = useState<'start' | 'end' | null>(null);
  const [draftStart, setDraftStart] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [draftEnd, setDraftEnd] = useState<Date>(() => {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    return d;
  });

  const [copyDaySource, setCopyDaySource] = useState<string | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<string[]>([]);

  // Per-day booking-notice prompt
  const [noticePromptDay, setNoticePromptDay] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    const source = availability?.daySlots;

    const merged: DaySlotConfig[] = DAYS.map((day) => {
      const existing = source?.find((item) => item.day === day.code);
      if (existing) {
        return {
          day: day.code,
          enabled: existing.enabled !== false,
          slots: Array.isArray(existing.slots)
            ? existing.slots.map((s) => ({ start: s.start, end: s.end }))
            : [],
          advanceNoticeOptionsMinutes: Array.isArray(existing.advanceNoticeOptionsMinutes)
            ? existing.advanceNoticeOptionsMinutes.filter((minutes) => minutes >= 1440 && minutes % 1440 === 0)
            : [],
        };
      }

      const oldWorkingDay = availability?.workingDays?.find((item) => item.day === day.code);
      const oldStart = availability?.workingHoursStart || '09:00';
      const oldEnd = availability?.workingHoursEnd || '18:00';

      return {
        day: day.code,
        enabled: oldWorkingDay?.enabled ?? true,
        slots: oldWorkingDay?.enabled === false ? [] : [{ start: oldStart, end: oldEnd }],
        advanceNoticeOptionsMinutes: [],
      };
    });

    const limit = availability?.maxConcurrentBookings ?? 1;
    const validLimit = Number.isSafeInteger(limit) && limit >= 1 ? limit : 1;
    const blockedDates = (availability?.blockedDates || []).map(toKey);
    const reasons = availability?.blockedDateReasons ?? [];
    setBlockedDateReasons(reasons);
    setNewBlockReason('');
    savedDraft.current = JSON.stringify([validLimit, merged, blockedDates, reasons]);
    setMaxConcurrentBookings(validLimit);
    setEditorDaySlots(merged);
    setEditorBlockedDates(blockedDates);
    setTab('weekly');
    setExpandedDay(null);
    setSameHours(false);
    setCalendarMonth((selectedDate >= today ? selectedDate : today).slice(0, 7));
    setRangeStart(null);
    setRangeEnd(null);
    setRangeField('start');
    setSelectingRange(false);
  }, [visible, availability]);

  const toggleEditorDay = (dayCode: string) => {
    setEditorDaySlots((prev) =>
      prev.map(day => {
        if (day.day !== dayCode) return day;
        const source = sameHours && !day.enabled ? prev.find(item => item.enabled) : undefined;
        return { ...day, enabled: !day.enabled, ...(source ? { slots: source.slots.map(slot => ({ ...slot })) } : {}) };
      }),
    );
  };

  const startAddingSlot = (dayCode: string) => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date();
    end.setHours(17, 0, 0, 0);

    setActiveDayForSlot(dayCode);
    setEditingSlotIndex(null);
    setPickedStart(false);
    setPickedEnd(false);
    setDraftStart(start);
    setDraftEnd(end);
    setSlotPickerMode('start');
  };

  const startEditingSlot = (dayCode: string, index: number) => {
    const day = editorDaySlots.find((item) => item.day === dayCode);
    const slot = day?.slots?.[index];
    if (!slot) return;

    setActiveDayForSlot(dayCode);
    setEditingSlotIndex(index);
    setPickedStart(true);
    setPickedEnd(true);
    setDraftStart(parseTime(slot.start));
    setDraftEnd(parseTime(slot.end));
    setSlotPickerMode('start');
  };

  const deleteSlot = (dayCode: string, index: number) => {
    const slot = editorDaySlots.find(day => day.day === dayCode)?.slots[index];
    if (!slot) return;
    Alert.alert(`Delete ${formatDisplayTime(slot.start)} – ${formatDisplayTime(slot.end)}?`,
      'Customers will not be able to book this time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setEditorDaySlots((prev) =>
            prev.map((day) =>
              (day.day === dayCode || sameHours && day.enabled)
                ? { ...day, slots: day.slots.filter((_, i) => i !== index) }
                : day,
            ),
          );
        },
      },
    ]);
  };

  const startCopyingDay = (dayCode: string) => {
    setCopyDaySource(dayCode);
    setCopyTargetDays([]);
    setCopyHours(true);
    setCopyNotice(true);
  };

  const toggleCopyTargetDay = (dayCode: string) => {
    setCopyTargetDays((prev) =>
      prev.includes(dayCode) ? prev.filter((d) => d !== dayCode) : [...prev, dayCode],
    );
  };

  const applyCopyToDays = () => {
    if (!copyDaySource || copyTargetDays.length === 0 || (!copyHours && !copyNotice)) {
      setCopyDaySource(null);
      return;
    }

    const sourceDay = editorDaySlots.find((day) => day.day === copyDaySource);
    if (!sourceDay) {
      setCopyDaySource(null);
      return;
    }

    const clonedSlots = sourceDay.slots.map((slot) => ({ ...slot }));
    if (copyHours) setSameHours(false);

    setEditorDaySlots((prev) =>
      prev.map((day) =>
        copyTargetDays.includes(day.day)
          ? {
              ...day,
              ...(copyHours ? { enabled: sourceDay.enabled, slots: clonedSlots } : {}),
              ...(copyNotice ? { advanceNoticeOptionsMinutes: [...(sourceDay.advanceNoticeOptionsMinutes || [])] } : {}),
            }
          : day,
      ),
    );

    const copiedCount = copyTargetDays.length;
    setCopyDaySource(null);
    setCopyTargetDays([]);

    Alert.alert('Copied', `Schedule settings copied to ${copiedCount} ${copiedCount === 1 ? 'day' : 'days'}.`);
  };

  const confirmSlot = () => {
    if (!activeDayForSlot || !pickedStart || !pickedEnd) return;

    if (draftEnd <= draftStart) {
      Alert.alert('Invalid slot', 'End time must be after start time.');
      return;
    }

    const minimumWindow = availability?.minimumWorkingWindowMinutes ?? 60;
    if (minutesBetween(toHHMM(draftStart), toHHMM(draftEnd)) < minimumWindow) {
      Alert.alert('Invalid working slot', minimumWindow === 60 ? 'Working slot must be at least 1 hour.' : 'Working slot must be at least 1 minute.');
      return;
    }
    const newSlot: TimeSlotConfig = { start: toHHMM(draftStart), end: toHHMM(draftEnd) };

    const currentDay = editorDaySlots.find((day) => day.day === activeDayForSlot);
    const existingSlots = currentDay?.slots || [];
    const editingIndex = editingSlotIndex;

    const newStart = parseTime(newSlot.start).getTime();
    const newEnd = parseTime(newSlot.end).getTime();

    const overlaps = existingSlots.some((slot, index) => {
      if (editingIndex !== null && index === editingIndex) return false;
      const existingStart = parseTime(slot.start).getTime();
      const existingEnd = parseTime(slot.end).getTime();
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (overlaps) {
      Alert.alert('Overlapping slot', 'This time overlaps another working slot for the same day.');
      return;
    }

    setEditorDaySlots((prev) =>
      prev.map((day) => {
        if (day.day !== activeDayForSlot && !(sameHours && day.enabled)) return day;
        const slots = [...day.slots];
        if (editingIndex !== null) {
          slots[editingIndex] = newSlot;
        } else {
          slots.push(newSlot);
        }
        slots.sort((a, b) => parseTime(a.start).getTime() - parseTime(b.start).getTime());
        return { ...day, enabled: true, slots };
      }),
    );

    setActiveDayForSlot(null);
    setEditingSlotIndex(null);
    setSlotPickerMode(null);
  };

  const addBlockedDates = (dates: string[]) => {
    const added = dates.filter(date => !editorBlockedDates.includes(date));
    const reason = newBlockReason.trim();
    setEditorBlockedDates(previous => [...new Set([...previous, ...added])].sort());
    if (reason) {
      setBlockedDateReasons(previous => [...previous, ...added.map(date => ({ date, reason }))]);
    }
    setNewBlockReason('');
  };

  const removeBlockedDate = (date: string) => {
    setEditorBlockedDates(previous => previous.filter(item => item !== date));
    setBlockedDateReasons(previous => previous.filter(item => item.date !== date));
  };

  const changeRangeMode = (enabled: boolean) => {
    setSelectingRange(enabled);
    setRangeStart(null);
    setRangeEnd(null);
    setRangeField('start');
  };

  const applyDateRange = () => {
    if (!rangeStart || !rangeEnd || rangeStart < today || rangeEnd < rangeStart) return;
    Alert.alert('Block date range?', `${formatBlockedDate(rangeStart)} – ${formatBlockedDate(rangeEnd)}. Existing bookings keep their schedules.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block dates', onPress: () => {
        const dates: string[] = [];
        const cursor = new Date(`${rangeStart}T00:00:00Z`);
        while (toKey(cursor) <= rangeEnd) {
          dates.push(toKey(cursor));
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        addBlockedDates(dates);
        changeRangeMode(false);
      } },
    ]);
  };

  const toggleBlockedDate = (dateKey: string) => {
    if (dateKey < today) return;
    if (selectingRange) {
      if (rangeField === 'start') {
        setRangeStart(dateKey);
        if (rangeEnd && rangeEnd < dateKey) setRangeEnd(null);
        setRangeField('end');
      } else {
        setRangeEnd(dateKey);
      }
      return;
    }
    if (editorBlockedDates.includes(dateKey)) removeBlockedDate(dateKey);
    else if (bookingDates.includes(dateKey)) {
      Alert.alert('This date has bookings', 'Blocking this date prevents new bookings. Existing bookings keep their schedules.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block date', onPress: () => addBlockedDates([dateKey]) },
      ]);
    } else addBlockedDates([dateKey]);
  };

  const addNoticeOption = (dayCode: string, days: number) => {
    const minutes = days * 1440;
    setEditorDaySlots((prev) =>
      prev.map((item) =>
        item.day === dayCode
          ? {
              ...item,
              advanceNoticeOptionsMinutes: [minutes],
            }
          : item,
      ),
    );
    setNoticePromptDay(null);
  };

  const removeNoticeOption = (dayCode: string) => {
    setEditorDaySlots((prev) =>
      prev.map((item) =>
        item.day === dayCode
          ? {
              ...item,
              advanceNoticeOptionsMinutes: [],
            }
          : item,
      ),
    );
  };

  const handleSaveAvailability = async () => {
    if (!vendorId) {
      Alert.alert('Error', 'Vendor account could not be identified.');
      return;
    }

    const invalidDay = editorDaySlots.find(
      (day) => day.enabled && day.slots.some((slot) => minutesBetween(slot.start, slot.end) < (availability?.minimumWorkingWindowMinutes ?? 60)),
    );

    if (invalidDay) {
      Alert.alert(
        'Invalid time slot',
        (availability?.minimumWorkingWindowMinutes ?? 60) === 60 ? 'Working slot must be at least 1 hour.' : 'Working slot must be at least 1 minute.',
      );
      return;
    }

    setEditorSaving(true);

    try {
      const cleanDaySlots = editorDaySlots.map((day) => ({
        day: day.day,
        enabled: day.enabled,
        slots: [...day.slots].sort(
          (a, b) => parseTime(a.start).getTime() - parseTime(b.start).getTime(),
        ),
        advanceNoticeOptionsMinutes: Array.isArray(day.advanceNoticeOptionsMinutes)
          ? day.advanceNoticeOptionsMinutes.filter((minutes) => minutes >= 1440 && minutes % 1440 === 0)
          : [],
      }));

      const settings = { daySlots: cleanDaySlots, blockedDates: editorBlockedDates, blockedDateReasons, maxConcurrentBookings };
      await patchVendorAvailability(vendorId, settings);
      onSaved(settings);

      Alert.alert('Availability Saved', 'Your availability settings have been saved.');
    } catch (error) {
      console.error('Error saving availability:', error);
      Alert.alert('Error', 'Unable to save availability. Please try again.');
    } finally {
      setEditorSaving(false);
    }
  };

  const dirty = !!savedDraft.current && savedDraft.current !== JSON.stringify([maxConcurrentBookings, editorDaySlots, editorBlockedDates, blockedDateReasons]);
  const requestClose = () => {
    if (editorSaving) return;
    if (!dirty) { onClose(); return; }
    Alert.alert('Discard changes?', 'Your availability changes have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  };
  const workingSource = editorDaySlots.find(day => day.enabled);
  const toggleSameHours = (enabled: boolean) => {
    const apply = () => {
      setSameHours(enabled);
      if (!enabled || !workingSource) return;
      setExpandedDay(workingSource.day);
      setEditorDaySlots(days => days.map(day => day.enabled ? { ...day, slots: workingSource.slots.map(slot => ({ ...slot })) } : day));
    };
    if (enabled && workingSource && editorDaySlots.some(day => day.enabled && JSON.stringify(day.slots) !== JSON.stringify(workingSource.slots))) {
      Alert.alert('Use the same hours?', 'This copies the first working day’s hours to your other open days.', [
        { text: 'Cancel', style: 'cancel' }, { text: 'Apply', onPress: apply },
      ]);
    } else apply();
  };
  const draftStartText = toHHMM(draftStart);
  const draftEndText = toHHMM(draftEnd);
  const duration = minutesBetween(draftStartText, draftEndText);
  const overlap = editorDaySlots.find(day => day.day === activeDayForSlot)?.slots.find((slot, index) =>
    index !== editingSlotIndex && draftStartText < slot.end && draftEndText > slot.start);
  const minimumWindow = availability?.minimumWorkingWindowMinutes ?? 60;
  const slotError = pickedStart && pickedEnd
    ? draftEndText <= draftStartText ? 'End time must be after start time.'
      : duration < minimumWindow ? `Working time must be at least ${minimumWindow} min.`
        : overlap ? `This overlaps ${formatDisplayTime(overlap.start)} – ${formatDisplayTime(overlap.end)}.` : ''
    : '';
  const chooseTime = (field: 'start' | 'end', value: Date) => {
    if (field === 'start') { setDraftStart(value); setPickedStart(true); }
    else { setDraftEnd(value); setPickedEnd(true); }
  };
  const closeSlot = () => {
    setSlotPickerMode(null);
    setActiveDayForSlot(null);
    setEditingSlotIndex(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={activeDayForSlot ? closeSlot : requestClose}
    >
      <View style={styles.editorContainer}>
                <View style={styles.editorHeader}>
          <View style={styles.editorHeaderTitleWrap} pointerEvents="none">
            <Text style={styles.editorTitle}>Manage Availability</Text>
            <Text style={styles.editorSubtitle}>Set your working days & hours</Text>
          </View>

          <View style={styles.editorHeaderRow}>
            <TouchableOpacity style={styles.editorCloseButton} disabled={editorSaving} onPress={requestClose}>
              <Ionicons name="close" size={22} color={PRIMARY} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.editorHeaderIcon} accessibilityRole="button" accessibilityLabel="About availability"
              onPress={() => Alert.alert('Manage Availability', 'Set working hours, booking notice and dates you are unavailable.')}>
              <Ionicons name="information-circle-outline" size={21} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.screenTabs}>
          {(['weekly', 'blocked'] as const).map(value => <TouchableOpacity key={value}
            style={[styles.copyDayChip, styles.screenTab, tab === value && styles.copyDayChipActive]}
            accessibilityRole="tab" accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}>
            <Text style={[styles.copyDayChipText, styles.screenTabText, tab === value && styles.copyDayChipTextActive]}>
              {value === 'weekly' ? 'Weekly hours' : `Block dates${editorBlockedDates.length ? ` (${editorBlockedDates.length})` : ''}`}
            </Text>
          </TouchableOpacity>)}
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editorContent}>
          {tab === 'weekly' ? <>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <BookingLimitStepper value={maxConcurrentBookings} onChange={setMaxConcurrentBookings} disabled={editorSaving} />
          </View>

          <View style={styles.weeklySwitch}>
            <Text style={styles.dayName}>Same hours every day</Text>
            <Switch value={sameHours} onValueChange={toggleSameHours} />
          </View>
          <View style={styles.copyDayPanel}>
            <Text style={styles.copyDayPanelTitle}>Copy schedule from</Text>
            <View style={styles.copyDayChipsRow}>
              {DAYS.map(day => <TouchableOpacity key={day.code} accessibilityRole="button"
                accessibilityState={{ selected: copyDaySource === day.code }}
                style={[styles.copyDayChip, copyDaySource === day.code && styles.copyDayChipActive]}
                onPress={() => startCopyingDay(day.code)}>
                <Text style={[styles.copyDayChipText, copyDaySource === day.code && styles.copyDayChipTextActive]}>{day.label.slice(0, 3)}</Text>
              </TouchableOpacity>)}
            </View>
          </View>
                    {copyDaySource && (
                      <View style={styles.copyDayPanel}>
                        <Text style={styles.copyDayPanelTitle}>Copy {DAYS.find(day => day.code === copyDaySource)?.label}’s schedule to</Text>
                        <View style={styles.weeklySwitch}><Text>Hours</Text><Switch value={copyHours} onValueChange={setCopyHours} /></View>
                        <View style={styles.weeklySwitch}><Text>Notice</Text><Switch value={copyNotice} onValueChange={setCopyNotice} /></View>
                        <TouchableOpacity style={styles.scheduleOption} onPress={() => setCopyTargetDays(
                          copyTargetDays.length === DAYS.length - 1 ? [] : DAYS.filter(other => other.code !== copyDaySource).map(other => other.code)
                        )}><Text style={styles.copyDayChipText}>All days</Text></TouchableOpacity>
                        <View style={styles.copyDayChipsRow}>
                          {DAYS.filter((other) => other.code !== copyDaySource).map((other) => {
                            const selected = copyTargetDays.includes(other.code);
                            return (
                              <TouchableOpacity
                                key={other.code}
                                style={[styles.copyDayChip, selected && styles.copyDayChipActive]}
                                onPress={() => toggleCopyTargetDay(other.code)}
                              >
                                <Text
                                  style={[styles.copyDayChipText, selected && styles.copyDayChipTextActive]}
                                >
                                  {other.label.slice(0, 3)}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                        <View style={styles.copyDayActionsRow}>
                          <TouchableOpacity
                            style={styles.copyDayCancelButton}
                            onPress={() => {
                              setCopyDaySource(null);
                              setCopyTargetDays([]);
                            }}
                          >
                            <Text style={styles.copyDayCancelText}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.copyDayApplyButton,
                              copyTargetDays.length === 0 && styles.copyDayApplyButtonDisabled,
                            ]}
                            disabled={copyTargetDays.length === 0 || (!copyHours && !copyNotice)}
                            onPress={applyCopyToDays}
                          >
                            <Text style={styles.copyDayApplyText}>Apply</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

          <Text style={styles.editorSectionTitle}>Working Days</Text>

          {DAYS.map((day) => {
            const config = editorDaySlots.find((item) => item.day === day.code) || {
              day: day.code,
              enabled: true,
              slots: [],
              advanceNoticeOptionsMinutes: [],
            };

            const notices = config.advanceNoticeOptionsMinutes || [];
            const notice = notices.length ? Math.min(...notices) : null;
            const globalNotices = (availability?.advanceNoticeOptionsMinutes || [])
              .filter(minutes => minutes >= 1440 && minutes % 1440 === 0);
            const defaultNotice = globalNotices.length ? Math.min(...globalNotices) : Math.max(1440, availability?.minimumAdvanceMinutes ?? 1440);

            return (
              <View
                key={day.code}
                style={[styles.dayEditorCard, config.enabled && styles.dayEditorCardActive]}
              >
                <View style={styles.dayEditorHeader}>
                  <TouchableOpacity style={[styles.dayTitleRow, { flex: 1 }]} accessibilityRole="button"
                    accessibilityState={{ expanded: expandedDay === day.code }}
                    onPress={() => setExpandedDay(expandedDay === day.code ? null : day.code)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayName}>{day.label}</Text>
                      <Text style={styles.dayStatus}>{config.enabled ? config.slots.map(slot =>
                        `${formatDisplayTime(slot.start)} – ${formatDisplayTime(slot.end)}`).join(' · ') || 'No slots' : 'Closed'}</Text>
                      <Text style={styles.dayStatus}>{notice === null ? `Notice: default (${formatNoticeLabel(defaultNotice)})` : `Notice: ${formatNoticeLabel(notice)}`}</Text>
                    </View>
                    <Ionicons name={expandedDay === day.code ? 'chevron-up' : 'chevron-down'} size={17} color={PRIMARY} />
                  </TouchableOpacity>

                  <Switch
                    value={config.enabled}
                    onValueChange={() => toggleEditorDay(day.code)}
                    trackColor={{ false: '#D8D8D8', true: ACCENT }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {config.enabled && expandedDay === day.code && (
                  <View style={styles.daySlotsEditor}>
                    {config.slots.length === 0 ? (
                      <View style={styles.noEditorSlots}>
                        <Ionicons name="time-outline" size={18} color="#AAAAAA" />
                        <Text style={styles.noEditorSlotsText}>No working hours added</Text>
                      </View>
                    ) : (
                      config.slots.map((slot, index) => (
                        <View key={`${day.code}-${index}`} style={styles.editorSlotRow}>
                          <View style={styles.editorSlotTimeBox}>
                            <Ionicons name="time-outline" size={15} color={PRIMARY} />
                            <Text style={styles.editorSlotTime}>
                              {formatDisplayTime(slot.start)} - {formatDisplayTime(slot.end)}
                            </Text>
                          </View>
                          <View style={styles.editorSlotActions}>
                            <TouchableOpacity
                              style={styles.slotActionButton}
                              onPress={() => startEditingSlot(day.code, index)}
                            >
                              <Ionicons name="create-outline" size={16} color={PRIMARY} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.slotActionButton, styles.deleteSlotButton]}
                              onPress={() => deleteSlot(day.code, index)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#C0392B" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}

                    <TouchableOpacity style={styles.addSlotButton} onPress={() => startAddingSlot(day.code)}>
                      <Ionicons name="add-circle-outline" size={18} color={PRIMARY} />
                      <Text style={styles.addSlotButtonText}>Add Time Slot</Text>
                    </TouchableOpacity>

                    {/* Per-day booking notice (replaces old max event length) */}
                    <View style={styles.noticeSection}>
                      <View style={styles.noticeLabelWrap}>
                        <Ionicons name="notifications-outline" size={16} color={PRIMARY} />
                        <Text style={styles.noticeLabel}>Booking notice for this day</Text>
                      </View>
                      <Text style={styles.noticeHelp}>
                        Notice is measured from the service start time.
                      </Text>

                      <TouchableOpacity style={notice === null ? styles.addDurationButton : styles.durationChip}
                        accessibilityRole="button" onPress={() => setNoticePromptDay(day.code)}>
                        <Ionicons name={notice === null ? 'add-circle-outline' : 'create-outline'} size={18} color={PRIMARY} />
                        <Text style={styles.addDurationButtonText}>{notice === null ? 'Add notice period' : formatNoticeLabel(notice)}</Text>
                      </TouchableOpacity>
                      {notice !== null && <TouchableOpacity style={styles.scheduleOption} accessibilityRole="button"
                        onPress={() => Alert.alert('Reset booking notice?', 'This day will use your default notice.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Reset to default', onPress: () => removeNoticeOption(day.code) },
                        ])}>
                        <Text style={styles.copyDayChipText}>Reset to default</Text>
                      </TouchableOpacity>}
                    </View>

                  </View>
                )}
              </View>
            );
          })}

          </> : <>
          <View style={styles.blockCalendarCard}>
            <Text style={styles.editorSectionTitle}>Block specific dates</Text>
            <Text style={styles.editorSectionDescription}>
              Customers cannot book blocked dates. Confirmed bookings keep their schedules.
            </Text>
            <Text style={styles.reasonLabel}>Reason (optional)</Text>
            <TextInput style={styles.reasonInput} value={newBlockReason} onChangeText={setNewBlockReason}
              maxLength={160} placeholder="Add a reason for the dates you block" placeholderTextColor="#746773"
              accessibilityLabel="Optional reason visible to customers" />
            <Text style={styles.dayStatus}>Customers can see the reason you enter.</Text>
            <Calendar
              initialDate={initialCalendarDate}
              minDate={today}
              disableAllTouchEventsForDisabledDays
              disableArrowLeft={calendarMonth <= today.slice(0, 7)}
              onMonthChange={month => setCalendarMonth(month.dateString.slice(0, 7))}
              firstDay={1}
              markingType="custom"
              markedDates={[...new Set([...bookingDates, ...editorBlockedDates, ...([rangeStart, rangeEnd].filter((date): date is string => date !== null))])].reduce((result: Record<string, any>, date) => {
                if (date < today) return result;
                const endpoint = date === rangeStart || date === rangeEnd;
                result[date] = {
                  marked: bookingDates.includes(date),
                  dotColor: PRIMARY,
                  selected: endpoint,
                  selectedColor: PRIMARY,
                  ...(!endpoint && editorBlockedDates.includes(date) ? { customStyles: {
                    container: { backgroundColor: '#FBE5DF', borderRadius: 8 },
                    text: { color: '#9F3125', fontWeight: '800', textDecorationLine: 'line-through' },
                  } } : {}),
                };
                return result;
              }, {})}
              onDayPress={(day) => toggleBlockedDate(day.dateString)}
              theme={{
                backgroundColor: '#FFFFFF',
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#9B9B9B',
                todayTextColor: PRIMARY,
                todayBackgroundColor: PRIMARY_LIGHT,
                dayTextColor: '#2D2D2D',
                textDisabledColor: '#D9D9D9',
                arrowColor: PRIMARY,
                monthTextColor: '#000000',
                textDayFontWeight: '500',
                textMonthFontWeight: '800',
                textDayHeaderFontWeight: '700',
              }}
            />

            <Text style={styles.dayStatus}>Red dates are blocked · Purple dot means a booking</Text>
            <View style={styles.weeklySwitch}>
              <Text style={styles.copyDayChipText}>Block a date range</Text>
              <Switch accessibilityLabel="Block a date range" value={selectingRange}
                trackColor={{ false: '#D8D8D8', true: PRIMARY }} onValueChange={changeRangeMode} />
            </View>
            {selectingRange && (
              <View style={styles.rangeControls}>
                <View style={styles.rangeFields}>
                  {(['start', 'end'] as const).map(field => {
                    const active = rangeField === field;
                    const date = field === 'start' ? rangeStart : rangeEnd;
                    return <TouchableOpacity key={field}
                      style={[styles.rangeField, active && styles.activeRangeField]}
                      accessibilityRole="button" accessibilityState={{ selected: active }}
                      onPress={() => setRangeField(field)}>
                      <Text style={styles.copyDayChipText}>{field === 'start' ? 'Start date' : 'End date'}</Text>
                      <Text style={styles.dayStatus}>{date ? formatBlockedDate(date) : 'Select date'}</Text>
                    </TouchableOpacity>;
                  })}
                </View>
                <Text style={styles.rangeHint}>
                  {rangeStart && rangeEnd && rangeEnd < rangeStart
                    ? 'End date must be on or after the start date.'
                    : `Tap a date on the calendar to set the ${rangeField} date.`}
                </Text>
                <TouchableOpacity style={[styles.applyRange, (!rangeStart || !rangeEnd || rangeEnd < rangeStart) && { opacity: 0.45 }]}
                  accessibilityRole="button" disabled={!rangeStart || !rangeEnd || rangeEnd < rangeStart}
                  onPress={applyDateRange}>
                  <Text style={styles.pickerPrimaryButtonText}>Apply range</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
          {editorBlockedDates.length > 0 && <View style={styles.blockCalendarCard}>
            <Text style={styles.editorSectionTitle}>Blocked dates</Text>
            <View style={styles.blockedDateList}>
              {editorBlockedDates.map(date => {
                const reason = blockedDateReasons.find(item => item.date === date)?.reason;
                return <View key={date} style={styles.blockedDateRow}>
                  <View style={styles.blockedDateTextGroup}>
                    <Text style={styles.blockedDatesText}>{formatBlockedDate(date)}</Text>
                    {!!reason && <Text style={styles.dayStatus}>{reason}</Text>}
                  </View>
                  <TouchableOpacity style={styles.closeIcon} accessibilityRole="button"
                    accessibilityLabel={`Unblock ${date}`} onPress={() => removeBlockedDate(date)}>
                    <Ionicons name="close" size={20} color="#9F3125" />
                  </TouchableOpacity>
                </View>;
              })}
            </View>
          </View>}

          </>}
        </ScrollView>
        <View style={[styles.stickySave, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {dirty && <Text style={styles.dirtyNotice}>Unsaved changes</Text>}
          <TouchableOpacity
            style={styles.saveAvailabilityButton}
            disabled={editorSaving}
            onPress={handleSaveAvailability}
            activeOpacity={0.85}
          >
            {editorSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={21} color="#FFFFFF" />
                <Text style={styles.saveAvailabilityText}>Save Availability</Text>
              </>
            )}
          </TouchableOpacity>

        </View>

        {activeDayForSlot && (
          <View style={styles.pickerOverlay}>
            <View style={[styles.pickerCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.pickerHeader}>
                <Text style={[styles.pickerTitle, { flex: 1 }]}>
                  {editingSlotIndex !== null ? 'Edit time slot' : 'Add time slot'} · {DAYS.find(day => day.code === activeDayForSlot)?.label}
                </Text>
                <TouchableOpacity style={styles.closeIcon} accessibilityRole="button" accessibilityLabel="Close time slot" onPress={closeSlot}>
                  <Ionicons name="close" size={23} color={PRIMARY} />
                </TouchableOpacity>
              </View>
              <View style={[styles.tabs, styles.centerRow]}>
                {([{ label: 'Full day', start: '09:00', end: '23:00' }, { label: 'Morning', start: '09:00', end: '12:00' },
                  { label: 'Evening', start: '17:00', end: '23:00' }]).map(preset =>
                  <TouchableOpacity key={preset.label} style={styles.copyDayChip} accessibilityRole="button" onPress={() => {
                    chooseTime('start', parseTime(preset.start)); chooseTime('end', parseTime(preset.end));
                  }}><Text style={styles.copyDayChipText}>{preset.label}</Text></TouchableOpacity>)}
              </View>
              <View style={[styles.tabs, styles.centerRow]}>
                {(['start', 'end'] as const).map(field => {
                  const value = field === 'start' ? draftStart : draftEnd;
                  const picked = field === 'start' ? pickedStart : pickedEnd;
                  return <TouchableOpacity key={field} style={[styles.copyDayChip, styles.timeField]} accessibilityRole="button"
                    onPress={() => {
                      if (Platform.OS === 'android') {
                        DateTimePickerAndroid.open({ mode: 'time', value, onChange: (event, date) => {
                          if (event.type === 'set' && date) chooseTime(field, date);
                        } });
                      } else {
                        setSlotPickerMode(field);
                        if (!picked) chooseTime(field, value);
                      }
                    }}>
                    <Text style={styles.copyDayChipText}>{field === 'start' ? 'Start' : 'End'}</Text>
                    <Text style={styles.dayName}>{picked ? formatDisplayTime(toHHMM(value)) : 'Select time'}</Text>
                  </TouchableOpacity>;
                })}
              </View>
              {Platform.OS === 'ios' && slotPickerMode && (slotPickerMode === 'start' ? pickedStart : pickedEnd) && (
                <DateTimePicker value={slotPickerMode === 'start' ? draftStart : draftEnd} mode="time" display="compact"
                  onChange={(_, date) => { if (date) chooseTime(slotPickerMode, date); }} />
              )}
              {!!slotError && <Text accessibilityRole="alert" style={styles.dirtyNotice}>{slotError}</Text>}
              {pickedStart && pickedEnd && !slotError && <Text style={styles.slotDuration}>
                Duration: {Math.floor(duration / 60)} hr {duration % 60 ? `${duration % 60} min` : ''}
              </Text>}
              <View style={styles.pickerButtonsRow}>
                <TouchableOpacity style={[styles.pickerPrimaryButtonFlex, (!pickedStart || !pickedEnd || !!slotError) && { opacity: 0.5 }]}
                  disabled={!pickedStart || !pickedEnd || !!slotError} onPress={confirmSlot}>
                  <Text style={styles.pickerPrimaryButtonText}>Save slot</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <HourPromptModal
          visible={!!noticePromptDay}
          title="Set booking notice"
          message="Enter the minimum number of days before the service (1 or more)."
          onCancel={() => setNoticePromptDay(null)}
          onSubmit={(days) => noticePromptDay && addNoticeOption(noticePromptDay, days)}
        />
      </View>
    </Modal>
  );
};

export default VendorAvailabilityEditor;

const styles = StyleSheet.create({
  screenTabs: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  screenTab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  screenTabText: { fontSize: 14, textAlign: 'center' },
  centerRow: { justifyContent: 'center' },
  timeField: { flex: 1, minHeight: 58, alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY_LIGHT },
  slotDuration: { textAlign: 'center', color: PRIMARY, fontWeight: '600', marginVertical: 10 },
  closeIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  reasonLabel: { color: '#332430', fontWeight: '700', marginTop: 12, marginBottom: 6 },
  reasonInput: { borderWidth: 1, borderColor: '#DDD2DA', borderRadius: 10, padding: 10, color: '#222' },
  rangeControls: { gap: 8 },
  rangeFields: { flexDirection: 'row', gap: 8 },
  rangeField: { flex: 1, minHeight: 52, padding: 8, borderWidth: 1, borderColor: '#DDD2DA', borderRadius: 10 },
  activeRangeField: { borderColor: PRIMARY, backgroundColor: PRIMARY_LIGHT },
  rangeHint: { color: '#625560', fontSize: 12 },
  applyRange: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: PRIMARY, borderRadius: 10 },
  blockedDateList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  blockedDateRow: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%', paddingLeft: 10, borderRadius: 12, backgroundColor: '#FBE5DF' },
  blockedDateTextGroup: { flexShrink: 1, paddingVertical: 6 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 10 },
  weeklySwitch: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  scheduleOption: { minHeight: 44, justifyContent: 'center' },
  stickySave: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 8 },
  dirtyNotice: { color: '#8E4B0A', fontSize: 12, marginVertical: 6 },

  editorContainer: { flex: 1, backgroundColor: PRIMARY_LIGHT },
    editorHeader: {
    backgroundColor: PRIMARY,
    paddingTop: Platform.OS === 'ios' ? 55 : 50,
    paddingHorizontal: 16,
    paddingBottom: 30,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
  },
  editorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editorCloseButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  editorHeaderTitleWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 55 : 50,
    left: 0,
    right: 0,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
    editorTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
    editorSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 3, textAlign: 'center' },
  editorHeaderIcon: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  editorContent: { padding: 16, paddingBottom: 40 },
  editorInfoCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 13, flexDirection: 'row',
    alignItems: 'center', borderWidth: 1, borderColor: '#F0DDEA', marginBottom: 18,
  },
  editorInfoIcon: {
    width: 36, height: 36, borderRadius: 11, backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  editorInfoText: { flex: 1, fontSize: 11, lineHeight: 17, color: '#666666' },
  editorSectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginBottom: 5, marginTop: 4 },
  editorSectionDescription: { fontSize: 11, color: '#888888', lineHeight: 16, marginBottom: 10 },
  dayEditorCard: {
    backgroundColor: '#FFFFFF', borderRadius: 17, marginBottom: 10,
    borderWidth: 1, borderColor: '#E9E9E9', overflow: 'hidden',
  },
  dayEditorCardActive: { borderColor: '#E4C7DC' },
  dayEditorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13 },
  dayTitleRow: { flexDirection: 'row', alignItems: 'center' },
  dayIconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  dayIconActive: { backgroundColor: PRIMARY },
  dayIconInactive: { backgroundColor: '#EEEEEE' },
  dayName: { fontSize: 14, fontWeight: '800', color: '#222222' },
  dayStatus: { fontSize: 10, color: '#8A8A8A', marginTop: 2 },
  daySlotsEditor: { borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: 12, backgroundColor: '#FCFCFC' },
  noEditorSlots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 6 },
  noEditorSlotsText: { fontSize: 11, color: '#999999' },
  editorSlotRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY_LIGHT, borderRadius: 12, padding: 9, marginBottom: 7 },
  editorSlotTimeBox: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 7 },
  editorSlotTime: { fontSize: 12, fontWeight: '800', color: PRIMARY },
  editorSlotActions: { flexDirection: 'row', gap: 6 },
  slotActionButton: { width: 44, height: 44, borderRadius: 9, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  deleteSlotButton: { backgroundColor: '#FDEBEC' },
  addSlotButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    borderStyle: 'dashed', borderColor: '#D9B6D0', borderRadius: 12, paddingVertical: 10, marginTop: 3, gap: 6,
  },
  addSlotButtonText: { fontSize: 11, fontWeight: '800', color: PRIMARY },
  noticeSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0E4ED' },
  noticeLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  noticeLabel: { fontSize: 12, fontWeight: '700', color: '#555555' },
  noticeHelp: { fontSize: 10, color: '#999999', marginTop: 4, marginBottom: 10, lineHeight: 14 },
  durationChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  durationChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY_LIGHT, borderWidth: 1,
    borderColor: ACCENT_LIGHT, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 11, gap: 6,
  },
  durationChipText: { fontSize: 12, fontWeight: '700', color: PRIMARY },
  addDurationButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
    borderStyle: 'dashed', borderColor: '#D9B6D0', borderRadius: 12, paddingVertical: 10, gap: 6,
  },
  addDurationButtonText: { fontSize: 11, fontWeight: '800', color: PRIMARY },
  copyDayButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, paddingVertical: 8 },
  copyDayButtonText: { fontSize: 11, fontWeight: '800', color: ACCENT },
  copyDayPanel: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#F0DDEA', padding: 12, marginTop: 6 },
  copyDayPanelTitle: { fontSize: 12, fontWeight: '800', color: '#333333', marginBottom: 9 },
  copyDayChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  copyDayChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#E7D8E2', backgroundColor: '#FFFFFF' },
  copyDayChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  copyDayChipText: { fontSize: 11, fontWeight: '700', color: PRIMARY },
  copyDayChipTextActive: { color: '#FFFFFF' },
  copyDayActionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  copyDayCancelButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#DDDDDD' },
  copyDayCancelText: { fontSize: 12, fontWeight: '700', color: '#666666' },
  copyDayApplyButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: PRIMARY },
  copyDayApplyButtonDisabled: { backgroundColor: '#D8B9CE' },
  copyDayApplyText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  blockCalendarCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 10, marginTop: 4, borderWidth: 1, borderColor: '#F0DDEA' },
  blockedDatesSummary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDEBEC', borderRadius: 11, padding: 9, marginTop: 8, gap: 6 },
  blockedDatesText: { fontSize: 11, color: '#C0392B', fontWeight: '700' },
  saveAvailabilityButton: {
    backgroundColor: PRIMARY, borderRadius: 16, minHeight: 54, marginTop: 20, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  saveAvailabilityText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  pickerOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.42)', justifyContent: 'flex-end' },
  pickerCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: Platform.OS === 'ios' ? 30 : 20 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  pickerSubtitle: { fontSize: 11, color: '#888888', marginTop: 3 },
  timePicker: { alignSelf: 'center', height: 180, width: '100%' },
  pickerPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: PRIMARY_LIGHT, borderRadius: 13, paddingVertical: 12, marginTop: 5, gap: 7 },
  pickerPreviewText: { fontSize: 14, fontWeight: '800', color: PRIMARY },
  pickerButtons: { marginTop: 13 },
  pickerPrimaryButton: { backgroundColor: PRIMARY, borderRadius: 14, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  pickerPrimaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pickerButtonsRow: { flexDirection: 'row', gap: 10 },
  pickerBackButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 14, minHeight: 50, paddingHorizontal: 18 },
  pickerBackButtonText: { color: PRIMARY, fontSize: 13, fontWeight: '800' },
   pickerPrimaryButtonFlex: { flex: 1, backgroundColor: PRIMARY, borderRadius: 14, minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  androidTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E4C7DC',
    paddingVertical: 16,
    marginVertical: 4,
  },
  androidTimeButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
  },
});