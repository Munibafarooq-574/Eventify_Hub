import { displayBookingMoney, getVendorBookingSummary } from '@/utils/vendorBookingAmounts';
import { bookingTimeZone, formatBookingTime, formatCalendarDate, eventLocalDateTime, bookingDateKey } from '@/utils/bookingTimezone';
import BookingUserGuide from '../guides/BookingUserGuide';
//fyp-mobile/components/vendormyevents/VendorMyEventsIndex.tsx
//fyp-mobile/components/vendormyevents/VendorMyEventsIndex.tsx
import getVendorOrders from "@/services/getVendorOrders";
import { getSubscriptionAccessState } from "@/services/getSubscriptionAccessState";
import getVendorAvailability, { getVendorDayAvailability, type VendorAvailabilityResponse } from "@/services/getVendorAvailability";
import { getVendorStatus as getOrderSummaryStatus } from '../vendorordersummary/VendorOrderSummaryIndex';
import createConversation from '@/services/createConversation';
import { getUserData, saveSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VendorAvailabilityEditor from './VendorAvailabilityEditor';
import { ActivityIndicator, Alert, Linking, SectionList, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Calendar } from "react-native-calendars";
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";

const PRIMARY = "#780C60", PRIMARY_LIGHT = "#F8E9F0", ACCENT = "#B84B9A", ACCENT_LIGHT = "#F0DDEA";

type ViewMode = "day" | "upcoming" | "month" | "past" | "total" | "pending";
type WorkingDay = { day: string; enabled: boolean };
type TimeSlotConfig = { start: string; end: string };
type DaySlotConfig = { day: string; enabled: boolean; slots: TimeSlotConfig[]; advanceNoticeOptionsMinutes?: number[] };
type AvailabilitySettings = { minimumWorkingWindowMinutes?: number; workingDays?: WorkingDay[]; workingHoursStart?: string; workingHoursEnd?: string; daySlots?: DaySlotConfig[]; blockedDates?: string[]; advanceNoticeOptionsMinutes?: number[]; maxConcurrentBookings?: number };
type GeneratedSlot = { start: string; end: string; status: "available" | "booked"; booking?: any; durationMinutes?: number; belowMinimum?: boolean; concurrent?: number };

const FILTERS: { key: ViewMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "day", label: "Selected day", icon: "today-outline" },
  { key: "upcoming", label: "Upcoming", icon: "arrow-forward-circle-outline" },
  { key: "month", label: "This month", icon: "calendar-outline" },
  { key: "past", label: "Past", icon: "time-outline" },
];

/**
 * DATE / TIME HELPERS
 */
const toKey = (date: string | Date) => {
  if (!date) return "";
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

const formatTime = formatBookingTime;

const formatDisplayTime = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const parseTime = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return date;
};

const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60000);
const minutesBetween = (start: string, end: string) => Math.max(0, (parseTime(end).getTime() - parseTime(start).getTime()) / 60000);

const getDayCode = (dateString: string) => ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][new Date(`${dateString}T12:00:00`).getDay()];

/**
 * STATUS HELPERS
 */
const getStatusColor = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "pending": return "#9A5107";
    case "processing": return "#195B95";
    case "confirmed": return "#6533A0";
    case "accepted": return "#278A4B";
    case "completed": return "#217448";
    case "cancelled": case "rejected": case "expired": return "#C0392B";
    default: return PRIMARY;
  }
};

const getStatusBackground = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "pending": return "#FFF0D7";
    case "processing": return "#E4F0FD";
    case "confirmed": return "#EFE5FC";
    case "accepted": return "#E7F7EC";
    case "completed": return "#E4F5E9";
    case "cancelled": case "rejected": case "expired": return "#FDEBEC";
    default: return PRIMARY_LIGHT;
  }
};

const isBlockingBookingStatus = (status?: string) => ["pending", "accepted", "completed"].includes(String(status || "").toLowerCase());

/**
 * MAIN SCREEN
 */
