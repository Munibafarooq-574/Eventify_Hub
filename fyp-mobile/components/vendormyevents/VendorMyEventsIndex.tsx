import getVendorOrders from "@/services/getVendorOrders";
import getVendorAvailability from "@/services/getVendorAvailability";
import { getUserData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";

const { width } = Dimensions.get("window");

const PRIMARY = "#780C60";
const PRIMARY_LIGHT = "#F8E9F0";
const ACCENT = "#B84B9A";
const ACCENT_LIGHT = "#F0DDEA";

type ViewMode = "day" | "upcoming" | "month" | "past";

type WorkingDay = {
  day: string;
  enabled: boolean;
};

type TimeSlotConfig = {
  start: string;
  end: string;
};

type DaySlotConfig = {
  day: string;
  enabled: boolean;
  slots: TimeSlotConfig[];
};

type AvailabilitySettings = {
  workingDays?: WorkingDay[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  daySlots?: DaySlotConfig[];
  blockedDates?: string[];
  minimumAdvanceMinutes?: number;
  maxConcurrentBookings?: number;
};

type GeneratedSlot = {
  start: string;
  end: string;
  status: "available" | "booked";
  booking?: any;
};

const FILTERS: {
  key: ViewMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: "day",
    label: "Selected Day",
    icon: "today-outline",
  },
  {
    key: "upcoming",
    label: "Upcoming",
    icon: "arrow-forward-circle-outline",
  },
  {
    key: "month",
    label: "This Month",
    icon: "calendar-outline",
  },
  {
    key: "past",
    label: "Past",
    icon: "time-outline",
  },
];

/**
 * ---------------------------------------------------------
 * DATE / TIME HELPERS
 * ---------------------------------------------------------
 */

const toKey = (date: string | Date) => {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toISOString().split("T")[0];
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const parseTime = (time: string) => {
  const [h, m] = time.split(":").map(Number);

  const date = new Date();
  date.setHours(
    Number.isFinite(h) ? h : 0,
    Number.isFinite(m) ? m : 0,
    0,
    0
  );

  return date;
};

const addMinutes = (date: Date, minutes: number) => {
  return new Date(date.getTime() + minutes * 60000);
};

const minutesBetween = (start: string, end: string) => {
  const s = parseTime(start);
  const e = parseTime(end);

  return Math.max(0, (e.getTime() - s.getTime()) / 60000);
};

const formatMinutes = (minutes: number) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${mins} min`;
};

/**
 * ---------------------------------------------------------
 * STATUS HELPERS
 * ---------------------------------------------------------
 */

const getStatusColor = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "#D98B00";

    case "accepted":
      return "#278A4B";

    case "completed":
      return "#6B7280";

    case "cancelled":
    case "rejected":
    case "expired":
      return "#C0392B";

    default:
      return PRIMARY;
  }
};

const getStatusBackground = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "#FFF4D6";

    case "accepted":
      return "#E7F7EC";

    case "completed":
      return "#F0F1F3";

    case "cancelled":
    case "rejected":
    case "expired":
      return "#FDEBEC";

    default:
      return PRIMARY_LIGHT;
  }
};

/**
 * ---------------------------------------------------------
 * DAY CODE HELPER
 * ---------------------------------------------------------
 */

const getDayCode = (dateString: string) => {
  const day = new Date(`${dateString}T12:00:00`);

  const dayCodes = [
    "SUN",
    "MON",
    "TUE",
    "WED",
    "THU",
    "FRI",
    "SAT",
  ];

  return dayCodes[day.getDay()];
};

const MyEventsScreen = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const [orders, setOrders] = useState<any[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>("day");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [vendorId, setVendorId] = useState<string | null>(null);

  const [availability, setAvailability] =
    useState<AvailabilitySettings | null>(null);

  const [availabilityLoading, setAvailabilityLoading] =
    useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const todayKey = toKey(new Date());

  /**
   * ---------------------------------------------------------
   * LOAD EVENTS + AVAILABILITY
   * ---------------------------------------------------------
   */

  const fetchData = useCallback(async () => {
    try {
      const user = await getUserData();

      if (!user?._id) {
        throw new Error("Vendor user not found");
      }

      setVendorId(String(user._id));

      const [ordersData, availabilityData] = await Promise.all([
        getVendorOrders("Vendor", user._id),
        getVendorAvailability(user._id),
      ]);

      setOrders(Array.isArray(ordersData) ? ordersData : []);

      setAvailability(
        availabilityData || {}
      );
    } catch (error) {
      console.error("Error fetching vendor events:", error);
    } finally {
      setAvailabilityLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  /**
   * ---------------------------------------------------------
   * IMPORTANT:
   * GET THE CURRENT VENDOR'S OWN VENDOR ORDER
   *
   * This prevents Vendor A's status from being displayed
   * for Vendor B.
   * ---------------------------------------------------------
   */

  const getOwnVendorOrders = useCallback(
    (order: any): any[] => {
      if (!Array.isArray(order?.vendorOrders)) {
        return [];
      }

      /**
       * If backend already returns only this vendor's
       * vendorOrders, return them directly.
       */
      const ownOrders = order.vendorOrders.filter((vendorOrder: any) => {
        const currentVendorId = vendorOrder?.vendorId;

        const normalizedVendorId =
          typeof currentVendorId === "object"
            ? currentVendorId?._id
            : currentVendorId;

        if (!vendorId || !normalizedVendorId) {
          return false;
        }

        return (
          String(normalizedVendorId) === String(vendorId)
        );
      });

      /**
       * If vendorOrders are already filtered by backend
       * and vendorId isn't available inside them, fallback
       * to all vendorOrders returned.
       */
      if (ownOrders.length > 0) {
        return ownOrders;
      }

      return order.vendorOrders;
    },
    [vendorId]
  );

  /**
   * ---------------------------------------------------------
   * GET VENDOR-SPECIFIC STATUS
   * ---------------------------------------------------------
   *
   * Parent Order.status MUST NOT be blindly used here.
   *
   * Example:
   *
   * Order
   * ├── Vendor A → accepted
   * └── Vendor B → pending
   *
   * Vendor A screen must show "accepted"
   * Vendor B screen must show "pending"
   * ---------------------------------------------------------
   */

  const getVendorStatus = useCallback(
    (order: any) => {
      const ownVendorOrders = getOwnVendorOrders(order);

      if (ownVendorOrders.length > 0) {
        /**
         * Normally there should be one VendorOrder
         * for this vendor.
         *
         * If there are multiple services under the same vendor,
         * prioritize the first meaningful status.
         */
        const statuses = ownVendorOrders
          .map((vendorOrder: any) =>
            String(vendorOrder?.status || "").toLowerCase()
          )
          .filter(Boolean);

        if (statuses.includes("pending")) {
          return "pending";
        }

        if (statuses.includes("accepted")) {
          return "accepted";
        }

        if (statuses.includes("completed")) {
          return "completed";
        }

        if (statuses.includes("cancelled")) {
          return "cancelled";
        }

        if (statuses.includes("rejected")) {
          return "rejected";
        }

        if (statuses.includes("expired")) {
          return "expired";
        }

        return statuses[0] || order?.status;
      }

      /**
       * Legacy fallback.
       */
      return order?.status;
    },
    [getOwnVendorOrders]
  );

  /**
   * ---------------------------------------------------------
   * STATS
   * ---------------------------------------------------------
   */

  const stats = useMemo(() => {
    const now = new Date();

    const thisMonth = orders.filter((order) => {
      if (!order?.eventDate) {
        return false;
      }

      const d = new Date(order.eventDate);

      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    });

    const upcoming = orders.filter((order) => {
      if (!order?.eventDate) {
        return false;
      }

      return toKey(order.eventDate) >= todayKey;
    });

    /**
     * IMPORTANT:
     * Pending count now uses vendor-specific status.
     */
    const pending = orders.filter((order) => {
      return (
        String(getVendorStatus(order) || "").toLowerCase() ===
        "pending"
      );
    });

    return {
      total: orders.length,
      thisMonth: thisMonth.length,
      upcoming: upcoming.length,
      pending: pending.length,
    };
  }, [orders, todayKey, getVendorStatus]);

  /**
   * ---------------------------------------------------------
   * EVENTS FILTER
   * ---------------------------------------------------------
   */

  const events = useMemo(() => {
    const now = new Date();

    let list: any[] = [];

    if (viewMode === "day") {
      list = orders.filter(
        (order) =>
          order?.eventDate &&
          toKey(order.eventDate) === selectedDate
      );
    }

    if (viewMode === "upcoming") {
      list = orders
        .filter(
          (order) =>
            order?.eventDate &&
            toKey(order.eventDate) >= todayKey
        )
        .sort(
          (a, b) =>
            new Date(a.eventDate).getTime() -
            new Date(b.eventDate).getTime()
        );
    }

    if (viewMode === "month") {
      list = orders
        .filter((order) => {
          if (!order?.eventDate) {
            return false;
          }

          const d = new Date(order.eventDate);

          return (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          );
        })
        .sort(
          (a, b) =>
            new Date(a.eventDate).getTime() -
            new Date(b.eventDate).getTime()
        );
    }

    if (viewMode === "past") {
      list = orders
        .filter(
          (order) =>
            order?.eventDate &&
            toKey(order.eventDate) < todayKey
        )
        .sort(
          (a, b) =>
            new Date(b.eventDate).getTime() -
            new Date(a.eventDate).getTime()
        );
    }

    return list;
  }, [
    orders,
    viewMode,
    selectedDate,
    todayKey,
  ]);

  /**
   * ---------------------------------------------------------
   * AVAILABILITY HELPERS
   * ---------------------------------------------------------
   */

  const isBlockedDate = useCallback(
    (date: string) => {
      return (
        availability?.blockedDates?.some(
          (blockedDate) =>
            toKey(blockedDate) === date
        ) || false
      );
    },
    [availability]
  );

  /**
   * ---------------------------------------------------------
   * MULTI-SLOT WORKING DAY
   * ---------------------------------------------------------
   *
   * Priority:
   *
   * 1. daySlots
   * 2. legacy workingDays
   * 3. default true
   * ---------------------------------------------------------
   */

  const getDaySlotConfig = useCallback(
    (date: string) => {
      const dayCode = getDayCode(date);

      return availability?.daySlots?.find(
        (config) => config.day === dayCode
      );
    },
    [availability]
  );

  const isWorkingDay = useCallback(
    (date: string) => {
      /**
       * NEW MULTI-SLOT SYSTEM
       */
      if (availability?.daySlots?.length) {
        const config = getDaySlotConfig(date);

        /**
         * If this particular day exists in daySlots,
         * it becomes the source of truth.
         */
        if (config) {
          return config.enabled === true;
        }
      }

      /**
       * LEGACY SYSTEM
       */
      if (!availability?.workingDays?.length) {
        return true;
      }

      const code = getDayCode(date);

      const workingDay =
        availability.workingDays.find(
          (item) => item.day === code
        );

      return !!workingDay?.enabled;
    },
    [
      availability,
      getDaySlotConfig,
    ]
  );

  /**
   * ---------------------------------------------------------
   * SELECTED DAY BOOKINGS
   * ---------------------------------------------------------
   */

  const selectedDayBookings = useMemo(() => {
    return orders.filter(
      (order) =>
        order?.eventDate &&
        toKey(order.eventDate) === selectedDate
    );
  }, [orders, selectedDate]);

  /**
   * ---------------------------------------------------------
   * GET WORKING WINDOWS FOR SELECTED DAY
   * ---------------------------------------------------------
   */

  const selectedDayWindows = useMemo(() => {
    if (!availability) {
      return [];
    }

    /**
     * NEW MULTI-SLOT SYSTEM
     */
    if (availability.daySlots?.length) {
      const config = getDaySlotConfig(selectedDate);

      if (config) {
        if (!config.enabled) {
          return [];
        }

        return Array.isArray(config.slots)
          ? config.slots.filter(
              (slot) =>
                slot?.start &&
                slot?.end &&
                minutesBetween(
                  slot.start,
                  slot.end
                ) > 0
            )
          : [];
      }
    }

    /**
     * LEGACY FALLBACK
     */
    if (!isWorkingDay(selectedDate)) {
      return [];
    }

    const start =
      availability.workingHoursStart || "09:00";

    const end =
      availability.workingHoursEnd || "18:00";

    if (minutesBetween(start, end) <= 0) {
      return [];
    }

    return [
      {
        start,
        end,
      },
    ];
  }, [
    availability,
    selectedDate,
    getDaySlotConfig,
    isWorkingDay,
  ]);

  /**
   * ---------------------------------------------------------
   * DAY AVAILABILITY
   * ---------------------------------------------------------
   *
   * Supports:
   *
   * 09:00 - 13:00
   * 16:00 - 22:00
   *
   * Each working window generates 60-minute
   * presentation slots.
   * ---------------------------------------------------------
   */

  const dayAvailability = useMemo(() => {
    if (!availability) {
      return {
        isWorking: true,
        isBlocked: false,
        windows: [],
        slots: [] as GeneratedSlot[],
      };
    }

    const isWorking = isWorkingDay(selectedDate);
    const isBlocked = isBlockedDate(selectedDate);

    if (!isWorking || isBlocked) {
      return {
        isWorking,
        isBlocked,
        windows: [],
        slots: [] as GeneratedSlot[],
      };
    }

    const windows = selectedDayWindows;

    const SLOT_MINUTES = 60;

    const slots: GeneratedSlot[] = [];

    /**
     * Generate slots separately for every configured
     * working window.
     */
    windows.forEach((window) => {
      const start = parseTime(window.start);
      const end = parseTime(window.end);

      let cursor = start;

      while (cursor < end) {
        const slotEnd = addMinutes(
          cursor,
          SLOT_MINUTES
        );

        /**
         * Don't create a slot outside configured
         * working window.
         */
        if (slotEnd > end) {
          break;
        }

        const slotStartKey = cursor.getTime();
        const slotEndKey = slotEnd.getTime();

        /**
         * Find a booking overlapping this visual slot.
         */
        const booking =
          selectedDayBookings.find((order) => {
            if (
              !order?.eventStartDateTime ||
              !order?.eventEndDateTime
            ) {
              return false;
            }

            const bookingStart =
              new Date(
                order.eventStartDateTime
              ).getTime();

            const bookingEnd =
              new Date(
                order.eventEndDateTime
              ).getTime();

            if (
              Number.isNaN(bookingStart) ||
              Number.isNaN(bookingEnd)
            ) {
              return false;
            }

            return (
              bookingStart < slotEndKey &&
              bookingEnd > slotStartKey
            );
          });

        slots.push({
          start: formatTime(cursor),
          end: formatTime(slotEnd),
          status: booking
            ? "booked"
            : "available",
          booking,
        });

        cursor = slotEnd;
      }
    });

    return {
      isWorking,
      isBlocked,
      windows,
      slots,
    };
  }, [
    availability,
    selectedDate,
    selectedDayBookings,
    selectedDayWindows,
    isWorkingDay,
    isBlockedDate,
  ]);

  /**
   * ---------------------------------------------------------
   * CALENDAR MARKS
   * ---------------------------------------------------------
   */

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};

    /**
     * Booking dates
     */
    orders.forEach((order) => {
      if (!order?.eventDate) {
        return;
      }

      const key = toKey(order.eventDate);

      if (!key) {
        return;
      }

      marks[key] = {
        customStyles: {
          container: {
            backgroundColor: ACCENT,
            borderRadius: 9,
          },
          text: {
            color: "#FFFFFF",
            fontWeight: "800",
          },
        },
      };
    });

    /**
     * Blocked dates
     */
    availability?.blockedDates?.forEach(
      (date) => {
        const key = toKey(date);

        if (!key) {
          return;
        }

        marks[key] = {
          customStyles: {
            container: {
              backgroundColor: "#FDEBEC",
              borderRadius: 9,
              borderWidth: 1,
              borderColor: "#D9534F",
            },
            text: {
              color: "#C0392B",
              fontWeight: "800",
            },
          },
        };
      }
    );

    /**
     * Selected date wins.
     */
    marks[selectedDate] = {
      customStyles: {
        container: {
          backgroundColor: PRIMARY,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: "#FFFFFF",
        },
        text: {
          color: "#FFFFFF",
          fontWeight: "800",
        },
      },
    };

    return marks;
  }, [
    orders,
    selectedDate,
    availability,
  ]);

  /**
   * ---------------------------------------------------------
   * MONTH LABEL
   * ---------------------------------------------------------
   */

  const monthLabel = new Date(
    `${selectedDate}T12:00:00`
  ).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  /**
   * ---------------------------------------------------------
   * EXPAND
   * ---------------------------------------------------------
   */

  const toggleExpand = (id: string) => {
    setExpandedId((previous) =>
      previous === id ? null : id
    );
  };

  /**
   * ---------------------------------------------------------
   * LIST TITLE
   * ---------------------------------------------------------
   */

  const listTitle =
    viewMode === "day"
      ? new Date(
          `${selectedDate}T12:00:00`
        ).toDateString()
      : viewMode === "upcoming"
      ? "Upcoming Bookings"
      : viewMode === "month"
      ? `Bookings in ${monthLabel}`
      : "Past Bookings";

  /**
   * ---------------------------------------------------------
   * AVAILABILITY SUMMARY
   * ---------------------------------------------------------
   */

  const availableSlotCount =
    dayAvailability.slots.filter(
      (slot) =>
        slot.status === "available"
    ).length;

  const bookedSlotCount =
    dayAvailability.slots.filter(
      (slot) =>
        slot.status === "booked"
    ).length;

  /**
   * ---------------------------------------------------------
   * WORKING WINDOW LABEL
   * ---------------------------------------------------------
   */

  const workingHoursLabel = useMemo(() => {
    if (
      !dayAvailability.windows ||
      dayAvailability.windows.length === 0
    ) {
      return "No working hours";
    }

    return dayAvailability.windows
      .map(
        (window) =>
          `${window.start} - ${window.end}`
      )
      .join("  •  ");
  }, [dayAvailability.windows]);

  /**
   * ---------------------------------------------------------
   * TOTAL WORKING MINUTES
   * ---------------------------------------------------------
   */

  const totalWorkingMinutes = useMemo(() => {
    return dayAvailability.windows.reduce(
      (total, window) =>
        total +
        minutesBetween(
          window.start,
          window.end
        ),
      0
    );
  }, [dayAvailability.windows]);

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            My Events
          </Text>

          <Text style={styles.headerSubtitle}>
            Events & availability
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() =>
            router.push("/vendornotifications")
          }
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color="#FFFFFF"
          />

          <View style={styles.notificationDot} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) =>
          String(item?._id || item?.id)
        }
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={
          styles.listContent
        }
        ListHeaderComponent={
          <>
            {/* STATS */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={PRIMARY}
                  />
                </View>

                <Text style={styles.statValue}>
                  {stats.total}
                </Text>

                <Text style={styles.statLabel}>
                  Total
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={PRIMARY}
                  />
                </View>

                <Text style={styles.statValue}>
                  {stats.upcoming}
                </Text>

                <Text style={styles.statLabel}>
                  Upcoming
                </Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name="hourglass-outline"
                    size={18}
                    color={PRIMARY}
                  />
                </View>

                <Text style={styles.statValue}>
                  {stats.pending}
                </Text>

                <Text style={styles.statLabel}>
                  Pending
                </Text>
              </View>
            </View>

            {/* CALENDAR */}
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <View>
                  <Text
                    style={styles.calendarTitle}
                  >
                    Booking Calendar
                  </Text>

                  <Text
                    style={styles.calendarSubtitle}
                  >
                    Select a date to view your schedule
                  </Text>
                </View>

                <View style={styles.calendarIcon}>
                  <Ionicons
                    name="calendar"
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              <Calendar
                current={selectedDate}
                markedDates={markedDates}
                markingType="custom"
                onDayPress={(day) => {
                  setSelectedDate(
                    day.dateString
                  );
                  setViewMode("day");
                }}
                enableSwipeMonths
                theme={{
                  backgroundColor: "#FFFFFF",
                  calendarBackground: "#FFFFFF",
                  textSectionTitleColor:
                    "#9B9B9B",
                  todayTextColor: PRIMARY,
                  todayBackgroundColor:
                    PRIMARY_LIGHT,
                  dayTextColor: "#2D2D2D",
                  textDisabledColor:
                    "#D9D9D9",
                  arrowColor: PRIMARY,
                  monthTextColor: "#000000",
                  textDayFontWeight: "500",
                  textMonthFontWeight: "800",
                  textDayHeaderFontWeight:
                    "700",
                  textDayFontSize: 14,
                  textMonthFontSize: 17,
                  textDayHeaderFontSize: 12,
                }}
                style={styles.calendar}
              />

              {/* LEGEND */}
              <View style={styles.legendRow}>
                <View
                  style={[
                    styles.legendDot,
                    {
                      backgroundColor:
                        ACCENT,
                    },
                  ]}
                />

                <Text
                  style={styles.legendText}
                >
                  Booking
                </Text>

                <View
                  style={[
                    styles.legendDot,
                    {
                      backgroundColor:
                        "#FDEBEC",
                      borderWidth: 1,
                      borderColor:
                        "#D9534F",
                    },
                  ]}
                />

                <Text
                  style={styles.legendText}
                >
                  Unavailable
                </Text>

                <View
                  style={[
                    styles.legendDot,
                    {
                      backgroundColor:
                        PRIMARY,
                    },
                  ]}
                />

                <Text
                  style={styles.legendText}
                >
                  Selected
                </Text>
              </View>
            </View>

            {/* AVAILABILITY CARD */}
            <View
              style={
                styles.availabilityCard
              }
            >
              <View
                style={
                  styles.availabilityHeader
                }
              >
                <View
                  style={{ flex: 1 }}
                >
                  <Text
                    style={
                      styles.availabilityTitle
                    }
                  >
                    Your Availability
                  </Text>

                  <Text
                    style={
                      styles.availabilityDate
                    }
                  >
                    {new Date(
                      `${selectedDate}T12:00:00`
                    ).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      }
                    )}
                  </Text>
                </View>

                <View
                  style={[
                    styles.availabilityStatus,
                    dayAvailability.isWorking &&
                    !dayAvailability.isBlocked
                      ? styles.availableStatus
                      : styles.unavailableStatus,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          dayAvailability.isWorking &&
                          !dayAvailability.isBlocked
                            ? "#278A4B"
                            : "#C0392B",
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.availabilityStatusText,
                      {
                        color:
                          dayAvailability.isWorking &&
                          !dayAvailability.isBlocked
                            ? "#278A4B"
                            : "#C0392B",
                      },
                    ]}
                  >
                    {dayAvailability.isBlocked
                      ? "Blocked"
                      : !dayAvailability.isWorking
                      ? "Not Working"
                      : "Available"}
                  </Text>
                </View>
              </View>

              {availabilityLoading ? (
                <View
                  style={
                    styles.loadingAvailability
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color={PRIMARY}
                  />

                  <Text
                    style={styles.loadingText}
                  >
                    Loading availability...
                  </Text>
                </View>
              ) : dayAvailability.isBlocked ? (
                <View
                  style={
                    styles.unavailableMessage
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color="#C0392B"
                  />

                  <View
                    style={{ flex: 1 }}
                  >
                    <Text
                      style={
                        styles.messageTitle
                      }
                    >
                      Date blocked
                    </Text>

                    <Text
                      style={
                        styles.messageText
                      }
                    >
                      You have marked this date as
                      unavailable.
                    </Text>
                  </View>
                </View>
              ) : !dayAvailability.isWorking ? (
                <View
                  style={
                    styles.unavailableMessage
                  }
                >
                  <Ionicons
                    name="moon-outline"
                    size={24}
                    color="#C0392B"
                  />

                  <View
                    style={{ flex: 1 }}
                  >
                    <Text
                      style={
                        styles.messageTitle
                      }
                    >
                      Non-working day
                    </Text>

                    <Text
                      style={
                        styles.messageText
                      }
                    >
                      You are not accepting bookings
                      on this day.
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  {/* WORKING HOURS */}
                  <View
                    style={
                      styles.workingHoursCard
                    }
                  >
                    <View
                      style={
                        styles.workingHoursIcon
                      }
                    >
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={PRIMARY}
                      />
                    </View>

                    <View
                      style={{ flex: 1 }}
                    >
                      <Text
                        style={
                          styles.smallLabel
                        }
                      >
                        Working Hours
                      </Text>

                      <Text
                        style={
                          styles.workingHours
                        }
                      >
                        {workingHoursLabel}
                      </Text>

                      {totalWorkingMinutes >
                        0 && (
                        <Text
                          style={{
                            fontSize: 10,
                            color: "#8A8A8A",
                            marginTop: 3,
                          }}
                        >
                          {formatMinutes(
                            totalWorkingMinutes
                          )}{" "}
                          total
                        </Text>
                      )}
                    </View>

                    <Text
                      style={
                        styles.slotCount
                      }
                    >
                      {availableSlotCount} free
                    </Text>
                  </View>

                  {/* SLOT SUMMARY */}
                  <View
                    style={
                      styles.slotSummaryRow
                    }
                  >
                    <View
                      style={
                        styles.slotSummaryItem
                      }
                    >
                      <View
                        style={[
                          styles.summaryDot,
                          {
                            backgroundColor:
                              "#278A4B",
                          },
                        ]}
                      />

                      <Text
                        style={
                          styles.summaryText
                        }
                      >
                        {availableSlotCount}{" "}
                        Available
                      </Text>
                    </View>

                    <View
                      style={
                        styles.slotSummaryItem
                      }
                    >
                      <View
                        style={[
                          styles.summaryDot,
                          {
                            backgroundColor:
                              "#D98B00",
                          },
                        ]}
                      />

                      <Text
                        style={
                          styles.summaryText
                        }
                      >
                        {bookedSlotCount}{" "}
                        Booked
                      </Text>
                    </View>
                  </View>

                  {/* TIME SLOTS */}
                  <Text
                    style={
                      styles.slotSectionTitle
                    }
                  >
                    Today's Schedule
                  </Text>

                  {dayAvailability.slots
                    .length === 0 ? (
                    <View
                      style={styles.noSlots}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={24}
                        color="#9B9B9B"
                      />

                      <Text
                        style={
                          styles.noSlotsText
                        }
                      >
                        No time slots available.
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={
                        styles.slotsGrid
                      }
                    >
                      {dayAvailability.slots.map(
                        (slot, index) => {
                          const booked =
                            slot.status ===
                            "booked";

                          return (
                            <View
                              key={`${slot.start}-${slot.end}-${index}`}
                              style={[
                                styles.slotCard,
                                booked
                                  ? styles.bookedSlot
                                  : styles.freeSlot,
                              ]}
                            >
                              <View
                                style={[
                                  styles.slotIcon,
                                  booked
                                    ? styles.bookedSlotIcon
                                    : styles.freeSlotIcon,
                                ]}
                              >
                                <Ionicons
                                  name={
                                    booked
                                      ? "lock-closed-outline"
                                      : "checkmark-outline"
                                  }
                                  size={16}
                                  color={
                                    booked
                                      ? "#C0392B"
                                      : "#278A4B"
                                  }
                                />
                              </View>

                              <View
                                style={{
                                  flex: 1,
                                }}
                              >
                                <Text
                                  style={
                                    styles.slotTime
                                  }
                                >
                                  {slot.start} -{" "}
                                  {slot.end}
                                </Text>

                                <Text
                                  style={
                                    styles.slotStatus
                                  }
                                >
                                  {booked
                                    ? slot
                                        .booking
                                        ?.eventName ||
                                      "Booked"
                                    : "Available"}
                                </Text>
                              </View>
                            </View>
                          );
                        }
                      )}
                    </View>
                  )}

                  <Text
                    style={
                      styles.backendNote
                    }
                  >
                    Availability is checked again by
                    the system before a booking is
                    confirmed.
                  </Text>
                </>
              )}
            </View>

            {/* FILTERS */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filterRow
              }
            >
              {FILTERS.map((filter) => {
                const active =
                  viewMode === filter.key;

                return (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() =>
                      setViewMode(
                        filter.key
                      )
                    }
                    style={[
                      styles.filterChip,
                      active &&
                        styles.filterChipActive,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={filter.icon}
                      size={14}
                      color={
                        active
                          ? "#FFFFFF"
                          : PRIMARY
                      }
                    />

                    <Text
                      style={[
                        styles.filterChipText,
                        active &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* SECTION TITLE */}
            <View
              style={styles.sectionRow}
            >
              <View>
                <Text
                  style={styles.sectionTitle}
                >
                  {listTitle}
                </Text>

                {viewMode === "day" && (
                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    {monthLabel}
                  </Text>
                )}
              </View>

              <View
                style={styles.countBadge}
              >
                <Text
                  style={
                    styles.countBadgeText
                  }
                >
                  {events.length}{" "}
                  {events.length === 1
                    ? "Event"
                    : "Events"}
                </Text>
              </View>
            </View>
          </>
        }
        renderItem={({ item }) => {
          const id =
            String(item?._id || item?.id);

          const isExpanded =
            expandedId === id;

          /**
           * IMPORTANT:
           * Only calculate total from THIS vendor's
           * vendorOrders.
           */
          const ownVendorOrders =
            getOwnVendorOrders(item);

          const vendorTotal =
            ownVendorOrders.length > 0
              ? ownVendorOrders.reduce(
                  (
                    sum: number,
                    service: any
                  ) =>
                    sum +
                    Number(
                      service?.price || 0
                    ),
                  0
                )
              : Number(
                  item?.totalAmount || 0
                );

          /**
           * IMPORTANT:
           * Use vendor-specific status.
           */
          const vendorStatus =
            getVendorStatus(item);

          return (
            <TouchableOpacity
              style={styles.eventCard}
              activeOpacity={0.85}
              onPress={() =>
                toggleExpand(id)
              }
            >
              <View
                style={[
                  styles.eventAccentBar,
                  {
                    backgroundColor:
                      getStatusColor(
                        vendorStatus
                      ),
                  },
                ]}
              />

              <View
                style={styles.eventIconWrap}
              >
                <Ionicons
                  name="calendar"
                  size={22}
                  color={PRIMARY}
                />
              </View>

              <View
                style={styles.eventDetails}
              >
                <View
                  style={styles.eventTopRow}
                >
                  <View
                    style={{ flex: 1 }}
                  >
                    <Text
                      style={
                        styles.eventDate
                      }
                    >
                      {item?.eventDate
                        ? new Date(
                            item.eventDate
                          ).toDateString()
                        : "Date unavailable"}
                    </Text>

                    <Text
                      style={
                        styles.eventTitle
                      }
                      numberOfLines={1}
                    >
                      {item?.eventName ||
                        "Unnamed Event"}
                    </Text>
                  </View>

                  {!!vendorStatus && (
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            getStatusBackground(
                              vendorStatus
                            ),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDotSmall,
                          {
                            backgroundColor:
                              getStatusColor(
                                vendorStatus
                              ),
                          },
                        ]}
                      />

                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              getStatusColor(
                                vendorStatus
                              ),
                          },
                        ]}
                      >
                        {vendorStatus}
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={styles.metaRow}
                >
                  {!!item?.guests && (
                    <View
                      style={styles.eventMeta}
                    >
                      <Ionicons
                        name="people-outline"
                        size={15}
                        color={PRIMARY}
                      />

                      <Text
                        style={
                          styles.eventText
                        }
                      >
                        {item.guests} guests
                      </Text>
                    </View>
                  )}

                  {!!item?.eventTime && (
                    <View
                      style={styles.eventMeta}
                    >
                      <Ionicons
                        name="time-outline"
                        size={15}
                        color={PRIMARY}
                      />

                      <Text
                        style={
                          styles.eventText
                        }
                      >
                        {item.eventTime}
                      </Text>
                    </View>
                  )}
                </View>

                {isExpanded && (
                  <View
                    style={
                      styles.expandedBlock
                    }
                  >
                    <Text
                      style={
                        styles.expandedSubTitle
                      }
                    >
                      Event Details
                    </Text>

                    {!!item?.eventName && (
                      <View
                        style={
                          styles.eventMeta
                        }
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color={PRIMARY}
                        />

                        <Text
                          style={
                            styles.expandedText
                          }
                        >
                          Event Name:{" "}
                          {item.eventName}
                        </Text>
                      </View>
                    )}

                    {!!item?.eventType && (
                      <View
                        style={
                          styles.eventMeta
                        }
                      >
                        <Ionicons
                          name="pricetag-outline"
                          size={14}
                          color="#8A8A8A"
                        />

                        <Text
                          style={
                            styles.expandedText
                          }
                        >
                          Event Type:{" "}
                          {item.eventType}
                        </Text>
                      </View>
                    )}

                    {!!item?.eventDate && (
                      <View
                        style={
                          styles.eventMeta
                        }
                      >
                        <Ionicons
                          name="calendar-number-outline"
                          size={14}
                          color="#8A8A8A"
                        />

                        <Text
                          style={
                            styles.expandedText
                          }
                        >
                          Date:{" "}
                          {new Date(
                            item.eventDate
                          ).toDateString()}
                        </Text>
                      </View>
                    )}

                    {!!item?.guests && (
                      <View
                        style={
                          styles.eventMeta
                        }
                      >
                        <Ionicons
                          name="people-outline"
                          size={14}
                          color="#8A8A8A"
                        />

                        <Text
                          style={
                            styles.expandedText
                          }
                        >
                          Guests:{" "}
                          {item.guests}
                        </Text>
                      </View>
                    )}

                    <Text
                      style={
                        styles.expandedSubTitle
                      }
                    >
                      Booking Details
                    </Text>

                    {!!vendorTotal && (
                      <View
                        style={
                          styles.eventMeta
                        }
                      >
                        <Ionicons
                          name="cash-outline"
                          size={14}
                          color="#8A8A8A"
                        />

                        <Text
                          style={
                            styles.expandedText
                          }
                        >
                          Your Earnings: Rs.{" "}
                          {vendorTotal}
                        </Text>
                      </View>
                    )}

                    {!!vendorStatus && (
                      <View
                        style={
                          styles.eventMeta
                        }
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={14}
                          color="#8A8A8A"
                        />

                        <Text
                          style={[
                            styles.expandedText,
                            {
                              textTransform:
                                "capitalize",
                            },
                          ]}
                        >
                          Status:{" "}
                          {vendorStatus}
                        </Text>
                      </View>
                    )}

                    {ownVendorOrders.length >
                      0 && (
                      <>
                        <Text
                          style={
                            styles.expandedSubTitle
                          }
                        >
                          Services
                        </Text>

                        {ownVendorOrders.map(
                          (
                            service: any,
                            index: number
                          ) => (
                            <View
                              key={
                                service?._id ||
                                `${service?.serviceName}-${index}`
                              }
                              style={
                                styles.eventMeta
                              }
                            >
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={14}
                                color={PRIMARY}
                              />

                              <Text
                                style={
                                  styles.expandedText
                                }
                              >
                                {service?.serviceName ||
                                  "Service"}

                                {service?.price !=
                                  null
                                  ? ` - Rs. ${service.price}`
                                  : ""}
                              </Text>
                            </View>
                          )
                        )}
                      </>
                    )}
                  </View>
                )}
              </View>

              <Ionicons
                name={
                  isExpanded
                    ? "chevron-up"
                    : "chevron-forward"
                }
                size={20}
                color="#C6C6C6"
              />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View
            style={styles.emptyState}
          >
            <View
              style={
                styles.emptyIconCircle
              }
            >
              <Ionicons
                name="calendar-outline"
                size={34}
                color={PRIMARY}
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              {viewMode === "day"
                ? "No events on this day"
                : "No events found"}
            </Text>

            <Text
              style={
                styles.emptySubtitle
              }
            >
              {viewMode === "day"
                ? "Your availability is shown above. Select another date to view bookings."
                : "Try a different filter or check back later."}
            </Text>
          </View>
        }
      />

      <BottomNavigationFinal />
    </View>
  );
};

export default MyEventsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_LIGHT,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: PRIMARY,
    paddingTop:
      Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 22,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  notificationDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5A5F",
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },

  headerTitleWrap: {
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },

  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    marginBottom: 4,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0DDEA",
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 5,
  },

  statValue: {
    fontSize: 19,
    fontWeight: "800",
    color: PRIMARY,
  },

  statLabel: {
    fontSize: 10,
    color: "#8A8A8A",
    fontWeight: "600",
    marginTop: 2,
  },

  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginTop: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 5,
    paddingTop: 4,
    paddingBottom: 4,
  },

  calendarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
  },

  calendarSubtitle: {
    fontSize: 11,
    color: "#8A8A8A",
    marginTop: 3,
  },

  calendarIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },

  calendar: {
    borderRadius: 16,
  },

  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingHorizontal: 4,
    paddingTop: 5,
    gap: 6,
  },

  legendDot: {
    width: 11,
    height: 11,
    borderRadius: 4,
    marginLeft: 5,
  },

  legendText: {
    fontSize: 10,
    color: "#777",
    fontWeight: "600",
  },

  availabilityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0DDEA",
  },

  availabilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  availabilityTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
  },

  availabilityDate: {
    fontSize: 12,
    color: "#8A8A8A",
    marginTop: 3,
  },

  availabilityStatus: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  availableStatus: {
    backgroundColor: "#E7F7EC",
  },

  unavailableStatus: {
    backgroundColor: "#FDEBEC",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  availabilityStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },

  loadingAvailability: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 25,
  },

  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#777",
  },

  unavailableMessage: {
    marginTop: 14,
    backgroundColor: "#FDEBEC",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  messageTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7B2020",
  },

  messageText: {
    fontSize: 11,
    color: "#8A4A4A",
    marginTop: 3,
  },

  workingHoursCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },

  workingHoursIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  smallLabel: {
    fontSize: 10,
    color: "#8A8A8A",
    fontWeight: "600",
  },

  workingHours: {
    fontSize: 14,
    color: PRIMARY,
    fontWeight: "800",
    marginTop: 2,
  },

  slotCount: {
    fontSize: 11,
    color: "#278A4B",
    fontWeight: "800",
  },

  slotSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 16,
  },

  slotSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },

  summaryText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },

  slotSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#222",
    marginTop: 17,
    marginBottom: 9,
  },

  slotsGrid: {
    gap: 8,
  },

  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
    padding: 10,
    borderWidth: 1,
  },

  freeSlot: {
    backgroundColor: "#F1FBF4",
    borderColor: "#CBEAD3",
  },

  bookedSlot: {
    backgroundColor: "#FFF5F5",
    borderColor: "#F1C8C8",
  },

  slotIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  freeSlotIcon: {
    backgroundColor: "#DDF4E4",
  },

  bookedSlotIcon: {
    backgroundColor: "#FCE1E1",
  },

  slotTime: {
    fontSize: 12,
    fontWeight: "800",
    color: "#333",
  },

  slotStatus: {
    fontSize: 10,
    color: "#777",
    marginTop: 2,
  },

  noSlots: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },

  noSlotsText: {
    fontSize: 11,
    color: "#999",
    marginTop: 6,
  },

  backendNote: {
    fontSize: 9,
    lineHeight: 14,
    color: "#999",
    marginTop: 12,
  },

  filterRow: {
    gap: 8,
    marginTop: 16,
    paddingRight: 8,
  },

  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#F0DDEA",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
  },

  filterChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  filterChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: PRIMARY,
  },

  filterChipTextActive: {
    color: "#FFFFFF",
  },

  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#8A8A8A",
    marginTop: 2,
  },

  countBadge: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  eventCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
  },

  eventAccentBar: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 4,
    marginRight: 12,
  },

  eventIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  eventDetails: {
    flex: 1,
  },

  eventTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  eventDate: {
    fontSize: 11,
    color: "#9B9B9B",
    fontWeight: "600",
    marginBottom: 2,
  },

  eventTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 7,
  },

  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "capitalize",
  },

  metaRow: {
    flexDirection: "row",
    marginTop: 8,
    gap: 16,
  },

  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  eventText: {
    marginLeft: 5,
    color: "#555",
    fontSize: 12,
    fontWeight: "500",
  },

  expandedBlock: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor:
      "rgba(120,12,96,0.12)",
  },

  expandedText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#4A4A4A",
  },

  expandedSubTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY,
    marginTop: 6,
    textTransform: "uppercase",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 30,
  },

  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },

  emptySubtitle: {
    fontSize: 12,
    color: "#8A8A8A",
    textAlign: "center",
    lineHeight: 18,
  },
});