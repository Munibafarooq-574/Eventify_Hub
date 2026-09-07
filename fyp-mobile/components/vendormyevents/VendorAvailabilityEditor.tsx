import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';

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

type AvailabilitySettings = {
  workingDays?: { day: string; enabled: boolean }[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  daySlots?: DaySlotConfig[];
  blockedDates?: string[];
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

const addMinutes = (date: Date, minutes: number) =>
  new Date(date.getTime() + minutes * 60000);

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

type Props = {
  visible: boolean;
  vendorId: string | null;
  availability: AvailabilitySettings | null;
  selectedDate: string;
  onClose: () => void;
  onSaved: (data: {
    daySlots: DaySlotConfig[];
    blockedDates: string[];
  }) => void;
};

const VendorAvailabilityEditor = ({
  visible,
  vendorId,
  availability,
  selectedDate,
  onClose,
  onSaved,
}: Props) => {
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorDaySlots, setEditorDaySlots] = useState<DaySlotConfig[]>([]);
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
            ? existing.advanceNoticeOptionsMinutes
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

    setEditorDaySlots(merged);
    setEditorBlockedDates((availability?.blockedDates || []).map((d) => toKey(d)));
  }, [visible, availability]);

  const toggleEditorDay = (dayCode: string) => {
    setEditorDaySlots((prev) =>
      prev.map((day) => (day.day === dayCode ? { ...day, enabled: !day.enabled } : day)),
    );
  };

  const startAddingSlot = (dayCode: string) => {
    const start = new Date();
    start.setHours(9, 0, 0, 0);
    const end = new Date();
    end.setHours(17, 0, 0, 0);

    setActiveDayForSlot(dayCode);
    setEditingSlotIndex(null);
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
    setDraftStart(parseTime(slot.start));
    setDraftEnd(parseTime(slot.end));
    setSlotPickerMode('start');
  };

  const deleteSlot = (dayCode: string, index: number) => {
    Alert.alert('Delete time slot', 'Are you sure you want to remove this working slot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setEditorDaySlots((prev) =>
            prev.map((day) =>
              day.day === dayCode
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
  };

  const toggleCopyTargetDay = (dayCode: string) => {
    setCopyTargetDays((prev) =>
      prev.includes(dayCode) ? prev.filter((d) => d !== dayCode) : [...prev, dayCode],
    );
  };

  const applyCopyToDays = () => {
    if (!copyDaySource || copyTargetDays.length === 0) {
      setCopyDaySource(null);
      return;
    }

    const sourceDay = editorDaySlots.find((day) => day.day === copyDaySource);
    if (!sourceDay) {
      setCopyDaySource(null);
      return;
    }

    const clonedSlots = sourceDay.slots.map((slot) => ({ ...slot }));

    setEditorDaySlots((prev) =>
      prev.map((day) =>
        copyTargetDays.includes(day.day)
          ? {
              ...day,
              enabled: true,
              slots: clonedSlots,
              advanceNoticeOptionsMinutes: [...(sourceDay.advanceNoticeOptionsMinutes || [])],
            }
          : day,
      ),
    );

    const copiedCount = copyTargetDays.length;
    setCopyDaySource(null);
    setCopyTargetDays([]);

    Alert.alert('Copied', `Working hours copied to ${copiedCount} ${copiedCount === 1 ? 'day' : 'days'}.`);
  };

  const confirmSlot = () => {
    if (!activeDayForSlot) return;

    if (draftEnd <= draftStart) {
      Alert.alert('Invalid slot', 'End time must be after start time.');
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
        if (day.day !== activeDayForSlot) return day;
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

  const toggleBlockedDate = (dateKey: string) => {
    setEditorBlockedDates((prev) =>
      prev.includes(dateKey) ? prev.filter((d) => d !== dateKey) : [...prev, dateKey],
    );
  };

  const addNoticeOption = (dayCode: string, hours: number) => {
    const minutes = Math.round(hours * 60);
    setEditorDaySlots((prev) =>
      prev.map((item) =>
        item.day === dayCode
          ? {
              ...item,
              advanceNoticeOptionsMinutes: Array.from(
                new Set([...(item.advanceNoticeOptionsMinutes || []), minutes]),
              ).sort((a, b) => a - b),
            }
          : item,
      ),
    );
    setNoticePromptDay(null);
  };

  const removeNoticeOption = (dayCode: string, minutes: number) => {
    setEditorDaySlots((prev) =>
      prev.map((item) =>
        item.day === dayCode
          ? {
              ...item,
              advanceNoticeOptionsMinutes: (item.advanceNoticeOptionsMinutes || []).filter(
                (v) => v !== minutes,
              ),
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
      (day) => day.enabled && day.slots.some((slot) => minutesBetween(slot.start, slot.end) <= 0),
    );

    if (invalidDay) {
      Alert.alert(
        'Invalid time slot',
        `${DAYS.find((d) => d.code === invalidDay.day)?.label || invalidDay.day} contains an invalid time slot.`,
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
          ? day.advanceNoticeOptionsMinutes
          : [],
      }));

      await patchVendorAvailability(vendorId, {
        daySlots: cleanDaySlots,
        blockedDates: editorBlockedDates,
      });

      onSaved({ daySlots: cleanDaySlots, blockedDates: editorBlockedDates });

      Alert.alert('Availability Saved', 'Your working days and time slots have been updated successfully.');
    } catch (error) {
      console.error('Error saving availability:', error);
      Alert.alert('Error', 'Unable to save availability. Please try again.');
    } finally {
      setEditorSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (!editorSaving) onClose();
      }}
    >
      <View style={styles.editorContainer}>
        <View style={styles.editorHeader}>
          <TouchableOpacity style={styles.editorCloseButton} disabled={editorSaving} onPress={onClose}>
            <Ionicons name="close" size={22} color={PRIMARY} />
          </TouchableOpacity>
          <View style={styles.editorHeaderTitleWrap}>
            <Text style={styles.editorTitle}>Manage Availability</Text>
            <Text style={styles.editorSubtitle}>Set your working days & hours</Text>
          </View>
          <View style={styles.editorHeaderIcon}>
            <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.editorContent}>
          <View style={styles.editorInfoCard}>
            <View style={styles.editorInfoIcon}>
              <Ionicons name="information-circle-outline" size={21} color={PRIMARY} />
            </View>
            <Text style={styles.editorInfoText}>
              Choose which days you work, add working time slots, and set how early customers must
              book each day.
            </Text>
          </View>

          <Text style={styles.editorSectionTitle}>Working Days</Text>

          {DAYS.map((day) => {
            const config = editorDaySlots.find((item) => item.day === day.code) || {
              day: day.code,
              enabled: true,
              slots: [],
              advanceNoticeOptionsMinutes: [],
            };

            return (
              <View
                key={day.code}
                style={[styles.dayEditorCard, config.enabled && styles.dayEditorCardActive]}
              >
                <View style={styles.dayEditorHeader}>
                  <View style={styles.dayTitleRow}>
                    <View
                      style={[
                        styles.dayIconCircle,
                        config.enabled ? styles.dayIconActive : styles.dayIconInactive,
                      ]}
                    >
                      <Ionicons
                        name={config.enabled ? 'checkmark' : 'moon-outline'}
                        size={17}
                        color={config.enabled ? '#FFFFFF' : '#999999'}
                      />
                    </View>
                    <View>
                      <Text style={styles.dayName}>{day.label}</Text>
                      <Text style={styles.dayStatus}>
                        {config.enabled
                          ? config.slots.length > 0
                            ? `${config.slots.length} time ${config.slots.length === 1 ? 'slot' : 'slots'}`
                            : 'Working day'
                          : 'Day off'}
                      </Text>
                    </View>
                  </View>

                  <Switch
                    value={config.enabled}
                    onValueChange={() => toggleEditorDay(day.code)}
                    trackColor={{ false: '#D8D8D8', true: ACCENT }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {config.enabled && (
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
                        How early a customer must book you on {day.label}. Leave empty to use your
                        default notice.
                      </Text>

                      <View style={styles.durationChipsRow}>
                        {(config.advanceNoticeOptionsMinutes || []).map((minutes) => (
                          <View key={`${day.code}-${minutes}`} style={styles.durationChip}>
                            <Text style={styles.durationChipText}>{formatNoticeLabel(minutes)}</Text>
                            <TouchableOpacity onPress={() => removeNoticeOption(day.code, minutes)}>
                              <Ionicons name="close-circle" size={17} color="#C0392B" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>

                      <TouchableOpacity
                        style={styles.addDurationButton}
                        onPress={() => setNoticePromptDay(day.code)}
                      >
                        <Ionicons name="add-circle-outline" size={18} color={PRIMARY} />
                        <Text style={styles.addDurationButtonText}>Add notice period</Text>
                      </TouchableOpacity>
                    </View>

                    {config.slots.length > 0 && (
                      <TouchableOpacity style={styles.copyDayButton} onPress={() => startCopyingDay(day.code)}>
                        <Ionicons name="copy-outline" size={15} color={ACCENT} />
                        <Text style={styles.copyDayButtonText}>Copy to other days</Text>
                      </TouchableOpacity>
                    )}

                    {copyDaySource === day.code && (
                      <View style={styles.copyDayPanel}>
                        <Text style={styles.copyDayPanelTitle}>Apply these hours to:</Text>
                        <View style={styles.copyDayChipsRow}>
                          {DAYS.filter((other) => other.code !== day.code).map((other) => {
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
                            disabled={copyTargetDays.length === 0}
                            onPress={applyCopyToDays}
                          >
                            <Text style={styles.copyDayApplyText}>Apply</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <Text style={styles.editorSectionTitle}>Block Specific Dates</Text>
          <Text style={styles.editorSectionDescription}>
            Tap a date to temporarily make yourself unavailable.
          </Text>

          <View style={styles.blockCalendarCard}>
            <Calendar
              current={selectedDate}
              markingType="custom"
              markedDates={editorBlockedDates.reduce((result: Record<string, any>, date) => {
                result[date] = {
                  customStyles: {
                    container: { backgroundColor: '#C0392B', borderRadius: 8 },
                    text: { color: '#FFFFFF', fontWeight: '800' },
                  },
                };
                return result;
              }, {})}
              onDayPress={(day) => toggleBlockedDate(day.dateString)}
              enableSwipeMonths
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

            {editorBlockedDates.length > 0 && (
              <View style={styles.blockedDatesSummary}>
                <Ionicons name="ban-outline" size={17} color="#C0392B" />
                <Text style={styles.blockedDatesText}>
                  {editorBlockedDates.length} blocked {editorBlockedDates.length === 1 ? 'date' : 'dates'}
                </Text>
              </View>
            )}
          </View>

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

          <View style={{ height: 30 }} />
        </ScrollView>

        {slotPickerMode && (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <View style={styles.pickerHeader}>
                <View>
                  <Text style={styles.pickerTitle}>
                    {editingSlotIndex !== null ? 'Edit Time Slot' : 'Add Time Slot'}
                  </Text>
                  <Text style={styles.pickerSubtitle}>
                    Select {slotPickerMode === 'start' ? 'start' : 'end'} time
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSlotPickerMode(null);
                    setActiveDayForSlot(null);
                    setEditingSlotIndex(null);
                  }}
                >
                  <Ionicons name="close-circle" size={25} color="#999999" />
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={slotPickerMode === 'start' ? draftStart : draftEnd}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="light"
                textColor={Platform.OS === 'ios' ? '#1A1A1A' : undefined}
                onChange={(_, date) => {
                  if (!date) return;
                  if (slotPickerMode === 'start') {
                    setDraftStart(date);
                    if (date >= draftEnd) setDraftEnd(addMinutes(date, 60));
                  } else {
                    setDraftEnd(date);
                  }
                }}
                style={styles.timePicker}
              />

              <View style={styles.pickerPreview}>
                <Ionicons name="time-outline" size={18} color={PRIMARY} />
                <Text style={styles.pickerPreviewText}>
                  {formatDisplayTime(toHHMM(draftStart))} - {formatDisplayTime(toHHMM(draftEnd))}
                </Text>
              </View>

              <View style={styles.pickerButtons}>
                {slotPickerMode === 'start' ? (
                  <TouchableOpacity style={styles.pickerPrimaryButton} onPress={() => setSlotPickerMode('end')}>
                    <Text style={styles.pickerPrimaryButtonText}>Next: End Time</Text>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.pickerButtonsRow}>
                    <TouchableOpacity style={styles.pickerBackButton} onPress={() => setSlotPickerMode('start')}>
                      <Ionicons name="arrow-back" size={17} color={PRIMARY} />
                      <Text style={styles.pickerBackButtonText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pickerPrimaryButtonFlex} onPress={confirmSlot}>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                      <Text style={styles.pickerPrimaryButtonText}>Save Slot</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        <HourPromptModal
          visible={!!noticePromptDay}
          title="Add booking notice"
          message="Enter how many hours before the event a booking must be made (e.g. 24 for 1 day)."
          onCancel={() => setNoticePromptDay(null)}
          onSubmit={(hours) => noticePromptDay && addNoticeOption(noticePromptDay, hours)}
        />
      </View>
    </Modal>
  );
};

export default VendorAvailabilityEditor;

const styles = StyleSheet.create({
  editorContainer: { flex: 1, backgroundColor: PRIMARY_LIGHT },
  editorHeader: {
    backgroundColor: PRIMARY,
    paddingTop: Platform.OS === 'ios' ? 55 : 25,
    paddingHorizontal: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  editorCloseButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  editorHeaderTitleWrap: { flex: 1, marginLeft: 12 },
  editorTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  editorSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 3 },
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
  slotActionButton: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
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
});