const MyEventsScreen = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [orders, setOrders] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState<string | null>(null);
  const [showSlots, setShowSlots] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySettings | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [daySnapshot, setDaySnapshot] = useState<VendorAvailabilityResponse | null>(null);
  const [dayLoading, setDayLoading] = useState(true);
  const [dayError, setDayError] = useState("");

 /**
   * AVAILABILITY EDITOR STATE
   */
  const [availabilityEditorVisible, setAvailabilityEditorVisible] = useState(false);
  const todayKey = bookingDateKey(new Date(), daySnapshot?.timeZone || 'UTC');
  const initializedCalendarZone = useRef(false);
  useEffect(() => {
    if (daySnapshot?.timeZone && !initializedCalendarZone.current) {
      initializedCalendarZone.current = true;
      setSelectedDate(bookingDateKey(new Date(), daySnapshot.timeZone));
    }
  }, [daySnapshot?.timeZone]);

  /**
   * LOAD EVENTS + AVAILABILITY
   */
  const fetchData = useCallback(async () => {
    try {
      const user = await getUserData();
      if (!user?._id) throw new Error("Vendor user not found");
      setVendorId(String(user._id));

      await Promise.all([
        getVendorOrders("Vendor", user._id, undefined, 0).then(data => {
          setOrders(Array.isArray(data) ? data : []);
        }).catch(error => console.error("Error fetching vendor orders:", error)),
        getVendorAvailability(user._id).then(data => {
          setAvailability(data || {});
        }).catch(error => console.error("Error fetching vendor availability:", error)),
      ]);
    } catch (error) {
      console.error("Error fetching vendor events:", error);
    } finally {
      setAvailabilityLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Day availability uses every blocking vendor booking, independent of the
  // paginated orders list. Discard old responses when the selected day changes.
  useEffect(() => {
    if (!vendorId) return;
    let active = true;
    setDayLoading(true);
    setDayError("");
    setDaySnapshot(null);
    getVendorDayAvailability(vendorId, selectedDate).then((data) => {
      if (active) setDaySnapshot(data);
    }).catch(() => {
      if (active) setDayError("Availability could not be loaded. Pull down to refresh before choosing a time.");
    }).finally(() => { if (active) setDayLoading(false); });
    return () => { active = false; };
  }, [vendorId, selectedDate, orders, availability]);

  useEffect(() => {
  let mounted = true;

  setCanEditAvailability(false);

  if (!vendorId) return;

  const checkAccess = async () => {
    try {
      const access = await getSubscriptionAccessState(vendorId);

      const endTime = access.subscription?.endDate
        ? new Date(access.subscription.endDate).getTime()
        : NaN;

      if (mounted) {
        setCanEditAvailability(
          access.accessAllowed === true &&
          access.subscriptionRequired === false &&
          Number.isFinite(endTime) &&
          endTime > Date.now()
        );
      }
    } catch {
      if (mounted) setCanEditAvailability(false);
    }
  };

  void checkAccess();

  return () => {
    mounted = false;
  };
}, [vendorId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  /**
   * VENDOR-SPECIFIC ORDERS
   */
  const getOwnVendorOrders = useCallback((order: any): any[] => {
    if (!Array.isArray(order?.vendorOrders)) return [];
    const hasVendorIds = order.vendorOrders.some((v: any) => Boolean(v?.vendorId?._id || v?.vendorId));
    if (!vendorId || !hasVendorIds) return order.vendorOrders;

    return order.vendorOrders.filter((v: any) => {
      const id = typeof v?.vendorId === "object" ? v?.vendorId?._id : v?.vendorId;
      return id != null && String(id) === String(vendorId);
    });
  }, [vendorId]);

  /**
   * VENDOR-SPECIFIC STATUS
   */
  const getVendorStatus = useCallback((order: any) =>
    getOrderSummaryStatus({ ...order, vendorOrders: getOwnVendorOrders(order) }) ?? 'pending', [getOwnVendorOrders]);

  /**
   * ACTIVE SCHEDULE ONLY
   *
   * My Events is the vendor's working calendar, not booking history.
   * Cancelled/rejected/expired assignments and replacement assignments that
   * are no longer assigned stay in Order Summary/history, but must not keep
   * appearing as calendar events.
   */
  const scheduleOrders = useMemo(() => {
    return orders.filter((order) => {
      const ownVendorOrders = getOwnVendorOrders(order);

      if (ownVendorOrders.length > 0) {
        return ownVendorOrders.some((vendorOrder: any) => {
          const status = String(vendorOrder?.status || "").toLowerCase();
          const replacementOutcome = String(vendorOrder?.replacementOutcome || "").toUpperCase();

          return (
            !["cancelled", "cancelled_by_vendor", "rejected", "expired"].includes(status) &&
            replacementOutcome !== "NO_LONGER_ASSIGNED"
          );
        });
      }

      return !["cancelled", "cancelled_by_vendor", "rejected", "expired"].includes(
        String(order?.status || "").toLowerCase(),
      );
    });
  }, [orders, getOwnVendorOrders]);

  /**
 * STATS
 */
const bookingLists = useMemo(() => {
  const chronological = [...scheduleOrders].sort((a, b) => toKey(a.eventDate).localeCompare(toKey(b.eventDate)));
  return {
    total: scheduleOrders,
    day: chronological.filter(order => toKey(order.eventDate) === selectedDate),
    upcoming: chronological.filter(order => order.eventDate && toKey(order.eventDate) >= todayKey),
    month: chronological.filter(order => order.eventDate && toKey(order.eventDate).slice(0, 7) === selectedDate.slice(0, 7)),
    past: chronological.filter(order => order.eventDate && toKey(order.eventDate) < todayKey).reverse(),
    pending: scheduleOrders.filter(order => getVendorStatus(order) === "pending"),
  };
}, [scheduleOrders, selectedDate, todayKey, getVendorStatus]);
const events = bookingLists[viewMode];

/**
 * AVAILABILITY HELPERS
 */
const isBlockedDate = useCallback((date: string) => {
  return availability?.blockedDates?.some((blockedDate) => toKey(blockedDate) === date) || false;
}, [availability]);

const [canEditAvailability, setCanEditAvailability] = useState(false);

const getDaySlotConfig = useCallback((date: string) => {
  const dayCode = getDayCode(date);
  return availability?.daySlots?.find((config) => config.day === dayCode);
}, [availability]);

const isWorkingDay = useCallback((date: string) => {
  if (availability?.daySlots?.length) {
    const config = getDaySlotConfig(date);
    if (config) return config.enabled === true;
  }
  if (!availability?.workingDays?.length) return true;
  const code = getDayCode(date);
  const workingDay = availability.workingDays.find((item) => item.day === code);
  return !!workingDay?.enabled;
}, [availability, getDaySlotConfig]);

/**
 * SELECTED DAY BOOKINGS
 */
const selectedDayBookings = useMemo(() => {
  if (daySnapshot?.date !== selectedDate) return [];
  return (daySnapshot.bookings || []).filter((booking) => isBlockingBookingStatus(booking.status)).map((booking) => ({
    status: booking.status,
    eventName: booking.serviceName || "Booked",
    eventStartDateTime: booking.start,
    eventEndDateTime: booking.end,
  }));
}, [daySnapshot, selectedDate]);

/**
 * SELECTED DAY WINDOWS
 */
const selectedDayWindows = useMemo(() => {
  if (!availability) return [];
  if (availability.daySlots?.length) {
    const config = getDaySlotConfig(selectedDate);
    if (config) {
      if (!config.enabled) return [];
      return Array.isArray(config.slots) ? config.slots.filter((slot) => slot?.start && slot?.end && minutesBetween(slot.start, slot.end) > 0) : [];
    }
  }
  if (!isWorkingDay(selectedDate)) return [];
  const start = availability.workingHoursStart || "09:00", end = availability.workingHoursEnd || "18:00";
  return minutesBetween(start, end) <= 0 ? [] : [{ start, end }];
}, [availability, selectedDate, getDaySlotConfig, isWorkingDay]);

/**
 * DAY AVAILABILITY
 */
const dayAvailability = useMemo(() => {
  if (!availability || dayLoading || dayError || daySnapshot?.date !== selectedDate) return { isWorking: true, isBlocked: false, windows: [], slots: [] as GeneratedSlot[] };
  const isWorking = isWorkingDay(selectedDate), isBlocked = isBlockedDate(selectedDate);
  if (!isWorking || isBlocked) return { isWorking, isBlocked, windows: [], slots: [] as GeneratedSlot[] };

  const windows = selectedDayWindows, SLOT_MINUTES = 60, slots: GeneratedSlot[] = [];

  windows.forEach((workingWindow) => {
    const start = eventLocalDateTime(selectedDate, workingWindow.start, daySnapshot?.timeZone || 'UTC');
    const end = eventLocalDateTime(selectedDate, workingWindow.end, daySnapshot?.timeZone || 'UTC');
    let cursor = start;

    while (cursor < end) {
      const slotEnd = new Date(Math.min(addMinutes(cursor, SLOT_MINUTES).getTime(), end.getTime()));
      const durationMinutes = (slotEnd.getTime() - cursor.getTime()) / 60000;
      const belowMinimum = durationMinutes < (availability.minimumWorkingWindowMinutes ?? 60);

      const slotStartKey = cursor.getTime(), slotEndKey = slotEnd.getTime();
      const overlaps = selectedDayBookings.filter((order) => {
        const status = order.status;
        if (!isBlockingBookingStatus(status) || !order?.eventStartDateTime || !order?.eventEndDateTime) return false;
        const bookingStart = new Date(order.eventStartDateTime).getTime();
        const bookingEnd = new Date(order.eventEndDateTime).getTime();
        return !Number.isNaN(bookingStart) && !Number.isNaN(bookingEnd) && bookingStart < slotEndKey && bookingEnd > slotStartKey;
      });

      const booking = overlaps[0];
      const concurrent = overlaps.reduce((peak, order) => {
        const instant = Math.max(slotStartKey, new Date(order.eventStartDateTime).getTime());
        const count = overlaps.filter(other => new Date(other.eventStartDateTime).getTime() <= instant &&
          new Date(other.eventEndDateTime).getTime() > instant).length;
        return Math.max(peak, count);
      }, 0);
      slots.push({ concurrent, start: formatTime(cursor, daySnapshot?.timeZone), end: formatTime(slotEnd, daySnapshot?.timeZone), status: booking ? "booked" : "available", booking, durationMinutes, belowMinimum });
      cursor = slotEnd;
    }
  });

  return { isWorking, isBlocked, windows, slots };
}, [availability, selectedDate, selectedDayBookings, selectedDayWindows, isWorkingDay, isBlockedDate, dayLoading, dayError, daySnapshot]);

/**
 * CALENDAR MARKS
 */
const markedDates = useMemo(() => {
  const marks: Record<string, any> = {};
  for (const order of scheduleOrders) {
    const key = order?.eventDate && toKey(order.eventDate);
    if (!key) continue;
    const status = getVendorStatus(order);
    const dots = marks[key]?.dots ?? [];
    if (!dots.some((dot: { key: string }) => dot.key === status)) {
      dots.push({ key: status, color: getStatusColor(status), selectedDotColor: getStatusColor(status) });
    }
    marks[key] = { dots };
  }
  for (const date of availability?.blockedDates ?? []) {
    const key = toKey(date);
    if (key) marks[key] = { ...marks[key], disabled: true, disableTouchEvent: false };
  }
  const firstOfMonth = new Date(`${(calendarMonth || selectedDate).slice(0, 7)}-01T12:00:00Z`);
  const month = firstOfMonth.getUTCMonth();
  for (const day = new Date(firstOfMonth); day.getUTCMonth() === month; day.setUTCDate(day.getUTCDate() + 1)) {
    const key = toKey(day);
    if (!isWorkingDay(key)) marks[key] = { ...marks[key], disabled: true, disableTouchEvent: false };
  }
  marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#E9D6E5', selectedTextColor: PRIMARY };
  return marks;
}, [scheduleOrders, selectedDate, availability, getVendorStatus, calendarMonth, isWorkingDay]);

const weekStart = new Date(`${selectedDate}T12:00:00Z`);
weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());
const weekDays = Array.from({ length: 7 }, (_, index) => toKey(addMinutes(weekStart, index * 1440)));
const selectDay = (date: string) => {
  setSelectedDate(date);
  setViewMode('day');
  setShowSlots(false);
};

/**
 * MONTH
 */
const monthLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

/**
 * AVAILABILITY SUMMARY & HANDLERS
 */
const displaySlots = dayAvailability.slots.reduce<GeneratedSlot[]>((rows, slot) => {
  const previous = rows[rows.length - 1];
  if (slot.status === 'booked' && previous?.status === 'booked' && previous.booking === slot.booking && previous.end === slot.start) {
    rows[rows.length - 1] = { ...previous, end: slot.end };
  } else {
    rows.push(slot);
  }
  return rows;
}, []);

const availableSlotCount = dayAvailability.slots.filter((slot) => slot.status === "available" && !slot.belowMinimum).length;

const bookedSlotCount = dayAvailability.slots.filter((slot) => slot.status === "booked").length;

const bookingNoticeLabel = useMemo(() => {
  if (!availability) return null;
  const config = getDaySlotConfig(selectedDate);
  const options = config && Array.isArray(config.advanceNoticeOptionsMinutes) && config.advanceNoticeOptionsMinutes.length > 0 ? config.advanceNoticeOptionsMinutes : Array.isArray(availability.advanceNoticeOptionsMinutes) ? availability.advanceNoticeOptionsMinutes : [];
  const validOptions = options.filter((minutes) => Number.isFinite(minutes) && minutes >= 1440);
  const minMinutes = validOptions.length > 0 ? Math.min(...validOptions) : 1440;
  const days = minMinutes / 1440;
  return `Book ${days} ${days === 1 ? 'day' : 'days'} ahead`;
}, [availability, selectedDate, getDaySlotConfig]);

const workingHoursLabel = useMemo(() => {
  if (!dayAvailability.windows || dayAvailability.windows.length === 0) return "No configured slots";
  return dayAvailability.windows.map((workingWindow) => `${formatDisplayTime(workingWindow.start)} - ${formatDisplayTime(workingWindow.end)}`).join("  •  ");
}, [dayAvailability.windows]);

const listTitle = viewMode === "day" ? `Bookings on ${formatCalendarDate(selectedDate)}` : viewMode === "upcoming" ? "Upcoming Bookings"
  : viewMode === "month" ? `Bookings in ${monthLabel}` : viewMode === "past" ? "Past Bookings"
  : viewMode === "pending" ? "Pending Bookings" : "All Bookings";

const tickStep = Math.max(1, Math.ceil(dayAvailability.slots.length / 5));
const timelineTicks = dayAvailability.slots.flatMap((slot, index, slots) => index % tickStep === 0
  ? [{ label: slot.start.replace(':00', ''), width: slots.slice(index, index + tickStep)
      .reduce((minutes, segment) => minutes + (segment.durationMinutes ?? 60), 0) }]
  : []);
const toggleSlots = () => setShowSlots(value => !value);

const openChat = async (organizer: any, timeZone: string) => {
  if (!vendorId || !organizer?._id) return;
  try {
    const { chatId } = await createConversation(vendorId, organizer._id);
    await saveSecureData('chatId', chatId);
    await saveSecureData('receiverId', organizer._id);
    await saveSecureData('receiverName', organizer.name || 'Conversation');
    await saveSecureData('receiverAvatar', organizer.profileImage || '');
    router.push({ pathname: '/message', params: { eventTimeZone: timeZone } });
  } catch {
    Alert.alert('Unable to open chat', 'Refresh your orders and try again.');
  }
};

const availabilityState = dayAvailability.isBlocked ? "Blocked" : !dayAvailability.isWorking ? "Not Working" : dayAvailability.slots.length === 0 ? "No Slots" : "Available";

const availabilityPositive = dayAvailability.isWorking && !dayAvailability.isBlocked && dayAvailability.slots.length > 0;

/**
 * RENDER
 */
return (
  <View style={styles.container}>
    {/* HEADER */}
    <View style={styles.header}>
      <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
      </TouchableOpacity>

      <View style={styles.headerTitleWrap}>
        <Text style={styles.headerTitle}>My Events</Text>
        <Text style={styles.headerSubtitle}>Events & availability</Text>
      </View>

      <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push("/vendornotifications")}>
        <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>

    <BookingUserGuide kind="vendorEvents" primary={PRIMARY} />
    <SectionList
      scrollEventThrottle={32}
      onScroll={event => {
        if (calendarOpen && event.nativeEvent.contentOffset.y > 80) setCalendarOpen(false);
      }}
      sections={[{ key: "bookings", data: events }]}
      stickySectionHeadersEnabled
      keyExtractor={(item) => String(item?._id || item?.id)}
      showsVerticalScrollIndicator={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <>
          <View style={styles.statsRow}>
            {([{ key: 'total', label: 'Total', value: bookingLists.total.length }, { key: 'upcoming', label: 'Upcoming', value: bookingLists.upcoming.length },
              { key: 'pending', label: 'Pending', value: bookingLists.pending.length }] as const).map(chip => (
              <TouchableOpacity key={chip.key} style={[styles.filterChip, viewMode === chip.key && styles.filterChipActive]}
                accessibilityRole="button" accessibilityState={{ selected: viewMode === chip.key }}
                onPress={() => setViewMode(chip.key)}>
                <Text style={[styles.filterChipText, viewMode === chip.key && styles.filterChipTextActive]}>{chip.label} {chip.value}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionSubtitle}>Times shown in {(daySnapshot?.timeZone || 'UTC').replace(/_/g, ' ')}</Text>

          {/* CALENDAR */}
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <View>
                <Text style={styles.calendarTitle}>Booking Calendar</Text>
                <Text style={styles.calendarSubtitle}>Select a date to view your schedule</Text>
              </View>
              <TouchableOpacity style={styles.calendarIcon} accessibilityRole="button" accessibilityLabel="Toggle calendar month"
                accessibilityState={{ expanded: calendarOpen }} onPress={() => setCalendarOpen(value => !value)}>
                <Ionicons name={calendarOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {calendarOpen ? <Calendar
              current={selectedDate}
              markedDates={markedDates}
              markingType="multi-dot"
              onDayPress={(day) => selectDay(day.dateString)}
              onMonthChange={(day) => setCalendarMonth(day.dateString)}
              enableSwipeMonths
              theme={{
                backgroundColor: "#FFFFFF",
                calendarBackground: "#FFFFFF",
                textSectionTitleColor: "#9B9B9B",
                todayTextColor: PRIMARY,
                todayBackgroundColor: PRIMARY_LIGHT,
                dayTextColor: "#2D2D2D",
                textDisabledColor: "#D9D9D9",
                arrowColor: PRIMARY,
                monthTextColor: "#000000",
                textDayFontWeight: "500",
                textMonthFontWeight: "800",
                textDayHeaderFontWeight: "700",
                textDayFontSize: 13,
                textMonthFontSize: 17,
                textDayHeaderFontSize: 12,
              }}
              style={styles.calendar}
            /> : <View style={styles.weekRow}>
              {weekDays.map(date => <TouchableOpacity key={date} style={[styles.weekDay, date === selectedDate && styles.weekSelected]}
                accessibilityRole="button" accessibilityLabel={formatCalendarDate(date)} accessibilityState={{ selected: date === selectedDate }}
                onPress={() => selectDay(date)}>
                <Text style={{ color: isBlockedDate(date) || !isWorkingDay(date) ? '#777' : PRIMARY }}>
                  {date.slice(-2)}{isBlockedDate(date) || !isWorkingDay(date) ? ' ×' : ''}
                </Text>
                <View style={styles.weekDots}>{markedDates[date]?.dots?.map((dot: { key: string; color: string }) =>
                  <View key={dot.key} style={[styles.calendarDot, { backgroundColor: dot.color }]} />)}</View>
              </TouchableOpacity>)}
            </View>}
            <View style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: ACCENT }]} />
              <Text style={styles.legendText}>Booking</Text>

              <View style={[styles.legendDot, { backgroundColor: "#DDD" }]} />
              <Text style={styles.legendText}>Unavailable</Text>

              <View style={[styles.legendDot, { backgroundColor: PRIMARY }]} />
              <Text style={styles.legendText}>Selected</Text>
            </View>
          </View>

            {/* ================================================= AVAILABILITY CARD ================================================== */}
<View style={styles.availabilityCard}>
  <View style={styles.availabilityHeader}>
    <View style={{ flex: 1 }}>
      <Text style={styles.availabilityTitle}>Your Availability</Text>
      <Text style={styles.availabilityDate}>
        {new Date(`${selectedDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
      </Text>
    </View>

    <View style={styles.availabilityHeaderRight}>
      <View style={[styles.availabilityStatus, availabilityPositive ? styles.availableStatus : styles.unavailableStatus]}>
        <View style={[styles.statusDot, { backgroundColor: availabilityPositive ? "#278A4B" : "#C0392B" }]} />
        <Text style={[styles.availabilityStatusText, { color: availabilityPositive ? "#278A4B" : "#C0392B" }]}>
          Day status: {availabilityState}
        </Text>
      </View>
     {canEditAvailability && (
  <TouchableOpacity
    style={styles.editAvailabilityButton}
    onPress={() => setAvailabilityEditorVisible(true)}
    activeOpacity={0.8}
  >
    <Ionicons name="create-outline" size={15} color="#FFFFFF" />
    <Text style={styles.editAvailabilityText}>Edit availability</Text>
  </TouchableOpacity>
)}
    </View>
  </View>

  {!!availability && <View style={styles.rulesRow}>
    {([{ icon: 'time-outline', label: workingHoursLabel },
      { icon: 'people-outline', label: `Max ${availability.maxConcurrentBookings ?? 1} at once` },
      { icon: 'notifications-outline', label: bookingNoticeLabel }] as const).map(rule => (
      <View key={rule.icon} style={styles.ruleChip}>
        <Ionicons name={rule.icon} size={14} color="#625D61" />
        <Text style={styles.ruleText}>{rule.label}</Text>
      </View>
    ))}
  </View>}
  {availabilityLoading || dayLoading ? (
    <View style={styles.loadingAvailability}>
      <ActivityIndicator size="small" color={PRIMARY} />
      <Text style={styles.loadingText}>Loading availability...</Text>
    </View>
  ) : dayError ? (
    <View style={styles.unavailableMessage}>
      <Text accessibilityRole="alert" style={styles.messageText}>{dayError}</Text>
    </View>
  ) : dayAvailability.isBlocked ? (
    <View style={styles.unavailableMessage}>
      <Ionicons name="close-circle" size={24} color="#C0392B" />
      <View style={{ flex: 1 }}>
        <Text style={styles.messageTitle}>Date blocked</Text>
        <Text style={styles.messageText}>You have marked this date as unavailable.</Text>
      </View>
    </View>
  ) : !dayAvailability.isWorking ? (
    <View style={styles.unavailableMessage}>
      <Ionicons name="moon-outline" size={24} color="#C0392B" />
      <View style={{ flex: 1 }}>
        <Text style={styles.messageTitle}>Non-working day</Text>
        <Text style={styles.messageText}>You are not accepting bookings on this day.</Text>
      </View>
    </View>
  ) : (
    <>
      {dayAvailability.slots.length > 0 && <TouchableOpacity style={styles.timelineTarget}
        accessibilityRole="button" accessibilityLabel={showSlots ? 'Hide all slots' : 'See all slots'}
        accessibilityState={{ expanded: showSlots }} onPress={toggleSlots}>
        <View style={styles.timeline}>
          {dayAvailability.slots.map((slot, index) => (
            <View key={index} style={{
              flex: slot.durationMinutes ?? 60,
              backgroundColor: (slot.concurrent ?? 0) > 1 ? '#781D2B'
                : slot.status === 'booked' ? '#B23D49' : slot.belowMinimum ? '#B6A9B0' : '#278A4B',
            }} />
          ))}
        </View>
        <View style={styles.timelineLabels}>
          {timelineTicks.map((tick, index) => <Text key={index} style={[styles.timelineLabel, { flex: tick.width }]}>
            {tick.label}
          </Text>)}
        </View>
        <Text style={styles.slotLink}>{showSlots ? 'Tap to hide all slots' : 'Tap to see all slots'}</Text>
      </TouchableOpacity>}
      <View style={styles.slotSummaryRow}>
        <View style={styles.slotSummaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: "#278A4B" }]} />
          <Text style={styles.summaryText}>{availableSlotCount} free</Text>
        </View>
        <View style={styles.slotSummaryItem}>
          <View style={[styles.summaryDot, { backgroundColor: "#B23D49" }]} />
          <Text style={styles.summaryText}>{bookedSlotCount} booked</Text>
        </View>
      </View>

      {dayAvailability.slots.some(slot => (slot.concurrent ?? 0) > 1) && (
        <Text style={styles.timelineLabel}>Dark red indicates overlapping bookings.</Text>
      )}
    </>
  )}
  {!dayLoading && !dayError && <>
    <Text style={styles.slotSectionTitle}>Booked slots</Text>
    <View style={styles.slotsGrid}>
      {selectedDayBookings.length ? [...selectedDayBookings]
        .sort((first, second) => new Date(first.eventStartDateTime).getTime() - new Date(second.eventStartDateTime).getTime())
        .map((booking, index) => {
          const overlapNames = [...new Set(selectedDayBookings.filter(other => other !== booking &&
            new Date(other.eventStartDateTime).getTime() < new Date(booking.eventEndDateTime).getTime() &&
            new Date(other.eventEndDateTime).getTime() > new Date(booking.eventStartDateTime).getTime())
            .map(other => other.eventName))];
          return <View key={index} style={[styles.slotCard, styles.bookedSlot]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.slotTime}>{formatTime(booking.eventStartDateTime, daySnapshot?.timeZone)} – {formatTime(booking.eventEndDateTime, daySnapshot?.timeZone)}</Text>
            <Text style={styles.slotStatus}>{booking.eventName}</Text>
            {overlapNames.length > 0 && <Text style={styles.overlapText}>
              Overlaps with {overlapNames.join(', ')} · Limit {availability?.maxConcurrentBookings ?? 1} at once
            </Text>}
          </View>
        </View>; }) : <Text style={styles.slotStatus}>No booked slots</Text>}
    </View>
  </>}
      {dayAvailability.slots.length > 0 && <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showSlots }}
        style={styles.scheduleAction} onPress={toggleSlots}>
        <Text style={styles.slotLink}>{showSlots ? 'Hide all slots ▴' : 'Show all slots ▾'}</Text>
      </TouchableOpacity>}
      {showSlots && (dayAvailability.slots.length === 0 ? (
        <View style={styles.noSlots}>
          <Ionicons name="calendar-outline" size={24} color="#9B9B9B" />
          <Text style={styles.noSlotsText}>No time slots available.</Text>
        </View>
      ) : (
        <View style={styles.slotsGrid}>
          {displaySlots.map((slot, index) => {
            const booked = slot.status === "booked";
            return (
              <View key={`${slot.start}-${slot.end}-${index}`} style={[styles.slotCard, booked ? styles.bookedSlot : styles.freeSlot]}>
                <View style={[styles.slotIcon, booked ? styles.bookedSlotIcon : styles.freeSlotIcon]}>
                  <Ionicons name={booked ? "lock-closed-outline" : "checkmark-outline"} size={16} color={booked ? "#C0392B" : "#278A4B"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotTime}>{slot.start} - {slot.end}</Text>
                  <Text style={styles.slotStatus}>{booked ? slot.booking?.eventName || "Booked" : slot.belowMinimum ? `${slot.durationMinutes} min — below minimum working window` : "Available"}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}

  <TouchableOpacity style={styles.scheduleAction} accessibilityRole="button" accessibilityLabel="About availability"
    onPress={() => Alert.alert('Availability', 'Availability is checked again before a booking is confirmed.')}>
    <Ionicons name="information-circle-outline" size={20} color={PRIMARY} />
  </TouchableOpacity>
</View>
        </>
      }
      renderSectionHeader={() => (
        <View style={styles.stickyFilters}>
          <Text style={styles.sectionTitle}>{listTitle}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.filterRow}>
            {FILTERS.map(filter => {
              const active = viewMode === filter.key;
              const label = filter.key === 'day'
                ? `Selected day · ${formatCalendarDate(selectedDate).replace(/ \d{4}$/, '')}` : filter.label;
              return (
                <TouchableOpacity key={filter.key} onPress={() => setViewMode(filter.key)}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  accessibilityRole="button" accessibilityState={{ selected: active }}>
                  <Ionicons name={filter.icon} size={14} color={active ? '#FFF' : PRIMARY} />
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {label} ({bookingLists[filter.key].length})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
renderItem={({ item }) => {
  const id = String(item?._id || item?.id);
  const bookings = getOwnVendorOrders(item);
  const { bookingTotal, totalPaid, totalRemaining } = getVendorBookingSummary(bookings, item);
  const status = getVendorStatus(item);
  const zone = bookingTimeZone(item);
  const organizer = item.organizerId;
  const phone = String(organizer?.phone_number || organizer?.phone || organizer?.contactDetails?.contactNumber || '').replace(/[^+\d]/g, '');
  const timeRange = [item.eventStartDateTime && formatTime(item.eventStartDateTime, zone),
    item.eventEndDateTime && formatTime(item.eventEndDateTime, zone)].filter(Boolean).join(' – ');
  const contactAllowed = !['cancelled', 'expired', 'payment_expired', 'no_longer_assigned'].includes(status);

  return (
    <View style={styles.eventCard}>
      <View style={[styles.eventAccentBar, { backgroundColor: getStatusColor(status) }]} />
      <View style={styles.eventDetails}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Open order for ${item.eventName || 'event'}`}
          activeOpacity={0.85} onPress={() => router.push({ pathname: "/vendorordersummary", params: { orderId: id } })}>
          <Text style={styles.eventDate}>{[formatCalendarDate(item.eventDate), timeRange].filter(Boolean).join(' · ')}</Text>
          <Text style={styles.eventTitle} numberOfLines={2}>{item.eventName || 'Event'}</Text>
          <View style={styles.eventMetaRow}>
            <Text style={[styles.sectionSubtitle, { flex: 1 }]}>
              {[organizer?.name, item.guests != null ? `${item.guests} guests` : ''].filter(Boolean).join(' · ')}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusBackground(status) }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor(status), textTransform: 'capitalize' }]}>{status.replace(/_/g, ' ')}</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>{bookings.length} {bookings.length === 1 ? 'package' : 'packages'} · {displayBookingMoney(bookingTotal, item)}</Text>
          <Text style={styles.eventMoney}>Received {displayBookingMoney(totalPaid, item)} · Pending {displayBookingMoney(totalRemaining, item)}</Text>
          <View style={styles.openOrder}>
            <Text style={styles.eventMoney}>Open order</Text>
            <Ionicons name="chevron-forward" size={16} color={PRIMARY} />
          </View>
        </TouchableOpacity>
        {contactAllowed && (organizer?._id || phone) && <View style={styles.openOrder}>
          {!!organizer?._id && <TouchableOpacity style={styles.shortcut} accessibilityRole="button" accessibilityLabel="Chat with organizer"
            onPress={() => openChat(organizer, zone)}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={PRIMARY} />
            <Text style={styles.shortcutLabel}>Chat</Text>
          </TouchableOpacity>}
          {!!phone && <TouchableOpacity style={styles.shortcut} accessibilityRole="link" accessibilityLabel="Call organizer"
            onPress={() => { void Linking.openURL(`tel:${phone}`).catch(() => Alert.alert('Unable to open dialer')); }}>
            <Ionicons name="call-outline" size={18} color={PRIMARY} />
            <Text style={styles.shortcutLabel}>Call</Text>
          </TouchableOpacity>}
        </View>}
      </View>
    </View>
  );
}}
renderSectionFooter={() => events.length === 0 ? (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconCircle}>
      <Ionicons name="calendar-outline" size={34} color={PRIMARY} />
    </View>
    <Text style={styles.emptyTitle}>
      {viewMode === "day" ? "No bookings on this day" : viewMode === "month" ? "No bookings this month" : "No bookings found"}
    </Text>
    <Text style={styles.emptySubtitle}>
      {viewMode === "day"
        ? "Your availability is shown above. Select another date to view bookings."
        : "Try a different filter or check back later."}
    </Text>
  </View>
) : null}
/>

      <BottomNavigationFinal />

      <VendorAvailabilityEditor
  visible={availabilityEditorVisible && canEditAvailability}
  vendorId={vendorId}
  availability={availability}
  selectedDate={selectedDate}
  onClose={() => setAvailabilityEditorVisible(false)}
  onSaved={(settings) => {
    setAvailability((prev) => ({
      ...(prev || {}),
      ...settings,
    }));
    setAvailabilityEditorVisible(false);
    fetchData();
  }}
