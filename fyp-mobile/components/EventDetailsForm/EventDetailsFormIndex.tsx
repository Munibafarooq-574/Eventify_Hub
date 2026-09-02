import getAllCategories from "@/services/getAllCategories";
import { saveSecureData } from "@/store";
import { useVendorsAvailability } from "@/hooks/useVendorsAvailability";

import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import React, { useEffect, useMemo, useState } from "react";

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
} from "react-native";

import { Calendar } from "react-native-calendars";
import { ICategory } from "../dashboard/CategoryGrid";

const PRIMARY = "#780C60";
const PRIMARY_LIGHT = "#F8E9F0";
const ACCENT = "#B84B9A";

const DURATION_OPTIONS = [
  {
    label: "1 hour",
    value: 60,
  },
  {
    label: "2 hours",
    value: 120,
  },
  {
    label: "3 hours",
    value: 180,
  },
  {
    label: "4 hours",
    value: 240,
  },
  {
    label: "5 hours",
    value: 300,
  },
  {
    label: "6 hours",
    value: 360,
  },
];

const formatTime = (date: Date) => {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const timeToHHMM = (date: Date) => {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  return `${hours}h ${mins}m`;
};

const PersonalizedExperienceScreen: React.FC = () => {
  // -------------------------------------------------------
  // BASIC EVENT DETAILS
  // -------------------------------------------------------

  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(null);

  const [budget, setBudget] = useState("");
  const [guests, setGuests] = useState("");

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);

  // -------------------------------------------------------
  // DATE / TIME
  // -------------------------------------------------------

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [startTime, setStartTime] = useState<Date>(() => {
    const d = new Date();

    d.setHours(10, 0, 0, 0);

    return d;
  });

  const [durationMinutes, setDurationMinutes] = useState(120);

  // -------------------------------------------------------
  // VENDOR IDs
  //
  // IMPORTANT:
  // Current EventDetailForm only knows service names.
  // Do NOT put fake vendor IDs here.
  //
  // Later these IDs can come from vendor selection screen.
  // -------------------------------------------------------

  const [vendorIds] = useState<string[]>([]);

  // -------------------------------------------------------
  // VALIDATION ERRORS
  // -------------------------------------------------------

  const [errors, setErrors] = useState({
    eventName: "",
    eventType: "",
    eventDate: "",
    guests: "",
    selectedServices: "",
    budget: "",
  });

  // -------------------------------------------------------
  // LOAD CATEGORIES
  // -------------------------------------------------------

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await getAllCategories();

        setCategories(response);
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    loadCategories();
  }, []);

  // -------------------------------------------------------
  // AVAILABILITY DATE
  // -------------------------------------------------------

  const availabilityDate = useMemo(() => {
    if (!eventDate) {
      return null;
    }

    return eventDate.toISOString().split("T")[0];
  }, [eventDate]);

  // -------------------------------------------------------
  // VENDOR AVAILABILITY
  // -------------------------------------------------------

  const {
    results: vendorAvailability,
    loading: availabilityLoading,
  } = useVendorsAvailability({
    vendorIds,
    eventDate: availabilityDate,
    startTime: eventDate ? timeToHHMM(startTime) : null,
    durationMinutes,
  });

  // -------------------------------------------------------
  // VALIDATE FIELDS
  // -------------------------------------------------------

  const validateFields = (): boolean => {
    const newErrors = {
      eventName: eventName.trim()
        ? ""
        : "Event name is required",

      eventType: eventType.trim()
        ? ""
        : "Event type is required",

      eventDate: eventDate
        ? ""
        : "Event date is required",

      budget: budget.trim()
        ? ""
        : "Budget is required",

      guests: guests.trim()
        ? ""
        : "Guest count is required",

      selectedServices:
        selectedServices.length > 0
          ? ""
          : "Select at least one service",
    };

    setErrors(newErrors);

    return Object.values(newErrors).every(
      (error) => error === ""
    );
  };

  // -------------------------------------------------------
  // SERVICE SELECTION
  // -------------------------------------------------------

  const toggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(
        selectedServices.filter(
          (item) => item !== service
        )
      );
    } else {
      setSelectedServices([
        ...selectedServices,
        service,
      ]);
    }

    setErrors((prev) => ({
      ...prev,
      selectedServices: "",
    }));
  };

  // -------------------------------------------------------
  // DATE PICKER
  // -------------------------------------------------------

  const onChangeDate = (
    _: any,
    selectedDate?: Date
  ) => {
    setShowDatePicker(
      Platform.OS === "ios"
    );

    if (selectedDate) {
      setEventDate(selectedDate);

      setErrors((prev) => ({
        ...prev,
        eventDate: "",
      }));
    }
  };

  // -------------------------------------------------------
  // TIME PICKER
  // -------------------------------------------------------

  const onChangeTime = (
    _: any,
    selected?: Date
  ) => {
    setShowTimePicker(
      Platform.OS === "ios"
    );

    if (selected) {
      setStartTime(selected);
    }
  };

  // -------------------------------------------------------
  // CALENDAR MARKS
  // -------------------------------------------------------

  const calendarMarks = useMemo(() => {
    if (!eventDate) {
      return {};
    }

    const key = eventDate
      .toISOString()
      .split("T")[0];

    return {
      [key]: {
        selected: true,
        selectedColor: PRIMARY,
        selectedTextColor: "#FFFFFF",
      },
    };
  }, [eventDate]);

  // -------------------------------------------------------
  // AVAILABILITY SUMMARY
  // -------------------------------------------------------

  const availabilitySummary = useMemo(() => {
    const values = Object.values(
      vendorAvailability
    );

    const available = values.filter(
      (item) => item.available
    ).length;

    const unavailable = values.filter(
      (item) => !item.available
    ).length;

    return {
      total: values.length,
      available,
      unavailable,
    };
  }, [vendorAvailability]);

  // -------------------------------------------------------
  // SAVE EVENT DETAILS
  // -------------------------------------------------------

  const saveEventDetails = async () => {
    const valid = validateFields();

    if (!valid) {
      return false;
    }

    // If vendors are selected and none is available,
    // don't allow proceeding.
    if (
      vendorIds.length > 0 &&
      availabilitySummary.total > 0 &&
      availabilitySummary.available === 0
    ) {
      Alert.alert(
        "No vendor available",
        "The selected vendors are not available for this date and time. Please choose another time."
      );

      return false;
    }

    try {
      await saveSecureData(
        "eventDetails",
        JSON.stringify({
          eventName,
          eventType,
          eventDate,

          // NEW
          startTime: timeToHHMM(startTime),
          durationMinutes,

          // EXISTING
          guests,
          selectedServices,
          budget,

          // Will be populated later when
          // vendors are selected.
          vendorIds,
        })
      );

      return true;
    } catch (error) {
      console.error(
        "Error saving event details:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to save event details."
      );

      return false;
    }
  };

  // -------------------------------------------------------
  // AI PLAN
  // -------------------------------------------------------

  const handleAIPlan = async () => {
    const saved = await saveEventDetails();

    if (!saved) {
      return;
    }

    router.push("/AI");
  };

  // -------------------------------------------------------
  // CUSTOMIZE OWN
  // -------------------------------------------------------

  const handleCustomizeOwn = async () => {
    const saved = await saveEventDetails();

    if (!saved) {
      return;
    }

    router.push({
      pathname: "/customizeyourown",
      params: {
        selectedServices:
          JSON.stringify(selectedServices),
      },
    });
  };

  // -------------------------------------------------------
  // RENDER
  // -------------------------------------------------------

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* ==================================================
          HEADER
      ================================================== */}

      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <Ionicons
            name="sparkles-outline"
            size={25}
            color="#FFFFFF"
          />
        </View>

        <Text style={styles.heading}>
          Plan Your Event
        </Text>

        <Text style={styles.subHeading}>
          Choose your date and time to see vendor
          availability before booking.
        </Text>
      </View>

      {/* ==================================================
          EVENT NAME
      ================================================== */}

      <Text style={styles.label}>
        Event Name
      </Text>

      <View style={styles.inputWrapper}>
        <Ionicons
          name="calendar-outline"
          size={19}
          color={PRIMARY}
        />

        <TextInput
          style={styles.inputText}
          placeholder="Enter event name"
          placeholderTextColor="#AAAAAA"
          value={eventName}
          onChangeText={setEventName}
          testID="event-name-input"
        />
      </View>

      {!!errors.eventName && (
        <Text style={styles.errorText}>
          {errors.eventName}
        </Text>
      )}

      {/* ==================================================
          EVENT TYPE
      ================================================== */}

      <Text style={styles.label}>
        Event Type
      </Text>

      <View style={styles.inputWrapper}>
        <Ionicons
          name="pricetag-outline"
          size={19}
          color={PRIMARY}
        />

        <TextInput
          style={styles.inputText}
          placeholder="Wedding, Birthday, Corporate..."
          placeholderTextColor="#AAAAAA"
          value={eventType}
          onChangeText={setEventType}
          testID="event-type-input"
        />
      </View>

      {!!errors.eventType && (
        <Text style={styles.errorText}>
          {errors.eventType}
        </Text>
      )}

      {/* ==================================================
          EVENT DATE
      ================================================== */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.label}>
            Event Date
          </Text>

          <Text style={styles.helperText}>
            Select a date to check availability
          </Text>
        </View>

        <View style={styles.sectionIcon}>
          <Ionicons
            name="calendar"
            size={17}
            color={PRIMARY}
          />
        </View>
      </View>

      <View style={styles.calendarContainer}>
        <Calendar
          current={
            eventDate
              ? eventDate
                  .toISOString()
                  .split("T")[0]
              : new Date()
                  .toISOString()
                  .split("T")[0]
          }
          minDate={
            new Date()
              .toISOString()
              .split("T")[0]
          }
          markedDates={calendarMarks}
          onDayPress={(day) => {
            const selected = new Date(
              `${day.dateString}T12:00:00`
            );

            setEventDate(selected);

            setErrors((prev) => ({
              ...prev,
              eventDate: "",
            }));
          }}
          enableSwipeMonths
          theme={{
            backgroundColor: "#FFFFFF",
            calendarBackground: "#FFFFFF",

            textSectionTitleColor: "#999999",

            dayTextColor: "#222222",

            todayTextColor: PRIMARY,

            arrowColor: PRIMARY,

            monthTextColor: "#111111",

            textMonthFontWeight: "800",

            textDayHeaderFontWeight: "700",

            textDayFontWeight: "500",

            textDayFontSize: 14,

            textMonthFontSize: 17,

            textDayHeaderFontSize: 11,
          }}
        />
      </View>

      {!!errors.eventDate && (
        <Text style={styles.errorText}>
          {errors.eventDate}
        </Text>
      )}

      {/* ==================================================
          SELECTED DATE
      ================================================== */}

      {eventDate && (
        <View style={styles.selectedDateCard}>
          <View style={styles.selectedDateIcon}>
            <Ionicons
              name="checkmark"
              size={18}
              color="#FFFFFF"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.selectedDateLabel}>
              Selected Event Date
            </Text>

            <Text style={styles.selectedDateValue}>
              {eventDate.toLocaleDateString(
                "en-US",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }
              )}
            </Text>
          </View>
        </View>
      )}

      {/* ==================================================
          START TIME
      ================================================== */}

      <Text style={styles.label}>
        Event Start Time
      </Text>

      <TouchableOpacity
        style={styles.timeSelector}
        onPress={() =>
          setShowTimePicker(true)
        }
      >
        <View style={styles.timeIcon}>
          <Ionicons
            name="time-outline"
            size={20}
            color={PRIMARY}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.timeLabel}>
            Start Time
          </Text>

          <Text style={styles.timeValue}>
            {formatTime(startTime)}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={19}
          color="#AAAAAA"
        />
      </TouchableOpacity>

      {showTimePicker && (
        <DateTimePicker
          value={startTime}
          mode="time"
          display="default"
          onChange={onChangeTime}
        />
      )}

      {/* ==================================================
          DURATION
      ================================================== */}

      <Text style={styles.label}>
        Event Duration
      </Text>

      <Text style={styles.helperText}>
        Vendor must be available for the complete
        selected duration.
      </Text>

      <View style={styles.durationGrid}>
        {DURATION_OPTIONS.map((option) => {
          const active =
            durationMinutes === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.durationChip,
                active &&
                  styles.durationChipActive,
              ]}
              onPress={() =>
                setDurationMinutes(
                  option.value
                )
              }
            >
              <Ionicons
                name="time-outline"
                size={15}
                color={
                  active
                    ? "#FFFFFF"
                    : PRIMARY
                }
              />

              <Text
                style={[
                  styles.durationText,
                  active &&
                    styles.durationTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ==================================================
          VENDOR AVAILABILITY
      ================================================== */}

      {eventDate && (
        <View style={styles.availabilityCard}>
          {/* Header */}

          <View style={styles.availabilityHeader}>
            <View
              style={
                styles.availabilityTitleWrap
              }
            >
              <View
                style={
                  styles.availabilityIcon
                }
              >
                <Ionicons
                  name="people-outline"
                  size={19}
                  color="#FFFFFF"
                />
              </View>

              <View>
                <Text
                  style={
                    styles.availabilityTitle
                  }
                >
                  Vendor Availability
                </Text>

                <Text
                  style={
                    styles.availabilitySubtitle
                  }
                >
                  {formatTime(startTime)}
                  {" • "}
                  {DURATION_OPTIONS.find(
                    (item) =>
                      item.value ===
                      durationMinutes
                  )?.label ||
                    formatDuration(
                      durationMinutes
                    )}
                </Text>
              </View>
            </View>

            {availabilityLoading &&
              vendorIds.length > 0 && (
                <ActivityIndicator
                  size="small"
                  color={PRIMARY}
                />
              )}
          </View>

          {/* No vendor IDs yet */}

          {vendorIds.length === 0 ? (
            <View
              style={
                styles.waitingAvailability
              }
            >
              <View style={styles.waitingIcon}>
                <Ionicons
                  name="search-outline"
                  size={23}
                  color={PRIMARY}
                />
              </View>

              <View
                style={{
                  flex: 1,
                }}
              >
                <Text
                  style={styles.waitingTitle}
                >
                  Select vendors to check
                  availability
                </Text>

                <Text
                  style={styles.waitingText}
                >
                  Your selected date, start time
                  and duration are ready. Once
                  vendors are selected, their
                  real availability will be
                  checked.
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Availability summary */}

              <View
                style={
                  styles.availabilitySummary
                }
              >
                <View style={styles.summaryBox}>
                  <Text
                    style={styles.summaryNumber}
                  >
                    {
                      availabilitySummary.available
                    }
                  </Text>

                  <Text
                    style={styles.summaryLabel}
                  >
                    Available
                  </Text>
                </View>

                <View style={styles.summaryBox}>
                  <Text
                    style={styles.summaryNumber}
                  >
                    {
                      availabilitySummary.unavailable
                    }
                  </Text>

                  <Text
                    style={styles.summaryLabel}
                  >
                    Unavailable
                  </Text>
                </View>
              </View>

              {/* Vendor results */}

              {Object.entries(
                vendorAvailability
              ).map(([id, result]) => (
                <View
                  key={id}
                  style={[
                    styles.vendorResult,
                    result.available
                      ? styles.vendorAvailable
                      : styles.vendorUnavailable,
                  ]}
                >
                  <View
                    style={[
                      styles.vendorResultIcon,
                      {
                        backgroundColor:
                          result.available
                            ? "#DDF4E4"
                            : "#FCE1E1",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        result.available
                          ? "checkmark"
                          : "close"
                      }
                      size={17}
                      color={
                        result.available
                          ? "#278A4B"
                          : "#C0392B"
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
                        styles.vendorResultTitle
                      }
                    >
                      Vendor
                    </Text>

                    <Text
                      style={
                        styles.vendorResultReason
                      }
                    >
                      {result.available
                        ? "Available for this date and time"
                        : result.reason ||
                          "Not available"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.resultBadge,
                      {
                        backgroundColor:
                          result.available
                            ? "#E7F7EC"
                            : "#FDEBEC",
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: "800",
                        color:
                          result.available
                            ? "#278A4B"
                            : "#C0392B",
                      }}
                    >
                      {result.available
                        ? "AVAILABLE"
                        : "BUSY"}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}

      {/* ==================================================
          TOTAL GUESTS
      ================================================== */}

      <Text style={styles.label}>
        Total Guests
      </Text>

      <View style={styles.inputWrapper}>
        <Ionicons
          name="people-outline"
          size={19}
          color={PRIMARY}
        />

        <TextInput
          style={styles.inputText}
          placeholder="Enter guests"
          placeholderTextColor="#AAAAAA"
          keyboardType="numeric"
          value={guests}
          onChangeText={setGuests}
          testID="guests-input-bottom"
        />
      </View>

      {!!errors.guests && (
        <Text
          style={styles.errorText}
          testID="guests-error-bottom"
        >
          {errors.guests}
        </Text>
      )}

      {/* ==================================================
          BUDGET
      ================================================== */}

      <Text style={styles.label}>
        Your Budget
      </Text>

      <View style={styles.inputWrapper}>
        <Ionicons
          name="cash-outline"
          size={19}
          color={PRIMARY}
        />

        <TextInput
          style={styles.inputText}
          placeholder="Your Budget"
          placeholderTextColor="#AAAAAA"
          keyboardType="numeric"
          value={budget}
          onChangeText={setBudget}
          testID="budget-input"
        />
      </View>

      {!!errors.budget && (
        <Text
          style={styles.errorText}
          testID="budget-error"
        >
          {errors.budget}
        </Text>
      )}

      {/* ==================================================
          DESIRED SERVICES
      ================================================== */}

      <Text style={styles.label}>
        Desired Services
      </Text>

      <View style={styles.checkboxContainer}>
        {categories.map((service) => (
          <TouchableOpacity
            key={service._id}
            style={[
              styles.checkbox,
              selectedServices.includes(
                service.name
              ) &&
                styles.checkboxSelected,
            ]}
            onPress={() =>
              toggleService(service.name)
            }
          >
            <Ionicons
              name={
                selectedServices.includes(
                  service.name
                )
                  ? "checkbox"
                  : "square-outline"
              }
              size={20}
              color={
                selectedServices.includes(
                  service.name
                )
                  ? PRIMARY
                  : "#777777"
              }
            />

            <Text
              style={[
                styles.checkboxText,
                selectedServices.includes(
                  service.name
                ) &&
                  styles.checkboxTextSelected,
              ]}
            >
              {service.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!errors.selectedServices && (
        <Text style={styles.errorText}>
          {errors.selectedServices}
        </Text>
      )}

      {/* ==================================================
          BUTTONS
      ================================================== */}

      <View style={styles.buttonContainer}>
        {/* AI */}

        <TouchableOpacity
          style={styles.aiPlanButton}
          onPress={handleAIPlan}
        >
          <Ionicons
            name="sparkles-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={styles.aiPlanButtonText}
          >
            AI Suggested Plan
          </Text>
        </TouchableOpacity>

        {/* Customize */}

        <TouchableOpacity
          style={styles.customizeButton}
          onPress={handleCustomizeOwn}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.customizeButtonText
            }
          >
            Customize Your Own
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
};

// =======================================================
// STYLES
// =======================================================

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: PRIMARY_LIGHT,
    padding: 20,
    paddingTop: 55,
  },

  // -----------------------------------------------------
  // HERO
  // -----------------------------------------------------

  heroCard: {
    width: "100%",
    backgroundColor: PRIMARY,
    borderRadius: 22,
    padding: 22,
    marginBottom: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  heading: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    color: "#FFFFFF",
    marginBottom: 7,
  },

  subHeading: {
    fontSize: 13,
    color: "#FCECF7",
    textAlign: "center",
    lineHeight: 19,
  },

  // -----------------------------------------------------
  // LABEL
  // -----------------------------------------------------

  label: {
    fontSize: 14,
    color: "#222222",
    fontWeight: "700",
    marginBottom: 7,
    marginTop: 5,
  },

  helperText: {
    fontSize: 11,
    color: "#888888",
    marginBottom: 10,
    lineHeight: 16,
  },

  errorText: {
    color: "#D32F2F",
    fontSize: 12,
    alignSelf: "flex-start",
    marginTop: -8,
    marginBottom: 12,
  },

  // -----------------------------------------------------
  // INPUT
  // -----------------------------------------------------

  inputWrapper: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },

  inputText: {
    flex: 1,
    fontSize: 14,
    color: "#222222",
    marginLeft: 10,
  },

  // -----------------------------------------------------
  // SECTION HEADER
  // -----------------------------------------------------

  sectionHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },

  sectionIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  // -----------------------------------------------------
  // CALENDAR
  // -----------------------------------------------------

  calendarContainer: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 15,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },

  // -----------------------------------------------------
  // SELECTED DATE
  // -----------------------------------------------------

  selectedDateCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },

  selectedDateIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  selectedDateLabel: {
    fontSize: 11,
    color: "#888888",
    marginBottom: 3,
  },

  selectedDateValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222222",
  },

  // -----------------------------------------------------
  // TIME
  // -----------------------------------------------------

  timeSelector: {
    width: "100%",
    minHeight: 70,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },

  timeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  timeLabel: {
    fontSize: 11,
    color: "#888888",
    marginBottom: 2,
  },

  timeValue: {
    fontSize: 18,
    fontWeight: "800",
    color: PRIMARY,
  },

  // -----------------------------------------------------
  // DURATION
  // -----------------------------------------------------

  durationGrid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  durationChip: {
    width: "31.5%",
    minHeight: 45,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#E7D8E2",
  },

  durationChipActive: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  durationText: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
    marginLeft: 5,
  },

  durationTextActive: {
    color: "#FFFFFF",
  },

  // -----------------------------------------------------
  // AVAILABILITY CARD
  // -----------------------------------------------------

  availabilityCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 22,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  availabilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  availabilityTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  availabilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  availabilityTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222222",
  },

  availabilitySubtitle: {
    fontSize: 11,
    color: "#888888",
    marginTop: 3,
  },

  // -----------------------------------------------------
  // WAITING AVAILABILITY
  // -----------------------------------------------------

  waitingAvailability: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 13,
    padding: 13,
  },

  waitingIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  waitingTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: PRIMARY,
    marginBottom: 4,
  },

  waitingText: {
    fontSize: 11,
    lineHeight: 16,
    color: "#777777",
  },

  // -----------------------------------------------------
  // AVAILABILITY SUMMARY
  // -----------------------------------------------------

  availabilitySummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  summaryBox: {
    width: "48%",
    backgroundColor: PRIMARY_LIGHT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  summaryNumber: {
    fontSize: 21,
    fontWeight: "800",
    color: PRIMARY,
  },

  summaryLabel: {
    fontSize: 10,
    color: "#777777",
    marginTop: 2,
  },

  // -----------------------------------------------------
  // VENDOR RESULT
  // -----------------------------------------------------

  vendorResult: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
    padding: 11,
    marginTop: 8,
    borderWidth: 1,
  },

  vendorAvailable: {
    backgroundColor: "#F5FCF7",
    borderColor: "#D8EEDF",
  },

  vendorUnavailable: {
    backgroundColor: "#FFF7F7",
    borderColor: "#F2DADA",
  },

  vendorResultIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  vendorResultTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#222222",
  },

  vendorResultReason: {
    fontSize: 10,
    color: "#777777",
    marginTop: 3,
    lineHeight: 14,
  },

  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginLeft: 7,
  },

  // -----------------------------------------------------
  // SERVICES
  // -----------------------------------------------------

  checkboxContainer: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  checkbox: {
    width: "48%",
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#E8E0E5",
  },

  checkboxSelected: {
    borderColor: PRIMARY,
    backgroundColor: "#FDF5FA",
  },

  checkboxText: {
    flex: 1,
    fontSize: 12,
    color: "#555555",
    marginLeft: 7,
  },

  checkboxTextSelected: {
    color: PRIMARY,
    fontWeight: "700",
  },

  // -----------------------------------------------------
  // BUTTONS
  // -----------------------------------------------------

  buttonContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  aiPlanButton: {
    flex: 1,
    minHeight: 54,
    backgroundColor: PRIMARY,
    borderRadius: 13,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  customizeButton: {
    flex: 1,
    minHeight: 54,
    backgroundColor: ACCENT,
    borderRadius: 13,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  aiPlanButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
    marginLeft: 5,
    textAlign: "center",
  },

  customizeButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
    marginLeft: 5,
    textAlign: "center",
  },

  bottomSpace: {
    height: 30,
  },
});

export default PersonalizedExperienceScreen;