//fyp-mobile/components/vendormyevents/VendorMyEventsIndex.tsx
import getVendorOrders from "@/services/getVendorOrders";
import getVendorAvailability from "@/services/getVendorAvailability";
import { getUserData } from "@/store";

import { Ionicons } from "@expo/vector-icons";;
import { router } from "expo-router";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import VendorAvailabilityEditor from './VendorAvailabilityEditor';

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
  advanceNoticeOptionsMinutes?: number[];
};

type AvailabilitySettings = {
  workingDays?: WorkingDay[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  daySlots?: DaySlotConfig[];
  blockedDates?: string[];
  advanceNoticeOptionsMinutes?: number[];
  maxConcurrentBookings?: number;
};

type GeneratedSlot = {
  start: string;
  end: string;
  status: "available" | "booked";
  booking?: any;
};

const DAYS: { code: string; label: string }[] = [
  {
    code: "MON",
    label: "Monday",
  },
  {
    code: "TUE",
    label: "Tuesday",
  },
  {
    code: "WED",
    label: "Wednesday",
  },
  {
    code: "THU",
    label: "Thursday",
  },
  {
    code: "FRI",
    label: "Friday",
  },
  {
    code: "SAT",
    label: "Saturday",
  },
  {
    code: "SUN",
    label: "Sunday",
  },
];

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
 * =========================================================
 * DATE / TIME HELPERS
 * =========================================================
 */

const toKey = (date: string | Date) => {
  if (
    typeof date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(date)
  ) {
    return date;
  }

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

const formatDisplayTime = (time: string) => {
  const [h, m] = time.split(":").map(Number);

  if (
    !Number.isFinite(h) ||
    !Number.isFinite(m)
  ) {
    return time;
  }

  const date = new Date();

  date.setHours(h, m, 0, 0);

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

const parseTimeOnDate = (
  dateKey: string,
  time: string
) => {
  const [h, m] = time.split(":").map(Number);

  const date = new Date(`${dateKey}T00:00:00`);

  date.setHours(
    Number.isFinite(h) ? h : 0,
    Number.isFinite(m) ? m : 0,
    0,
    0
  );

  return date;
};

const toHHMM = (date: Date) => {
  return `${String(date.getHours()).padStart(
    2,
    "0"
  )}:${String(date.getMinutes()).padStart(
    2,
    "0"
  )}`;
};

const addMinutes = (
  date: Date,
  minutes: number
) => {
  return new Date(
    date.getTime() + minutes * 60000
  );
};

const minutesBetween = (
  start: string,
  end: string
) => {
  const s = parseTime(start);
  const e = parseTime(end);

  return Math.max(
    0,
    (e.getTime() - s.getTime()) / 60000
  );
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

const getDayCode = (dateString: string) => {
  const day = new Date(
    `${dateString}T12:00:00`
  );

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

/**
 * =========================================================
 * STATUS HELPERS
 * =========================================================
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

const getStatusBackground = (
  status?: string
) => {
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

const isBlockingBookingStatus = (
  status?: string
) => {
  const normalized = String(
    status || ""
  ).toLowerCase();

  return ![
    "cancelled",
    "rejected",
    "expired",
  ].includes(normalized);
};

/**
 * =========================================================
 * MAIN SCREEN
 * =========================================================
 */

const MyEventsScreen = () => {
  const [selectedDate, setSelectedDate] =
    useState<string>(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [orders, setOrders] = useState<any[]>(
    []
  );

  const [viewMode, setViewMode] =
    useState<ViewMode>("day");

  const [expandedId, setExpandedId] =
    useState<string | null>(null);

  const [vendorId, setVendorId] =
    useState<string | null>(null);

  const [availability, setAvailability] =
    useState<AvailabilitySettings | null>(
      null
    );

  const [availabilityLoading, setAvailabilityLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /**
   * =======================================================
   * AVAILABILITY EDITOR STATE
   * =======================================================
   */

  const [availabilityEditorVisible, setAvailabilityEditorVisible] = useState(false);
  const todayKey = toKey(new Date());

  /**
   * =========================================================
   * LOAD EVENTS + AVAILABILITY
   * =========================================================
   */

  const fetchData = useCallback(
    async () => {
      try {
        const user = await getUserData();

        if (!user?._id) {
          throw new Error(
            "Vendor user not found"
          );
        }

        setVendorId(String(user._id));

        const [
          ordersData,
          availabilityData,
        ] = await Promise.all([
          getVendorOrders(
            "Vendor",
            user._id
          ),
          getVendorAvailability(
            user._id
          ),
        ]);

        setOrders(
          Array.isArray(ordersData)
            ? ordersData
            : []
        );

        setAvailability(
          availabilityData || {}
        );
      } catch (error) {
        console.error(
          "Error fetching vendor events:",
          error
        );
      } finally {
        setAvailabilityLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);

    await fetchData();
  };

  /**
   * =========================================================
   * VENDOR-SPECIFIC ORDERS
   * =========================================================
   */

  const getOwnVendorOrders =
    useCallback(
      (order: any): any[] => {
        if (
          !Array.isArray(
            order?.vendorOrders
          )
        ) {
          return [];
        }

        const hasVendorIds =
          order.vendorOrders.some(
            (vendorOrder: any) => {
              return Boolean(
                vendorOrder?.vendorId?._id ||
                  vendorOrder?.vendorId
              );
            }
          );

        /**
         * If backend doesn't provide vendorId
         * inside vendorOrders, assume the response
         * has already been filtered for this vendor.
         */
        if (
          !vendorId ||
          !hasVendorIds
        ) {
          return order.vendorOrders;
        }

        return order.vendorOrders.filter(
          (vendorOrder: any) => {
            const currentVendorId =
              vendorOrder?.vendorId;

            const normalizedVendorId =
              typeof currentVendorId ===
              "object"
                ? currentVendorId?._id
                : currentVendorId;

            return (
              normalizedVendorId != null &&
              String(
                normalizedVendorId
              ) === String(vendorId)
            );
          }
        );
      },
      [vendorId]
    );

  /**
   * =========================================================
   * VENDOR-SPECIFIC STATUS
   * =========================================================
   */

  const getVendorStatus =
    useCallback(
      (order: any) => {
        const ownVendorOrders =
          getOwnVendorOrders(order);

        if (
          ownVendorOrders.length > 0
        ) {
          const statuses =
            ownVendorOrders
              .map((vendorOrder: any) =>
                String(
                  vendorOrder?.status || ""
                ).toLowerCase()
              )
              .filter(Boolean);

          /**
           * If multiple services belong to this vendor,
           * pending gets highest priority because the
           * vendor still has something waiting.
           */
          if (
            statuses.includes("pending")
          ) {
            return "pending";
          }

          if (
            statuses.includes("accepted")
          ) {
            return "accepted";
          }

          if (
            statuses.includes("completed")
          ) {
            return "completed";
          }

          if (
            statuses.includes("cancelled")
          ) {
            return "cancelled";
          }

          if (
            statuses.includes("rejected")
          ) {
            return "rejected";
          }

          if (
            statuses.includes("expired")
          ) {
            return "expired";
          }

          return (
            statuses[0] ||
            order?.status
          );
        }

        return order?.status;
      },
      [getOwnVendorOrders]
    );

  /**
   * =========================================================
   * STATS
   * =========================================================
   */

  const stats = useMemo(() => {
    const now = new Date();

    const thisMonth = orders.filter(
      (order) => {
        if (!order?.eventDate) {
          return false;
        }

        const d = new Date(
          order.eventDate
        );

        return (
          d.getMonth() ===
            now.getMonth() &&
          d.getFullYear() ===
            now.getFullYear()
        );
      }
    );

    const upcoming = orders.filter(
      (order) => {
        if (!order?.eventDate) {
          return false;
        }

        return (
          toKey(order.eventDate) >=
          todayKey
        );
      }
    );

    const pending = orders.filter(
      (order) => {
        return (
          String(
            getVendorStatus(order) || ""
          ).toLowerCase() === "pending"
        );
      }
    );

    return {
      total: orders.length,
      thisMonth: thisMonth.length,
      upcoming: upcoming.length,
      pending: pending.length,
    };
  }, [
    orders,
    todayKey,
    getVendorStatus,
  ]);

  /**
   * =========================================================
   * EVENTS FILTER
   * =========================================================
   */

  const events = useMemo(() => {
    const now = new Date();

    let list: any[] = [];

    if (viewMode === "day") {
      list = orders.filter(
        (order) =>
          order?.eventDate &&
          toKey(order.eventDate) ===
            selectedDate
      );
    }

    if (viewMode === "upcoming") {
      list = orders
        .filter(
          (order) =>
            order?.eventDate &&
            toKey(order.eventDate) >=
              todayKey
        )
        .sort(
          (a, b) =>
            new Date(
              a.eventDate
            ).getTime() -
            new Date(
              b.eventDate
            ).getTime()
        );
    }

    if (viewMode === "month") {
      list = orders
        .filter((order) => {
          if (!order?.eventDate) {
            return false;
          }

          const d = new Date(
            order.eventDate
          );

          return (
            d.getMonth() ===
              now.getMonth() &&
            d.getFullYear() ===
              now.getFullYear()
          );
        })
        .sort(
          (a, b) =>
            new Date(
              a.eventDate
            ).getTime() -
            new Date(
              b.eventDate
            ).getTime()
        );
    }

    if (viewMode === "past") {
      list = orders
        .filter(
          (order) =>
            order?.eventDate &&
            toKey(order.eventDate) <
              todayKey
        )
        .sort(
          (a, b) =>
            new Date(
              b.eventDate
            ).getTime() -
            new Date(
              a.eventDate
            ).getTime()
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
   * =========================================================
   * AVAILABILITY HELPERS
   * =========================================================
   */

  const isBlockedDate =
    useCallback(
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

  const getDaySlotConfig =
    useCallback(
      (date: string) => {
        const dayCode =
          getDayCode(date);

        return availability?.daySlots?.find(
          (config) =>
            config.day === dayCode
        );
      },
      [availability]
    );

  const isWorkingDay =
    useCallback(
      (date: string) => {
        if (
          availability?.daySlots
            ?.length
        ) {
          const config =
            getDaySlotConfig(date);

          if (config) {
            return (
              config.enabled === true
            );
          }
        }

        if (
          !availability?.workingDays
            ?.length
        ) {
          return true;
        }

        const code =
          getDayCode(date);

        const workingDay =
          availability.workingDays.find(
            (item) =>
              item.day === code
          );

        return !!workingDay?.enabled;
      },
      [
        availability,
        getDaySlotConfig,
      ]
    );

  /**
   * =========================================================
   * SELECTED DAY BOOKINGS
   * =========================================================
   */

  const selectedDayBookings =
    useMemo(() => {
      return orders.filter(
        (order) =>
          order?.eventDate &&
          toKey(order.eventDate) ===
            selectedDate
      );
    }, [
      orders,
      selectedDate,
    ]);

  /**
   * =========================================================
   * SELECTED DAY WINDOWS
   * =========================================================
   */

  const selectedDayWindows =
    useMemo(() => {
      if (!availability) {
        return [];
      }

      if (
        availability.daySlots
          ?.length
      ) {
        const config =
          getDaySlotConfig(
            selectedDate
          );

        if (config) {
          if (!config.enabled) {
            return [];
          }

          return Array.isArray(
            config.slots
          )
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

      if (
        !isWorkingDay(
          selectedDate
        )
      ) {
        return [];
      }

      const start =
        availability.workingHoursStart ||
        "09:00";

      const end =
        availability.workingHoursEnd ||
        "18:00";

      if (
        minutesBetween(
          start,
          end
        ) <= 0
      ) {
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
   * =========================================================
   * DAY AVAILABILITY
   * =========================================================
   */

  const dayAvailability =
    useMemo(() => {
      if (!availability) {
        return {
          isWorking: true,
          isBlocked: false,
          windows: [],
          slots: [] as GeneratedSlot[],
        };
      }
      const isWorking = isWorkingDay( selectedDate );
      const isBlocked = isBlockedDate( selectedDate);

      if ( !isWorking || isBlocked ) {
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

      windows.forEach(
        (workingWindow) => {
          const start =
            parseTimeOnDate(
              selectedDate,
              workingWindow.start
            );

          const end =
            parseTimeOnDate(
              selectedDate,
              workingWindow.end
            );

          let cursor = start;

          while (cursor < end) {
            const slotEnd =
              addMinutes(
                cursor,
                SLOT_MINUTES
              );

            if (
              slotEnd > end
            ) {
              break;
            }

            const slotStartKey =
              cursor.getTime();

            const slotEndKey =
              slotEnd.getTime();

            const booking =
              selectedDayBookings.find(
                (order) => {
                  const status =
                    getVendorStatus(
                      order
                    );

                  if (
                    !isBlockingBookingStatus(
                      status
                    )
                  ) {
                    return false;
                  }

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
                    Number.isNaN(
                      bookingStart
                    ) ||
                    Number.isNaN(
                      bookingEnd
                    )
                  ) {
                    return false;
                  }

                  return (
                    bookingStart <
                      slotEndKey &&
                    bookingEnd >
                      slotStartKey
                  );
                }
              );

            slots.push({
              start:
                formatTime(cursor),
              end:
                formatTime(slotEnd),
              status: booking
                ? "booked"
                : "available",
              booking,
            });

            cursor = slotEnd;
          }
        }
      );

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
      getVendorStatus,
    ]);

  /**
   * =========================================================
   * CALENDAR MARKS
   * =========================================================
   */

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      any
    > = {};

    orders.forEach((order) => {
      if (!order?.eventDate) {
        return;
      }

      const key = toKey(
        order.eventDate
      );

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

    availability?.blockedDates?.forEach(
      (date) => {
        const key = toKey(date);

        if (!key) {
          return;
        }

        marks[key] = {
          customStyles: {
            container: {
              backgroundColor:
                "#FDEBEC",
              borderRadius: 9,
              borderWidth: 1,
              borderColor:
                "#D9534F",
            },
            text: {
              color: "#C0392B",
              fontWeight: "800",
            },
          },
        };
      }
    );

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
   * =========================================================
   * MONTH
   * =========================================================
   */

  const monthLabel =
    new Date(
      `${selectedDate}T12:00:00`
    ).toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    );

  /**
   * =========================================================
   * AVAILABILITY SUMMARY
   * =========================================================
   */

  const availableSlotCount =
    dayAvailability.slots.filter(
      (slot) =>
        slot.status ===
        "available"
    ).length;

  const bookedSlotCount =
    dayAvailability.slots.filter(
      (slot) =>
        slot.status ===
        "booked"
    ).length;
const bookingNoticeLabel = useMemo(() => {
  if (!availability) return null;

  const config = getDaySlotConfig(selectedDate);

  const options =
    config &&
    Array.isArray(config.advanceNoticeOptionsMinutes) &&
    config.advanceNoticeOptionsMinutes.length > 0
      ? config.advanceNoticeOptionsMinutes
      : Array.isArray(availability.advanceNoticeOptionsMinutes)
        ? availability.advanceNoticeOptionsMinutes
        : [];

  if (options.length === 0) return 'No minimum notice';

  const minMinutes = Math.min(...options);

  if (minMinutes % 1440 === 0 && minMinutes >= 1440) {
    const days = minMinutes / 1440;

    return `Book at least ${days} ${
      days === 1 ? 'day' : 'days'
    } before`;
  }

  const hours = minMinutes / 60;

  return `Book at least ${
    hours % 1 === 0 ? hours : hours.toFixed(1)
  } ${hours === 1 ? 'hour' : 'hours'} before`;
}, [availability, selectedDate, getDaySlotConfig]);

  const workingHoursLabel =  useMemo(() => {
      if (
        !dayAvailability.windows ||
        dayAvailability.windows
          .length === 0
      ) {
        return "No configured slots";
      }

      return dayAvailability.windows
        .map(
          (workingWindow) =>
            `${formatDisplayTime(
              workingWindow.start
            )} - ${formatDisplayTime(
              workingWindow.end
            )}`
        )
        .join("  •  ");
    }, [
      dayAvailability.windows,
    ]);

  const totalWorkingMinutes =
    useMemo(() => {
      return dayAvailability.windows.reduce(
        (total, workingWindow) =>
          total +
          minutesBetween(
            workingWindow.start,
            workingWindow.end
          ),
        0
      );
    }, [
      dayAvailability.windows,
    ]);


  /**
   * =========================================================
   * TOGGLE EXPAND
   * =========================================================
   */

  const toggleExpand = (
    id: string
  ) => {
    setExpandedId(
      (previous) =>
        previous === id
          ? null
          : id
    );
  };

  /**
   * =========================================================
   * LIST TITLE
   * =========================================================
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
   * =========================================================
   * AVAILABILITY STATUS
   * =========================================================
   */

  const availabilityState =
    dayAvailability.isBlocked
      ? "Blocked"
      : !dayAvailability.isWorking
      ? "Not Working"
      : dayAvailability.slots
          .length === 0
      ? "No Slots"
      : "Available";

  const availabilityPositive =
    dayAvailability.isWorking &&
    !dayAvailability.isBlocked &&
    dayAvailability.slots
      .length > 0;

  /**
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <View
      style={
        styles.container
      }
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <View
        style={styles.header}
      >
        <TouchableOpacity
          style={
            styles.headerIconBtn
          }
          onPress={() =>
            router.back()
          }
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View
          style={
            styles.headerTitleWrap
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            My Events
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Events & availability
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.headerIconBtn
          }
          onPress={() =>
            router.push(
              "/vendornotifications"
            )
          }
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color="#FFFFFF"
          />

          <View
            style={
              styles.notificationDot
            }
          />
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        keyExtractor={(item) =>
          String(
            item?._id ||
              item?.id
          )
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshing={
          refreshing
        }
        onRefresh={
          onRefresh
        }
        contentContainerStyle={
          styles.listContent
        }
        ListHeaderComponent={
          <>
            {/* =================================================
                STATS
            ================================================== */}

            <View
              style={
                styles.statsRow
              }
            >
              <View
                style={
                  styles.statCard
                }
              >
                <View
                  style={
                    styles.statIcon
                  }
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={
                      PRIMARY
                    }
                  />
                </View>

                <Text
                  style={
                    styles.statValue
                  }
                >
                  {
                    stats.total
                  }
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Total
                </Text>
              </View>

              <View
                style={
                  styles.statCard
                }
              >
                <View
                  style={
                    styles.statIcon
                  }
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={
                      PRIMARY
                    }
                  />
                </View>

                <Text
                  style={
                    styles.statValue
                  }
                >
                  {
                    stats.upcoming
                  }
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Upcoming
                </Text>
              </View>

              <View
                style={
                  styles.statCard
                }
              >
                <View
                  style={
                    styles.statIcon
                  }
                >
                  <Ionicons
                    name="hourglass-outline"
                    size={18}
                    color={
                      PRIMARY
                    }
                  />
                </View>

                <Text
                  style={
                    styles.statValue
                  }
                >
                  {
                    stats.pending
                  }
                </Text>

                <Text
                  style={
                    styles.statLabel
                  }
                >
                  Pending
                </Text>
              </View>
            </View>

            {/* =================================================
                CALENDAR
            ================================================== */}

            <View
              style={
                styles.calendarCard
              }
            >
              <View
                style={
                  styles.calendarHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.calendarTitle
                    }
                  >
                    Booking Calendar
                  </Text>

                  <Text
                    style={
                      styles.calendarSubtitle
                    }
                  >
                    Select a date to view your schedule
                  </Text>
                </View>

                <View
                  style={
                    styles.calendarIcon
                  }
                >
                  <Ionicons
                    name="calendar"
                    size={20}
                    color="#FFFFFF"
                  />
                </View>
              </View>

              <Calendar
                current={
                  selectedDate
                }
                markedDates={
                  markedDates
                }
                markingType="custom"
                onDayPress={(
                  day
                ) => {
                  setSelectedDate(
                    day.dateString
                  );

                  setViewMode(
                    "day"
                  );
                }}
                enableSwipeMonths
                theme={{
                  backgroundColor:
                    "#FFFFFF",
                  calendarBackground:
                    "#FFFFFF",
                  textSectionTitleColor:
                    "#9B9B9B",
                  todayTextColor:
                    PRIMARY,
                  todayBackgroundColor:
                    PRIMARY_LIGHT,
                  dayTextColor:
                    "#2D2D2D",
                  textDisabledColor:
                    "#D9D9D9",
                  arrowColor:
                    PRIMARY,
                  monthTextColor:
                    "#000000",
                  textDayFontWeight:
                    "500",
                  textMonthFontWeight:
                    "800",
                  textDayHeaderFontWeight:
                    "700",
                  textDayFontSize:
                    14,
                  textMonthFontSize:
                    17,
                  textDayHeaderFontSize:
                    12,
                }}
                style={
                  styles.calendar
                }
              />

              <View
                style={
                  styles.legendRow
                }
              >
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
                  style={
                    styles.legendText
                  }
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
                  style={
                    styles.legendText
                  }
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
                  style={
                    styles.legendText
                  }
                >
                  Selected
                </Text>
              </View>
            </View>

            {/* =================================================
                AVAILABILITY CARD
            ================================================== */}

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
                  style={{
                    flex: 1,
                  }}
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
                        weekday:
                          "long",
                        month:
                          "short",
                        day: "numeric",
                      }
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.availabilityHeaderRight
                  }
                >
                  <View
                    style={[
                      styles.availabilityStatus,
                      availabilityPositive
                        ? styles.availableStatus
                        : styles.unavailableStatus,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            availabilityPositive
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
                            availabilityPositive
                              ? "#278A4B"
                              : "#C0392B",
                        },
                      ]}
                    >
                      {
                        availabilityState
                      }
                    </Text>
                  </View>
                  <TouchableOpacity
                  style={styles.editAvailabilityButton}
                  onPress={() => setAvailabilityEditorVisible(true)}
                  activeOpacity={0.8}>
                    <Ionicons
                      name="create-outline"
                      size={15}
                      color="#FFFFFF"/>
                    <Text
                      style={ styles.editAvailabilityText } >
                      Edit
                    </Text>
                  </TouchableOpacity>
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
                    color={
                      PRIMARY
                    }
                  />

                  <Text
                    style={
                      styles.loadingText
                    }
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
                    style={{
                      flex: 1,
                    }}
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
                      You have marked this date as unavailable.
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
                    style={{
                      flex: 1,
                    }}
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
                      You are not accepting bookings on this day.
                    </Text>
                  </View>
                </View>
              ) : (
                <>
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
                        color={
                          PRIMARY
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
                        {
                          workingHoursLabel
                        }
                      </Text>

                      {totalWorkingMinutes >
                        0 && (
                        <Text
                          style={
                            styles.totalMinutesText
                          }
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
                      {
                        availableSlotCount
                      }{" "}
                      free
                    </Text>
                  </View>

{bookingNoticeLabel && (
  <View style={styles.workingHoursCard}>
    <View style={styles.workingHoursIcon}>
      <Ionicons
        name="notifications-outline"
        size={18}
        color={PRIMARY}
      />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.smallLabel}>
        Booking Notice
      </Text>

      <Text style={styles.workingHours}>
        {bookingNoticeLabel}
      </Text>
    </View>
  </View>
)}
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
                        {
                          availableSlotCount
                        }{" "}
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
                        {
                          bookedSlotCount
                        }{" "}
                        Booked
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.slotSectionTitle
                    }
                  >
                    Today's Schedule
                  </Text>

                  {dayAvailability.slots
                    .length ===
                  0 ? (
                    <View
                      style={
                        styles.noSlots
                      }
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
                        (
                          slot,
                          index
                        ) => {
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
                                  size={
                                    16
                                  }
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
                                  {
                                    slot.start
                                  }{" "}
                                  -{" "}
                                  {
                                    slot.end
                                  }
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
                    Availability is checked again by the system before a booking is confirmed.
                  </Text>
                </>
              )}
            </View>

            {/* =================================================
                FILTERS
            ================================================== */}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filterRow
              }
            >
              {FILTERS.map(
                (filter) => {
                  const active =
                    viewMode ===
                    filter.key;

                  return (
                    <TouchableOpacity
                      key={
                        filter.key
                      }
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
                      activeOpacity={
                        0.8
                      }
                    >
                      <Ionicons
                        name={
                          filter.icon
                        }
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
                        {
                          filter.label
                        }
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>

            {/* =================================================
                SECTION TITLE
            ================================================== */}

            <View
              style={
                styles.sectionRow
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  {
                    listTitle
                  }
                </Text>

                {viewMode ===
                  "day" && (
                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    {
                      monthLabel
                    }
                  </Text>
                )}
              </View>

              <View
                style={
                  styles.countBadge
                }
              >
                <Text
                  style={
                    styles.countBadgeText
                  }
                >
                  {
                    events.length
                  }{" "}
                  {events.length ===
                  1
                    ? "Event"
                    : "Events"}
                </Text>
              </View>
            </View>
          </>
        }
        renderItem={({
          item,
        }) => {
          const id =
            String(
              item?._id ||
                item?.id
            );

          const isExpanded =
            expandedId ===
            id;

          const ownVendorOrders =
            getOwnVendorOrders(
              item
            );

          const vendorTotal =
            ownVendorOrders.length >
            0
              ? ownVendorOrders.reduce(
                  (
                    sum: number,
                    service: any
                  ) =>
                    sum +
                    Number(
                      service?.price ||
                        0
                    ),
                  0
                )
              : Number(
                  item?.totalAmount ||
                    0
                );

          const vendorStatus =
            getVendorStatus(
              item
            );

          return (
            <TouchableOpacity
              style={
                styles.eventCard
              }
              activeOpacity={
                0.85
              }
              onPress={() =>
                toggleExpand(
                  id
                )
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
                style={
                  styles.eventIconWrap
                }
              >
                <Ionicons
                  name="calendar"
                  size={22}
                  color={
                    PRIMARY
                  }
                />
              </View>

              <View
                style={
                  styles.eventDetails
                }
              >
                <View
                  style={
                    styles.eventTopRow
                  }
                >
                  <View
                    style={{
                      flex: 1,
                    }}
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
                      numberOfLines={
                        1
                      }
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
                        {
                          vendorStatus
                        }
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={
                    styles.metaRow
                  }
                >
                  {!!item?.guests && (
                    <View
                      style={
                        styles.eventMeta
                      }
                    >
                      <Ionicons
                        name="people-outline"
                        size={15}
                        color={
                          PRIMARY
                        }
                      />

                      <Text
                        style={
                          styles.eventText
                        }
                      >
                        {
                          item.guests
                        }{" "}
                        guests
                      </Text>
                    </View>
                  )}

                  {!!item?.eventTime && (
                    <View
                      style={
                        styles.eventMeta
                      }
                    >
                      <Ionicons
                        name="time-outline"
                        size={15}
                        color={
                          PRIMARY
                        }
                      />

                      <Text
                        style={
                          styles.eventText
                        }
                      >
                        {
                          item.eventTime
                        }
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
                          color={
                            PRIMARY
                          }
                        />

                        <Text
                          style={
                            styles.expandedText
                          }
                        >
                          Event Name:{" "}
                          {
                            item.eventName
                          }
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
                          {
                            item.eventType
                          }
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
                          {
                            item.guests
                          }
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
                          {
                            vendorTotal
                          }
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
                          {
                            vendorStatus
                          }
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
                                color={
                                  PRIMARY
                                }
                              />

                              <Text
                                style={
                                  styles.expandedText
                                }
                              >
                                {
                                  service?.serviceName ||
                                  "Service"
                                }

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
            style={
              styles.emptyState
            }
          >
            <View
              style={
                styles.emptyIconCircle
              }
            >
              <Ionicons
                name="calendar-outline"
                size={34}
                color={
                  PRIMARY
                }
              />
            </View>

            <Text
              style={
                styles.emptyTitle
              }
            >
              {viewMode ===
              "day"
                ? "No events on this day"
                : "No events found"}
            </Text>

            <Text
              style={
                styles.emptySubtitle
              }
            >
              {viewMode ===
              "day"
                ? "Your availability is shown above. Select another date to view bookings."
                : "Try a different filter or check back later."}
            </Text>
          </View>
        }
      />

      <BottomNavigationFinal />

      <VendorAvailabilityEditor
  visible={availabilityEditorVisible}
  vendorId={vendorId}
  availability={availability}
  selectedDate={selectedDate}
  onClose={() => setAvailabilityEditorVisible(false)}
  onSaved={({ daySlots, blockedDates }) => {
    setAvailability((prev) => ({
      ...(prev || {}),
      daySlots,
      blockedDates,
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

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        PRIMARY_LIGHT,
    },

    bookingNoticeCard: {
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#F0DDEA",
  padding: 13,
  marginTop: 4,
},

bookingNoticeHeader: {
  flexDirection: "row",
  alignItems: "center",
  gap: 7,
},

bookingNoticeTitle: {
  fontSize: 13,
  fontWeight: "800",
  color: "#333333",
},

bookingNoticeDescription: {
  fontSize: 11,
  color: "#888888",
  marginTop: 5,
  marginBottom: 10,
},

noticeChipsRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 10,
},

noticeChip: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: PRIMARY_LIGHT,
  borderWidth: 1,
  borderColor: ACCENT_LIGHT,
  borderRadius: 20,
  paddingVertical: 7,
  paddingHorizontal: 10,
  gap: 6,
},

noticeChipText: {
  fontSize: 11,
  fontWeight: "700",
  color: PRIMARY,
},

addNoticeButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1.5,
  borderStyle: "dashed",
  borderColor: "#D9B6D0",
  borderRadius: 12,
  paddingVertical: 10,
  gap: 6,
},

addNoticeButtonText: {
  fontSize: 11,
  fontWeight: "800",
  color: PRIMARY,
},
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      backgroundColor:
        PRIMARY,
      paddingTop:
        Platform.OS === "ios"
          ? 60
          : 40,
      paddingBottom: 22,
      paddingHorizontal: 18,
      borderBottomLeftRadius:
        26,
      borderBottomRightRadius:
        26,
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
      justifyContent:
        "center",
      alignItems: "center",
    },

    notificationDot: {
      position:
        "absolute",
      top: 8,
      right: 9,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor:
        "#FF5A5F",
      borderWidth: 1.5,
      borderColor:
        PRIMARY,
    },

    headerTitleWrap: {
      alignItems:
        "center",
    },

    headerTitle: {
      fontSize: 19,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    headerSubtitle: {
      fontSize: 12,
      color:
        "rgba(255,255,255,0.75)",
      marginTop: 2,
    },

    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 110,
    },

    statsRow: {
      flexDirection:
        "row",
      gap: 10,
      marginTop: 18,
      marginBottom: 4,
    },

    statCard: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      paddingVertical: 12,
      alignItems:
        "center",
      borderWidth: 1,
      borderColor:
        "#F0DDEA",
    },

    statIcon: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor:
        PRIMARY_LIGHT,
      justifyContent:
        "center",
      alignItems:
        "center",
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
      backgroundColor:
        "#FFFFFF",
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
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
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
      backgroundColor:
        PRIMARY,
      justifyContent:
        "center",
      alignItems:
        "center",
    },

    calendar: {
      borderRadius: 16,
    },

    legendRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
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
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      marginTop: 14,
      padding: 16,
      borderWidth: 1,
      borderColor:
        "#F0DDEA",
    },

    availabilityHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    availabilityHeaderRight: {
      alignItems:
        "flex-end",
      gap: 7,
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
      flexDirection:
        "row",
      alignItems:
        "center",
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },

    availableStatus: {
      backgroundColor:
        "#E7F7EC",
    },

    unavailableStatus: {
      backgroundColor:
        "#FDEBEC",
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

    editAvailabilityButton: {
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        PRIMARY,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 12,
      gap: 4,
    },

    editAvailabilityText: {
      color: "#FFFFFF",
      fontSize: 10,
      fontWeight: "800",
    },

    loadingAvailability: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingVertical: 25,
    },

    loadingText: {
      marginLeft: 8,
      fontSize: 12,
      color: "#777",
    },

    unavailableMessage: {
      marginTop: 14,
      backgroundColor:
        "#FDEBEC",
      borderRadius: 14,
      padding: 14,
      flexDirection:
        "row",
      alignItems:
        "center",
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
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        PRIMARY_LIGHT,
      borderRadius: 14,
      padding: 12,
      marginTop: 14,
    },

    workingHoursIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor:
        "#FFFFFF",
      justifyContent:
        "center",
      alignItems:
        "center",
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
      lineHeight: 20,
    },

    totalMinutesText: {
      fontSize: 10,
      color: "#8A8A8A",
      marginTop: 3,
    },

    slotCount: {
      fontSize: 11,
      color: "#278A4B",
      fontWeight: "800",
    },

    slotSummaryRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 12,
      gap: 16,
    },

    slotSummaryItem: {
      flexDirection:
        "row",
      alignItems:
        "center",
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
      flexDirection:
        "row",
      alignItems:
        "center",
      borderRadius: 13,
      padding: 10,
      borderWidth: 1,
    },

    freeSlot: {
      backgroundColor:
        "#F1FBF4",
      borderColor:
        "#CBEAD3",
    },

    bookedSlot: {
      backgroundColor:
        "#FFF5F5",
      borderColor:
        "#F1C8C8",
    },

    slotIcon: {
      width: 32,
      height: 32,
      borderRadius: 9,
      justifyContent:
        "center",
      alignItems:
        "center",
      marginRight: 9,
    },

    freeSlotIcon: {
      backgroundColor:
        "#DDF4E4",
    },

    bookedSlotIcon: {
      backgroundColor:
        "#FCE1E1",
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
      alignItems:
        "center",
      justifyContent:
        "center",
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
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 6,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1.5,
      borderColor:
        "#F0DDEA",
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
    },

    filterChipActive: {
      backgroundColor:
        PRIMARY,
      borderColor:
        PRIMARY,
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
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
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
      backgroundColor:
        PRIMARY,
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
      flexDirection:
        "row",
      backgroundColor:
        "#FFFFFF",
      padding: 14,
      borderRadius: 16,
      alignItems:
        "center",
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
      alignSelf:
        "stretch",
      borderRadius: 4,
      marginRight: 12,
    },

    eventIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor:
        PRIMARY_LIGHT,
      justifyContent:
        "center",
      alignItems:
        "center",
      marginRight: 12,
    },

    eventDetails: {
      flex: 1,
    },

    eventTopRow: {
      flexDirection:
        "row",
      alignItems:
        "flex-start",
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
      flexDirection:
        "row",
      alignItems:
        "center",
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
      textTransform:
        "capitalize",
    },

    metaRow: {
      flexDirection:
        "row",
      marginTop: 8,
      gap: 16,
    },

    eventMeta: {
      flexDirection:
        "row",
      alignItems:
        "center",
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
      textTransform:
        "uppercase",
    },

    emptyState: {
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingVertical: 40,
      paddingHorizontal: 30,
    },

    emptyIconCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor:
        PRIMARY_LIGHT,
      justifyContent:
        "center",
      alignItems:
        "center",
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
      textAlign:
        "center",
      lineHeight: 18,
    },

    /**
     * =======================================================
     * AVAILABILITY EDITOR
     * =======================================================
     */

    editorContainer: {
      flex: 1,
      backgroundColor:
        PRIMARY_LIGHT,
    },

    editorHeader: {
      backgroundColor:
        PRIMARY,
      paddingTop:
        Platform.OS === "ios"
          ? 55
          : 25,
      paddingHorizontal: 16,
      paddingBottom: 18,
      flexDirection:
        "row",
      alignItems:
        "center",
      borderBottomLeftRadius:
        24,
      borderBottomRightRadius:
        24,
    },

    editorCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    editorHeaderTitleWrap: {
      flex: 1,
      marginLeft: 12,
    },

    editorTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    editorSubtitle: {
      fontSize: 11,
      color:
        "rgba(255,255,255,0.72)",
      marginTop: 3,
    },

    editorHeaderIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor:
        "rgba(255,255,255,0.15)",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    editorContent: {
      padding: 16,
      paddingBottom: 40,
    },

    editorInfoCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 16,
      padding: 13,
      flexDirection:
        "row",
      alignItems:
        "center",
      borderWidth: 1,
      borderColor:
        "#F0DDEA",
      marginBottom: 18,
    },

    editorInfoIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor:
        PRIMARY_LIGHT,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    editorInfoText: {
      flex: 1,
      fontSize: 11,
      lineHeight: 17,
      color: "#666666",
    },

    editorSectionTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#1A1A1A",
      marginBottom: 5,
      marginTop: 4,
    },

    editorSectionDescription: {
      fontSize: 11,
      color: "#888888",
      lineHeight: 16,
      marginBottom: 10,
    },

    dayEditorCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 17,
      marginBottom: 10,
      borderWidth: 1,
      borderColor:
        "#E9E9E9",
      overflow: "hidden",
    },

    dayEditorCardActive: {
      borderColor:
        "#E4C7DC",
    },

    dayEditorHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      padding: 13,
    },

    dayTitleRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    dayIconCircle: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    dayIconActive: {
      backgroundColor:
        PRIMARY,
    },

    dayIconInactive: {
      backgroundColor:
        "#EEEEEE",
    },

    dayName: {
      fontSize: 14,
      fontWeight: "800",
      color: "#222222",
    },

    dayStatus: {
      fontSize: 10,
      color: "#8A8A8A",
      marginTop: 2,
    },

    daySlotsEditor: {
      borderTopWidth: 1,
      borderTopColor:
        "#F0F0F0",
      padding: 12,
      backgroundColor:
        "#FCFCFC",
    },

    noEditorSlots: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingVertical: 13,
      gap: 6,
    },

    noEditorSlotsText: {
      fontSize: 11,
      color: "#999999",
    },

    editorSlotRow: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: PRIMARY_LIGHT,
  borderRadius: 12,
  padding: 9,
  marginBottom: 7,
},

maxDurationSection: {
  marginTop: 12,
  paddingTop: 12,
  borderTopWidth: 1,
  borderTopColor: "#F0E4ED",
},

maxDurationHeader: {
  marginBottom: 10,
},

maxDurationLabelWrap: {
  flexDirection: "row",
  alignItems: "center",
},

maxDurationLabel: {
  fontSize: 12,
  fontWeight: "700",
  color: "#555555",
  marginLeft: 7,
},

durationChipsRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 10,
},

durationChip: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: PRIMARY_LIGHT,
  borderWidth: 1,
  borderColor: ACCENT_LIGHT,
  borderRadius: 20,
  paddingVertical: 7,
  paddingHorizontal: 11,
  gap: 6,
},

durationChipText: {
  fontSize: 12,
  fontWeight: "700",
  color: PRIMARY,
},

addDurationButton: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1.5,
  borderStyle: "dashed",
  borderColor: "#D9B6D0",
  borderRadius: 12,
  paddingVertical: 10,
  gap: 6,
},

addDurationButtonText: {
  fontSize: 11,
  fontWeight: "800",
  color: PRIMARY,
},

editorSlotTimeBox: {
      flexDirection:
        "row",
      alignItems:
        "center",
      flex: 1,
      gap: 7,
    },

    editorSlotTime: {
      fontSize: 12,
      fontWeight: "800",
      color: PRIMARY,
    },

    editorSlotActions: {
      flexDirection:
        "row",
      gap: 6,
    },

    slotActionButton: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    deleteSlotButton: {
      backgroundColor:
        "#FDEBEC",
    },

    addSlotButton: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1.5,
      borderStyle:
        "dashed",
      borderColor:
        "#D9B6D0",
      borderRadius: 12,
      paddingVertical: 10,
      marginTop: 3,
      gap: 6,
    },

    addSlotButtonText: {
      fontSize: 11,
      fontWeight: "800",
      color: PRIMARY,
    },

    blockCalendarCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 10,
      marginTop: 4,
      borderWidth: 1,
      borderColor:
        "#F0DDEA",
    },

    blockedDatesSummary: {
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        "#FDEBEC",
      borderRadius: 11,
      padding: 9,
      marginTop: 8,
      gap: 6,
    },

    blockedDatesText: {
      fontSize: 11,
      color: "#C0392B",
      fontWeight: "700",
    },

    saveAvailabilityButton: {
      backgroundColor:
        PRIMARY,
      borderRadius: 16,
      minHeight: 54,
      marginTop: 20,
      alignItems:
        "center",
      justifyContent:
        "center",
      flexDirection:
        "row",
      gap: 8,
      shadowColor: PRIMARY,
      shadowOffset: {
        width: 0,
        height: 5,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },

    saveAvailabilityText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },

    editorBottomSpace: {
      height: 30,
    },

    /**
     * =======================================================
     * TIME PICKER
     * =======================================================
     */

    pickerOverlay: {
      position:
        "absolute",
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor:
        "rgba(0,0,0,0.42)",
      justifyContent:
        "flex-end",
    },

    pickerCard: {
      backgroundColor:
        "#FFFFFF",
      borderTopLeftRadius:
        26,
      borderTopRightRadius:
        26,
      padding: 18,
      paddingBottom:
        Platform.OS ===
        "ios"
          ? 30
          : 20,
    },

    pickerHeader: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      marginBottom: 10,
    },

    pickerTitle: {
      fontSize: 17,
      fontWeight: "800",
      color: "#1A1A1A",
    },

    pickerSubtitle: {
      fontSize: 11,
      color: "#888888",
      marginTop: 3,
    },

        timePicker: {
      alignSelf: "center",
      height: 180,
      width: "100%",
    },

    pickerPreview: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        PRIMARY_LIGHT,
      borderRadius: 13,
      paddingVertical: 12,
      marginTop: 5,
      gap: 7,
    },

    pickerPreviewText: {
      fontSize: 14,
      fontWeight: "800",
      color: PRIMARY,
    },

    pickerButtons: {
      marginTop: 13,
    },

    pickerPrimaryButton: {
      backgroundColor:
        PRIMARY,
      borderRadius: 14,
      minHeight: 50,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 7,
    },

    pickerPrimaryButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },

        pickerButtonsRow: {
      flexDirection: "row",
      gap: 10,
    },

    pickerBackButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      borderWidth: 1.5,
      borderColor: PRIMARY,
      borderRadius: 14,
      minHeight: 50,
      paddingHorizontal: 18,
    },

    pickerBackButtonText: {
      color: PRIMARY,
      fontSize: 13,
      fontWeight: "800",
    },

    pickerPrimaryButtonFlex: {
      flex: 1,
      backgroundColor: PRIMARY,
      borderRadius: 14,
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },

    copyDayButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 8,
      paddingVertical: 8,
    },

    copyDayButtonText: {
      fontSize: 11,
      fontWeight: "800",
      color: ACCENT,
    },

    copyDayPanel: {
      backgroundColor: "#FFFFFF",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#F0DDEA",
      padding: 12,
      marginTop: 6,
    },

    copyDayPanelTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: "#333333",
      marginBottom: 9,
    },

    copyDayChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
    },

    copyDayChip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: "#E7D8E2",
      backgroundColor: "#FFFFFF",
    },

    copyDayChipActive: {
      backgroundColor: PRIMARY,
      borderColor: PRIMARY,
    },

    copyDayChipText: {
      fontSize: 11,
      fontWeight: "700",
      color: PRIMARY,
    },

    copyDayChipTextActive: {
      color: "#FFFFFF",
    },

    copyDayActionsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 12,
    },

    copyDayCancelButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: "#DDDDDD",
    },

    copyDayCancelText: {
      fontSize: 12,
      fontWeight: "700",
      color: "#666666",
    },

    copyDayApplyButton: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: PRIMARY,
    },

    copyDayApplyButtonDisabled: {
      backgroundColor: "#D8B9CE",
    },

    copyDayApplyText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },
  });