/>

    </View>
  );
};

export default MyEventsScreen;

/**
 * =========================================================
 * STYLES
 * =========================================================
 */

const styles = StyleSheet.create({
  stickyFilters: { backgroundColor: '#F8E9F0', paddingVertical: 10, gap: 8 },
  rulesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  ruleChip: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, backgroundColor: '#F1EFF0' },
  ruleText: { color: '#625D61', fontSize: 11, flexShrink: 1 },
  timelineTarget: { marginTop: 6, paddingBottom: 5 },
  timelineLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  timelineLabel: { color: '#665D63', fontSize: 10 },
  slotLink: { color: PRIMARY, fontSize: 12, fontWeight: '700', textDecorationLine: 'underline', marginTop: 5 },
  overlapText: { color: '#781D2B', fontSize: 11, marginTop: 5 },
  shortcutLabel: { color: PRIMARY, fontSize: 10, fontWeight: '700' },

  timeline: { height: 10, flexDirection: 'row', overflow: 'hidden', borderRadius: 5, marginTop: 12, gap: 1 },
  weekRow: { flexDirection: 'row', gap: 4, marginVertical: 6 },
  weekDay: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 42, borderRadius: 8 },
  weekSelected: { backgroundColor: PRIMARY_LIGHT },
  weekDots: { flexDirection: 'row', justifyContent: 'center', gap: 2, minHeight: 5 },
  calendarDot: { width: 4, height: 4, borderRadius: 2 },
  scheduleAction: { minHeight: 40, justifyContent: 'center', alignSelf: 'flex-start' },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  eventMoney: { color: PRIMARY, fontSize: 13, fontWeight: '700', marginTop: 3 },
  openOrder: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  shortcut: { width: 48, height: 44, gap: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: PRIMARY_LIGHT },

  container: { flex: 1, backgroundColor: PRIMARY_LIGHT },
  bookingNoticeCard: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#F0DDEA", padding: 13, marginTop: 4 },
  bookingNoticeHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  bookingNoticeTitle: { fontSize: 13, fontWeight: "800", color: "#333333" },
  bookingNoticeDescription: { fontSize: 11, color: "#888888", marginTop: 5, marginBottom: 10 },
  noticeChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  noticeChip: { flexDirection: "row", alignItems: "center", backgroundColor: PRIMARY_LIGHT, borderWidth: 1, borderColor: ACCENT_LIGHT, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 10, gap: 6 },
  noticeChipText: { fontSize: 11, fontWeight: "700", color: PRIMARY },
  addNoticeButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderStyle: "dashed", borderColor: "#D9B6D0", borderRadius: 12, paddingVertical: 10, gap: 6 },
  addNoticeButtonText: { fontSize: 11, fontWeight: "800", color: PRIMARY },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: PRIMARY, paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 22, paddingHorizontal: 18, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  notificationDot: { position: "absolute", top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF5A5F", borderWidth: 1.5, borderColor: PRIMARY },
  headerTitleWrap: { alignItems: "center" },
  headerTitle: { fontSize: 19, fontWeight: "800", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 110 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: 18, marginBottom: 4 },
  statCard: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "#F0DDEA" },
  statIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: PRIMARY_LIGHT, justifyContent: "center", alignItems: "center", marginBottom: 5 },
  statValue: { fontSize: 19, fontWeight: "800", color: PRIMARY },
  statLabel: { fontSize: 10, color: "#8A8A8A", fontWeight: "600", marginTop: 2 },
  calendarCard: { backgroundColor: "#FFFFFF", borderRadius: 20, marginTop: 14, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 5, paddingTop: 4, paddingBottom: 4 },
  calendarTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  calendarSubtitle: { fontSize: 11, color: "#8A8A8A", marginTop: 3 },
  calendarIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: PRIMARY, justifyContent: "center", alignItems: "center" },
  calendar: { borderRadius: 16 },
  legendRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", paddingHorizontal: 4, paddingTop: 5, gap: 6 },
  legendDot: { width: 11, height: 11, borderRadius: 4, marginLeft: 5 },
  legendText: { fontSize: 10, color: "#777", fontWeight: "600" },
  availabilityCard: { backgroundColor: "#FFFFFF", borderRadius: 20, marginTop: 14, padding: 16, borderWidth: 1, borderColor: "#F0DDEA" },
  availabilityHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  availabilityHeaderRight: { alignItems: "flex-end", gap: 7 },
  availabilityTitle: { fontSize: 16, fontWeight: "800", color: "#1A1A1A" },
  bookingLimitLabel: { fontSize: 12, color: "#685A66" },
  bookingLimitValue: { fontSize: 16, fontWeight: "800", color: PRIMARY, marginTop: 3 },
  availabilityDate: { fontSize: 12, color: "#8A8A8A", marginTop: 3 },
  availabilityStatus: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  availableStatus: { backgroundColor: "#E7F7EC" },
  unavailableStatus: { backgroundColor: "#FDEBEC" },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  availabilityStatusText: { fontSize: 11, fontWeight: "800" },
  editAvailabilityButton: { flexDirection: "row", alignItems: "center", backgroundColor: PRIMARY, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  editAvailabilityText: { color: "#FFFFFF", fontSize: 10, fontWeight: "800" },
  loadingAvailability: { flexDirection: "row", alignItems: "center", paddingVertical: 25 },
  loadingText: { marginLeft: 8, fontSize: 12, color: "#777" },
  unavailableMessage: { marginTop: 14, backgroundColor: "#FDEBEC", borderRadius: 14, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  messageTitle: { fontSize: 13, fontWeight: "800", color: "#7B2020" },
  messageText: { fontSize: 11, color: "#8A4A4A", marginTop: 3 },
  workingHoursCard: { flexDirection: "row", alignItems: "center", backgroundColor: PRIMARY_LIGHT, borderRadius: 14, padding: 12, marginTop: 14 },
  workingHoursIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", marginRight: 10 },
  smallLabel: { fontSize: 10, color: "#8A8A8A", fontWeight: "600" },
  workingHours: { fontSize: 14, color: PRIMARY, fontWeight: "800", marginTop: 2, lineHeight: 20 },
  totalMinutesText: { fontSize: 10, color: "#8A8A8A", marginTop: 3 },
  slotCount: { fontSize: 11, color: "#278A4B", fontWeight: "800" },
  slotSummaryRow: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 16 },
  slotSummaryItem: { flexDirection: "row", alignItems: "center" },
  summaryDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  summaryText: { fontSize: 11, color: "#666", fontWeight: "600" },
  slotSectionTitle: { fontSize: 13, fontWeight: "800", color: "#222", marginTop: 17, marginBottom: 9 },
  slotsGrid: { gap: 8 },
  slotCard: { flexDirection: "row", alignItems: "center", borderRadius: 13, padding: 10, borderWidth: 1 },
  freeSlot: { backgroundColor: "#F1FBF4", borderColor: "#CBEAD3" },
  bookedSlot: { backgroundColor: "#FFF5F5", borderColor: "#F1C8C8" },
  slotIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: "center", alignItems: "center", marginRight: 9 },
  freeSlotIcon: { backgroundColor: "#DDF4E4" },
  bookedSlotIcon: { backgroundColor: "#FCE1E1" },
  slotTime: { fontSize: 12, fontWeight: "800", color: "#333" },
  slotStatus: { fontSize: 10, color: "#777", marginTop: 2 },
  noSlots: { alignItems: "center", justifyContent: "center", paddingVertical: 20 },
  noSlotsText: { fontSize: 11, color: "#999", marginTop: 6 },
  backendNote: { fontSize: 9, lineHeight: 14, color: "#999", marginTop: 12 },
  filterRow: { gap: 8, paddingRight: 8 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFFFF", borderWidth: 1.5, borderColor: "#F0DDEA", paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  filterChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  filterChipText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  filterChipTextActive: { color: "#FFFFFF" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1A1A1A" },
  sectionSubtitle: { fontSize: 12, color: "#8A8A8A", marginTop: 2 },
  countBadge: { backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  countBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  eventCard: { flexDirection: "row", backgroundColor: "#FFFFFF", padding: 14, borderRadius: 16, alignItems: "center", marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, overflow: "hidden" },
  eventAccentBar: { width: 4, alignSelf: "stretch", borderRadius: 4, marginRight: 12 },
  eventIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: PRIMARY_LIGHT, justifyContent: "center", alignItems: "center", marginRight: 12 },
  eventDetails: { flex: 1 },
  eventTopRow: { flexDirection: "row", alignItems: "flex-start" },
  eventDate: { fontSize: 11, color: "#9B9B9B", fontWeight: "600", marginBottom: 2 },
  bookingPriceRow: { flexWrap: "wrap", columnGap: 5, rowGap: 3 },
  originalBookingPrice: { textDecorationLine: "line-through", color: "#786B74" },
  bookingDiscountBadge: {
    color: "#614100", backgroundColor: "#FFE9AA", borderRadius: 9,
    fontSize: 10, fontWeight: "800", paddingHorizontal: 6, paddingVertical: 3,
  },
  eventTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A" },
  statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5, marginLeft: 7 },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  statusBadgeText: { fontSize: 9, fontWeight: "800", textTransform: "capitalize" },
  metaRow: { flexDirection: "row", marginTop: 8, gap: 16 },
  eventMeta: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  eventText: { marginLeft: 5, color: "#555", fontSize: 12, fontWeight: "500" },
  expandedBlock: { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: "rgba(120,12,96,0.12)" },
  expandedText: { marginLeft: 6, fontSize: 12, color: "#4A4A4A" },
  expandedSubTitle: { fontSize: 11, fontWeight: "800", color: PRIMARY, marginTop: 6, textTransform: "uppercase" },
  vendorDetailCard: { marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: "#FFF8FC", borderWidth: 1, borderColor: "#F0DDEA" },
  vendorDetailTitle: { fontSize: 12.5, fontWeight: "800", color: PRIMARY, marginBottom: 3 },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, paddingHorizontal: 30 },
  emptyIconCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: PRIMARY_LIGHT, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#1A1A1A", marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: "#8A8A8A", textAlign: "center", lineHeight: 18 },

  /** AVAILABILITY EDITOR */
  editorContainer: { flex: 1, backgroundColor: PRIMARY_LIGHT },
  editorHeader: { backgroundColor: PRIMARY, paddingTop: Platform.OS === "ios" ? 55 : 25, paddingHorizontal: 16, paddingBottom: 18, flexDirection: "row", alignItems: "center", borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  editorCloseButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  editorHeaderTitleWrap: { flex: 1, marginLeft: 12 },
  editorTitle: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  editorSubtitle: { fontSize: 11, color: "rgba(255,255,255,0.72)", marginTop: 3 },
  editorHeaderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  editorContent: { padding: 16, paddingBottom: 40 },
  editorInfoCard: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 13, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#F0DDEA", marginBottom: 18 },
  editorInfoIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: PRIMARY_LIGHT, alignItems: "center", justifyContent: "center", marginRight: 10 },
  editorInfoText: { flex: 1, fontSize: 11, lineHeight: 17, color: "#666666" },
  editorSectionTitle: { fontSize: 17, fontWeight: "800", color: "#1A1A1A", marginBottom: 5, marginTop: 4 },
  editorSectionDescription: { fontSize: 11, color: "#888888", lineHeight: 16, marginBottom: 10 },
  dayEditorCard: { backgroundColor: "#FFFFFF", borderRadius: 17, marginBottom: 10, borderWidth: 1, borderColor: "#E9E9E9", overflow: "hidden" },
  dayEditorCardActive: { borderColor: "#E4C7DC" },
  dayEditorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 13 },
  dayTitleRow: { flexDirection: "row", alignItems: "center" },
  dayIconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10 },
  dayIconActive: { backgroundColor: PRIMARY },
  dayIconInactive: { backgroundColor: "#EEEEEE" },
  dayName: { fontSize: 14, fontWeight: "800", color: "#222222" },
  dayStatus: { fontSize: 10, color: "#8A8A8A", marginTop: 2 },
  daySlotsEditor: { borderTopWidth: 1, borderTopColor: "#F0F0F0", padding: 12, backgroundColor: "#FCFCFC" },
  noEditorSlots: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13, gap: 6 },
  noEditorSlotsText: { fontSize: 11, color: "#999999" },
  editorSlotRow: { flexDirection: "row", alignItems: "center", backgroundColor: PRIMARY_LIGHT, borderRadius: 12, padding: 9, marginBottom: 7 },
  maxDurationSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F0E4ED" },
  maxDurationHeader: { marginBottom: 10 },
  maxDurationLabelWrap: { flexDirection: "row", alignItems: "center" },
  maxDurationLabel: { fontSize: 12, fontWeight: "700", color: "#555555", marginLeft: 7 },
  durationChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  durationChip: { flexDirection: "row", alignItems: "center", backgroundColor: PRIMARY_LIGHT, borderWidth: 1, borderColor: ACCENT_LIGHT, borderRadius: 20, paddingVertical: 7, paddingHorizontal: 11, gap: 6 },
  durationChipText: { fontSize: 12, fontWeight: "700", color: PRIMARY },
  addDurationButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderStyle: "dashed", borderColor: "#D9B6D0", borderRadius: 12, paddingVertical: 10, gap: 6 },
  addDurationButtonText: { fontSize: 11, fontWeight: "800", color: PRIMARY },
  editorSlotTimeBox: { flexDirection: "row", alignItems: "center", flex: 1, gap: 7 },
  editorSlotTime: { fontSize: 12, fontWeight: "800", color: PRIMARY },
  editorSlotActions: { flexDirection: "row", gap: 6 },
  slotActionButton: { width: 32, height: 32, borderRadius: 9, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  deleteSlotButton: { backgroundColor: "#FDEBEC" },
  addSlotButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderStyle: "dashed", borderColor: "#D9B6D0", borderRadius: 12, paddingVertical: 10, marginTop: 3, gap: 6 },
  addSlotButtonText: { fontSize: 11, fontWeight: "800", color: PRIMARY },
  blockCalendarCard: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 10, marginTop: 4, borderWidth: 1, borderColor: "#F0DDEA" },
  blockedDatesSummary: { flexDirection: "row", alignItems: "center", backgroundColor: "#FDEBEC", borderRadius: 11, padding: 9, marginTop: 8, gap: 6 },
  blockedDatesText: { fontSize: 11, color: "#C0392B", fontWeight: "700" },
  saveAvailabilityButton: { backgroundColor: PRIMARY, borderRadius: 16, minHeight: 54, marginTop: 20, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, shadowColor: PRIMARY, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  saveAvailabilityText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  editorBottomSpace: { height: 30 },

  /** TIME PICKER */
  pickerOverlay: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "flex-end" },
  pickerCard: { backgroundColor: "#FFFFFF", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: Platform.OS === "ios" ? 30 : 20 },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  pickerTitle: { fontSize: 17, fontWeight: "800", color: "#1A1A1A" },
  pickerSubtitle: { fontSize: 11, color: "#888888", marginTop: 3 },
  timePicker: { alignSelf: "center", height: 180, width: "100%" },
  pickerPreview: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: PRIMARY_LIGHT, borderRadius: 13, paddingVertical: 12, marginTop: 5, gap: 7 },
  pickerPreviewText: { fontSize: 14, fontWeight: "800", color: PRIMARY },
  pickerButtons: { marginTop: 13 },
  pickerPrimaryButton: { backgroundColor: PRIMARY, borderRadius: 14, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  pickerPrimaryButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  pickerButtonsRow: { flexDirection: "row", gap: 10 },
  pickerBackButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderColor: PRIMARY, borderRadius: 14, minHeight: 50, paddingHorizontal: 18 },
  pickerBackButtonText: { color: PRIMARY, fontSize: 13, fontWeight: "800" },
  pickerPrimaryButtonFlex: { flex: 1, backgroundColor: PRIMARY, borderRadius: 14, minHeight: 50, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  copyDayButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, paddingVertical: 8 },
  copyDayButtonText: { fontSize: 11, fontWeight: "800", color: ACCENT },
  copyDayPanel: { backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#F0DDEA", padding: 12, marginTop: 6 },
  copyDayPanelTitle: { fontSize: 12, fontWeight: "800", color: "#333333", marginBottom: 9 },
  copyDayChipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  copyDayChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: "#E7D8E2", backgroundColor: "#FFFFFF" },
  copyDayChipActive: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  copyDayChipText: { fontSize: 11, fontWeight: "700", color: PRIMARY },
  copyDayChipTextActive: { color: "#FFFFFF" },
  copyDayActionsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  copyDayCancelButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: "#DDDDDD" },
  copyDayCancelText: { fontSize: 12, fontWeight: "700", color: "#666666" },
  copyDayApplyButton: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: PRIMARY },
  copyDayApplyButtonDisabled: { backgroundColor: "#D8B9CE" },
  copyDayApplyText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },
});