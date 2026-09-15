import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { createVendorCampaign } from "@/services/vendorCampaignApi";
import { getVendorPackagesList } from "@/services/getVendorPackagesList";

const PRIMARY = "#7D0C72";
const PRIMARY_DARK = "#5E0A55";
const TEXT = "#2B1730";
const MUTED = "#8E7C93";
const BACKGROUND = "#FBF6FA";
const BORDER = "#EEDFED";

type CampaignImage = {
  uri: string;
  name: string;
  type: string;
};

type VendorPackage = {
  _id?: string;
  id?: string;
  packageName?: string;
  name?: string;
  title?: string;
  description?: string;
  price?: number | string;
  images?: string[];
};

const getPackageId = (pkg: VendorPackage) =>
  String(pkg?._id || pkg?.id || "");

const getPackageName = (pkg: VendorPackage) =>
  pkg?.packageName ||
  pkg?.name ||
  pkg?.title ||
  "Unnamed Package";

const getPackagePrice = (pkg: VendorPackage) => {
  const value = Number(pkg?.price || 0);

  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return `Rs. ${value.toLocaleString()}`;
};

const formatDate = (date: Date | null) => {
  if (!date) {
    return "Select date";
  }

  return date.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toApiDate = (date: Date, endOfDay = false) => {
  const value = new Date(date);

  if (endOfDay) {
    value.setHours(23, 59, 59, 999);
  } else {
    value.setHours(0, 0, 0, 0);
  }

  return value.toISOString();
};

export default function CreateVendorCampaignIndex() {
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    vendorId?: string | string[];
  }>();

  const vendorId = Array.isArray(params.vendorId)
    ? params.vendorId[0]
    : params.vendorId;

  const [packages, setPackages] = useState<VendorPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);

  const [selectedPackage, setSelectedPackage] =
    useState<VendorPackage | null>(null);

  const [packageModalVisible, setPackageModalVisible] =
    useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [offerLabel, setOfferLabel] = useState("");

  const [campaignImage, setCampaignImage] =
    useState<CampaignImage | null>(null);

  const [startDate, setStartDate] =
    useState<Date | null>(null);

  const [endDate, setEndDate] =
    useState<Date | null>(null);

  const [datePickerMode, setDatePickerMode] = useState<
    "start" | "end" | null
  >(null);

  const [calendarMonth, setCalendarMonth] =
    useState(new Date());

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPackages();
  }, [vendorId]);

  const loadPackages = async () => {
    if (!vendorId) {
      setLoadingPackages(false);

      Alert.alert(
        "Unable to Continue",
        "Vendor ID could not be found.",
      );

      return;
    }

    try {
      setLoadingPackages(true);

      const response: any =
        await getVendorPackagesList(vendorId);

      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.packages)
          ? response.packages
          : Array.isArray(response?.data)
            ? response.data
            : [];

      setPackages(list);
    } catch (error) {
      console.error(
        "Campaign package loading error:",
        error,
      );

      Alert.alert(
        "Unable to Load Packages",
        "Your packages could not be loaded. Please try again.",
      );
    } finally {
      setLoadingPackages(false);
    }
  };

  const pickCampaignImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow photo access to select a campaign image.",
        );

        return;
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.85,
          selectionLimit: 1,
        });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];

      const extension =
        asset.fileName?.split(".").pop()?.toLowerCase() ||
        asset.uri.split(".").pop()?.toLowerCase() ||
        "jpg";

      const normalizedExtension =
        extension === "jpeg" ? "jpg" : extension;

      const mimeType =
        asset.mimeType ||
        (normalizedExtension === "png"
          ? "image/png"
          : normalizedExtension === "webp"
            ? "image/webp"
            : "image/jpeg");

      setCampaignImage({
        uri: asset.uri,
        name:
          asset.fileName ||
          `campaign-${Date.now()}.${normalizedExtension}`,
        type: mimeType,
      });
    } catch (error) {
      console.error(
        "Campaign image picker error:",
        error,
      );

      Alert.alert(
        "Image Error",
        "Unable to select the image.",
      );
    }
  };

  const openDatePicker = (
    mode: "start" | "end",
  ) => {
    const initialDate =
      mode === "start"
        ? startDate || new Date()
        : endDate || startDate || new Date();

    setCalendarMonth(
      new Date(
        initialDate.getFullYear(),
        initialDate.getMonth(),
        1,
      ),
    );

    setDatePickerMode(mode);
  };

  const selectedPackageId = useMemo(
    () =>
      selectedPackage
        ? getPackageId(selectedPackage)
        : "",
    [selectedPackage],
  );

  const validateForm = () => {
    if (!vendorId) {
      Alert.alert(
        "Unable to Continue",
        "Vendor ID could not be found.",
      );

      return false;
    }

    if (!selectedPackageId) {
      Alert.alert(
        "Select Package",
        "Please select a package to promote.",
      );

      return false;
    }

    if (!campaignImage) {
      Alert.alert(
        "Campaign Image Required",
        "Please select one image for your campaign.",
      );

      return false;
    }

    if (!title.trim()) {
      Alert.alert(
        "Title Required",
        "Please enter a campaign title.",
      );

      return false;
    }

    if (title.trim().length < 3) {
      Alert.alert(
        "Invalid Title",
        "Campaign title must contain at least 3 characters.",
      );

      return false;
    }

    if (!description.trim()) {
      Alert.alert(
        "Description Required",
        "Please enter a short campaign description.",
      );

      return false;
    }

    if (!startDate) {
      Alert.alert(
        "Start Date Required",
        "Please select the campaign start date.",
      );

      return false;
    }

    if (!endDate) {
      Alert.alert(
        "End Date Required",
        "Please select the campaign end date.",
      );

      return false;
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (end.getTime() <= start.getTime()) {
      Alert.alert(
        "Invalid Campaign Dates",
        "End date must be after the start date.",
      );

      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    if (
      !vendorId ||
      !campaignImage ||
      !startDate ||
      !endDate
    ) {
      return;
    }

    try {
      setSubmitting(true);

      await createVendorCampaign(vendorId, {
        packageId: selectedPackageId,
        title: title.trim(),
        description: description.trim(),
        offerLabel: offerLabel.trim() || undefined,
        startDate: toApiDate(startDate),
        endDate: toApiDate(endDate, true),
        image: campaignImage,
      });

      Alert.alert(
        "Campaign Submitted",
        "Your campaign has been submitted for admin review.",
        [
          {
            text: "View Campaigns",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error: any) {
      console.error(
        "Campaign creation error:",
        error,
      );

      Alert.alert(
        "Campaign Not Created",
        error?.message ||
          "Unable to create the campaign. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={PRIMARY_DARK}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingBottom:
              Math.max(insets.bottom, 16) + 30,
          }}
        >
          <LinearGradient
            colors={["#8A0F7C", "#640080"]}
            style={[
              styles.header,
              {
                paddingTop: insets.top + 12,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.8}
                onPress={() => router.back()}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color="#FFFFFF"
                />
              </TouchableOpacity>

              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>
                  Create Campaign
                </Text>

                <Text style={styles.headerSubtitle}>
                  Promote one of your best packages
                </Text>
              </View>

              <View style={styles.headerPlaceholder} />
            </View>

            <View style={styles.headerInfoCard}>
              <View style={styles.headerInfoIcon}>
                <Ionicons
                  name="megaphone"
                  size={25}
                  color={PRIMARY}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.headerInfoTitle}>
                  Sponsored Package Promotion
                </Text>

                <Text style={styles.headerInfoText}>
                  Your campaign will be reviewed by
                  Eventify Hub before it becomes visible
                  to clients.
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <SectionHeader
              number="1"
              title="Choose Package"
              subtitle="Select the package you want to promote"
            />

            <TouchableOpacity
              style={styles.selector}
              activeOpacity={0.8}
              disabled={loadingPackages}
              onPress={() =>
                setPackageModalVisible(true)
              }
            >
              {loadingPackages ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color={PRIMARY}
                  />

                  <Text style={styles.selectorPlaceholder}>
                    Loading packages...
                  </Text>
                </>
              ) : selectedPackage ? (
                <>
                  <View style={styles.packageSelectorIcon}>
                    <Ionicons
                      name="cube-outline"
                      size={20}
                      color={PRIMARY}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={styles.selectorTitle}
                      numberOfLines={1}
                    >
                      {getPackageName(
                        selectedPackage,
                      )}
                    </Text>

                    {getPackagePrice(
                      selectedPackage,
                    ) ? (
                      <Text
                        style={
                          styles.selectorSubtitle
                        }
                      >
                        {getPackagePrice(
                          selectedPackage,
                        )}
                      </Text>
                    ) : null}
                  </View>

                  <Ionicons
                    name="chevron-down"
                    size={19}
                    color={MUTED}
                  />
                </>
              ) : (
                <>
                  <View style={styles.packageSelectorIcon}>
                    <Ionicons
                      name="cube-outline"
                      size={20}
                      color={PRIMARY}
                    />
                  </View>

                  <Text
                    style={
                      styles.selectorPlaceholder
                    }
                  >
                    Select an existing package
                  </Text>

                  <Ionicons
                    name="chevron-down"
                    size={19}
                    color={MUTED}
                  />
                </>
              )}
            </TouchableOpacity>

            <SectionHeader
              number="2"
              title="Campaign Image"
              subtitle="Choose one attractive image for your promotion"
            />

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.imagePicker}
              onPress={pickCampaignImage}
            >
              {campaignImage ? (
                <>
                  <Image
                    source={{
                      uri: campaignImage.uri,
                    }}
                    style={styles.selectedImage}
                    resizeMode="cover"
                  />

                  <View style={styles.imageOverlay}>
                    <View
                      style={
                        styles.changeImageButton
                      }
                    >
                      <Ionicons
                        name="camera"
                        size={16}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.changeImageText
                        }
                      >
                        Change Image
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.imageEmpty}>
                  <View style={styles.uploadIcon}>
                    <Ionicons
                      name="image-outline"
                      size={30}
                      color={PRIMARY}
                    />
                  </View>

                  <Text style={styles.imageTitle}>
                    Add Campaign Image
                  </Text>

                  <Text style={styles.imageSubtitle}>
                    Tap to choose from your gallery
                  </Text>

                  <Text style={styles.imageHint}>
                    Recommended ratio: 16:9
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <SectionHeader
              number="3"
              title="Campaign Details"
              subtitle="Tell clients what makes this offer special"
            />

            <InputLabel
              label="Campaign Title"
              required
            />

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Wedding Photography Special"
              placeholderTextColor="#B3A3B5"
              style={styles.input}
              maxLength={100}
            />

            <View style={styles.characterRow}>
              <Text style={styles.inputHint}>
                Keep it clear and attractive
              </Text>

              <Text style={styles.characterText}>
                {title.length}/100
              </Text>
            </View>

            <InputLabel
              label="Short Description"
              required
            />

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your package promotion..."
              placeholderTextColor="#B3A3B5"
              style={[
                styles.input,
                styles.textArea,
              ]}
              multiline
              textAlignVertical="top"
              maxLength={300}
            />

            <View style={styles.characterRow}>
              <Text style={styles.inputHint}>
                Explain the main value of your offer
              </Text>

              <Text style={styles.characterText}>
                {description.length}/300
              </Text>
            </View>

            <InputLabel
              label="Offer Label"
              optional
            />

            <View style={styles.offerInputContainer}>
              <Ionicons
                name="pricetag-outline"
                size={18}
                color={PRIMARY}
              />

              <TextInput
                value={offerLabel}
                onChangeText={setOfferLabel}
                placeholder="e.g. Limited Time Offer"
                placeholderTextColor="#B3A3B5"
                style={styles.offerInput}
                maxLength={60}
              />
            </View>

            <Text style={styles.inputHintBottom}>
              Optional badge displayed with your campaign
            </Text>

            <SectionHeader
              number="4"
              title="Campaign Duration"
              subtitle="Choose when your promotion should run"
            />

            <View style={styles.dateRow}>
              <DateCard
                label="Start Date"
                value={formatDate(startDate)}
                selected={Boolean(startDate)}
                icon="calendar-outline"
                onPress={() =>
                  openDatePicker("start")
                }
              />

              <View style={styles.dateArrow}>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#B8A7BA"
                />
              </View>

              <DateCard
                label="End Date"
                value={formatDate(endDate)}
                selected={Boolean(endDate)}
                icon="flag-outline"
                onPress={() =>
                  openDatePicker("end")
                }
              />
            </View>

            <View style={styles.reviewNotice}>
              <View style={styles.reviewNoticeIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color={PRIMARY}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.reviewNoticeTitle}>
                  Admin Review Required
                </Text>

                <Text style={styles.reviewNoticeText}>
                  After submission, your campaign will
                  appear as Pending Review until an admin
                  approves it.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={submitting}
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                submitting && {
                  opacity: 0.7,
                },
              ]}
            >
              <LinearGradient
                colors={["#8A0F7C", "#640080"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                {submitting ? (
                  <>
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />

                    <Text style={styles.submitText}>
                      Submitting Campaign...
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons
                      name="paper-plane-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text style={styles.submitText}>
                      Submit for Review
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={19}
                      color="#FFFFFF"
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PackageSelectionModal
        visible={packageModalVisible}
        packages={packages}
        selectedPackage={selectedPackage}
        onClose={() =>
          setPackageModalVisible(false)
        }
        onSelect={(pkg) => {
          setSelectedPackage(pkg);
          setPackageModalVisible(false);
        }}
      />

      <CalendarModal
        visible={datePickerMode !== null}
        mode={datePickerMode}
        month={calendarMonth}
        selectedDate={
          datePickerMode === "start"
            ? startDate
            : endDate
        }
        minimumDate={
          datePickerMode === "end"
            ? startDate || new Date()
            : new Date()
        }
        onMonthChange={setCalendarMonth}
        onClose={() => setDatePickerMode(null)}
        onSelect={(date) => {
          if (datePickerMode === "start") {
            setStartDate(date);

            if (
              endDate &&
              endDate.getTime() <= date.getTime()
            ) {
              setEndDate(null);
            }
          } else {
            setEndDate(date);
          }

          setDatePickerMode(null);
        }}
      />
    </View>
  );
}

function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>
          {number}
        </Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>
          {title}
        </Text>

        <Text style={styles.sectionSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function InputLabel({
  label,
  required,
  optional,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.inputLabel}>
        {label}
      </Text>

      {required ? (
        <Text style={styles.required}>*</Text>
      ) : null}

      {optional ? (
        <Text style={styles.optional}>
          Optional
        </Text>
      ) : null}
    </View>
  );
}

function DateCard({
  label,
  value,
  selected,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  selected: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.dateCard}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.dateCardIcon}>
        <Ionicons
          name={icon}
          size={19}
          color={PRIMARY}
        />
      </View>

      <Text style={styles.dateCardLabel}>
        {label}
      </Text>

      <Text
        style={[
          styles.dateCardValue,
          !selected && {
            color: "#AE9CAF",
            fontWeight: "600",
          },
        ]}
      >
        {value}
      </Text>
    </TouchableOpacity>
  );
}

function PackageSelectionModal({
  visible,
  packages,
  selectedPackage,
  onClose,
  onSelect,
}: {
  visible: boolean;
  packages: VendorPackage[];
  selectedPackage: VendorPackage | null;
  onClose: () => void;
  onSelect: (pkg: VendorPackage) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.packageModal}>
          <View style={styles.modalHandle} />

          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                Select Package
              </Text>

              <Text style={styles.modalSubtitle}>
                Choose one package to promote
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={onClose}
            >
              <Ionicons
                name="close"
                size={21}
                color={TEXT}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
          >
            {packages.length === 0 ? (
              <View style={styles.noPackageContainer}>
                <View style={styles.noPackageIcon}>
                  <Ionicons
                    name="cube-outline"
                    size={30}
                    color={PRIMARY}
                  />
                </View>

                <Text style={styles.noPackageTitle}>
                  No packages found
                </Text>

                <Text style={styles.noPackageText}>
                  Create a package first before starting
                  a campaign.
                </Text>
              </View>
            ) : (
              packages.map((pkg, index) => {
                const packageId =
                  getPackageId(pkg);

                const selected =
                  getPackageId(
                    selectedPackage || {},
                  ) === packageId;

                return (
                  <TouchableOpacity
                    key={
                      packageId ||
                      `package-${index}`
                    }
                    style={[
                      styles.packageOption,
                      selected &&
                        styles.packageOptionSelected,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => onSelect(pkg)}
                  >
                    <View
                      style={
                        styles.packageOptionIcon
                      }
                    >
                      <Ionicons
                        name="cube-outline"
                        size={20}
                        color={PRIMARY}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={
                          styles.packageOptionTitle
                        }
                        numberOfLines={1}
                      >
                        {getPackageName(pkg)}
                      </Text>

                      <Text
                        style={
                          styles.packageOptionSubtitle
                        }
                        numberOfLines={1}
                      >
                        {getPackagePrice(pkg) ||
                          pkg.description ||
                          "Package"}
                      </Text>
                    </View>

                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={23}
                        color={PRIMARY}
                      />
                    ) : (
                      <Ionicons
                        name="chevron-forward"
                        size={19}
                        color="#B5A6B6"
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CalendarModal({
  visible,
  mode,
  month,
  selectedDate,
  minimumDate,
  onMonthChange,
  onClose,
  onSelect,
}: {
  visible: boolean;
  mode: "start" | "end" | null;
  month: Date;
  selectedDate: Date | null;
  minimumDate: Date;
  onMonthChange: (date: Date) => void;
  onClose: () => void;
  onSelect: (date: Date) => void;
}) {
  const days = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const firstDay =
      new Date(year, monthIndex, 1).getDay();

    const totalDays =
      new Date(
        year,
        monthIndex + 1,
        0,
      ).getDate();

    const result: Array<number | null> = [];

    for (let i = 0; i < firstDay; i += 1) {
      result.push(null);
    }

    for (
      let day = 1;
      day <= totalDays;
      day += 1
    ) {
      result.push(day);
    }

    while (result.length % 7 !== 0) {
      result.push(null);
    }

    return result;
  }, [month]);

  const min = new Date(minimumDate);
  min.setHours(0, 0, 0, 0);

  const previousMonth = () => {
    onMonthChange(
      new Date(
        month.getFullYear(),
        month.getMonth() - 1,
        1,
      ),
    );
  };

  const nextMonth = () => {
    onMonthChange(
      new Date(
        month.getFullYear(),
        month.getMonth() + 1,
        1,
      ),
    );
  };

  const monthLabel = month.toLocaleDateString(
    "en-PK",
    {
      month: "long",
      year: "numeric",
    },
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.calendarBackdrop}>
        <View style={styles.calendarModal}>
          <View style={styles.calendarTop}>
            <View>
              <Text style={styles.calendarTitle}>
                {mode === "start"
                  ? "Campaign Start Date"
                  : "Campaign End Date"}
              </Text>

              <Text style={styles.calendarSubtitle}>
                Select a campaign date
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalClose}
              onPress={onClose}
            >
              <Ionicons
                name="close"
                size={21}
                color={TEXT}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.monthNavigation}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={previousMonth}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={PRIMARY}
              />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>
              {monthLabel}
            </Text>

            <TouchableOpacity
              style={styles.monthButton}
              onPress={nextMonth}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={PRIMARY}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {[
              "S",
              "M",
              "T",
              "W",
              "T",
              "F",
              "S",
            ].map((day, index) => (
              <Text
                key={`${day}-${index}`}
                style={styles.weekText}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              if (!day) {
                return (
                  <View
                    key={`empty-${index}`}
                    style={styles.dayCell}
                  />
                );
              }

              const date = new Date(
                month.getFullYear(),
                month.getMonth(),
                day,
              );

              date.setHours(0, 0, 0, 0);

              const disabled =
                date.getTime() < min.getTime();

              const selected =
                selectedDate &&
                date.getFullYear() ===
                  selectedDate.getFullYear() &&
                date.getMonth() ===
                  selectedDate.getMonth() &&
                date.getDate() ===
                  selectedDate.getDate();

              return (
                <TouchableOpacity
                  key={`${month.getFullYear()}-${month.getMonth()}-${day}`}
                  style={styles.dayCell}
                  disabled={disabled}
                  onPress={() => onSelect(date)}
                >
                  <View
                    style={[
                      styles.dayCircle,
                      selected &&
                        styles.dayCircleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        disabled &&
                          styles.dayTextDisabled,
                        selected &&
                          styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerPlaceholder: {
    width: 42,
  },

  headerContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    marginTop: 3,
  },

  headerInfoCard: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },

  headerInfoIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  headerInfoTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  headerInfoText: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 4,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 23,
    marginBottom: 13,
  },

  sectionNumber: {
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor: "#F2E3F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  sectionNumberText: {
    color: PRIMARY,
    fontSize: 13,
    fontWeight: "900",
  },

  sectionTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
  },

  sectionSubtitle: {
    color: MUTED,
    fontSize: 10.5,
    marginTop: 2,
  },

  selector: {
    minHeight: 66,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  packageSelectorIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#F4E7F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  selectorPlaceholder: {
    flex: 1,
    color: "#A08EA4",
    fontSize: 12,
    marginLeft: 10,
  },

  selectorTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "700",
  },

  selectorSubtitle: {
    color: PRIMARY,
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 3,
  },

  imagePicker: {
    height: 190,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#D9BFD9",
  },

  selectedImage: {
    width: "100%",
    height: "100%",
  },

  imageOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 13,
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  changeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(55,20,58,0.78)",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
  },

  changeImageText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
  },

  imageEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  uploadIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#F4E5F4",
    alignItems: "center",
    justifyContent: "center",
  },

  imageTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 10,
  },

  imageSubtitle: {
    color: MUTED,
    fontSize: 10.5,
    marginTop: 4,
  },

  imageHint: {
    color: "#B39FB5",
    fontSize: 9,
    marginTop: 6,
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
    marginBottom: 7,
  },

  inputLabel: {
    color: TEXT,
    fontSize: 11.5,
    fontWeight: "700",
  },

  required: {
    color: "#D1445C",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 3,
  },

  optional: {
    color: MUTED,
    fontSize: 9.5,
    marginLeft: 7,
  },

  input: {
    minHeight: 51,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 12,
  },

  textArea: {
    height: 110,
    paddingTop: 13,
    paddingBottom: 13,
  },

  characterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },

  inputHint: {
    color: "#A493A7",
    fontSize: 9,
  },

  characterText: {
    color: "#A493A7",
    fontSize: 9,
  },

  offerInputContainer: {
    minHeight: 51,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 13,
  },

  offerInput: {
    flex: 1,
    marginLeft: 8,
    color: TEXT,
    fontSize: 12,
    paddingVertical: 0,
  },

  inputHintBottom: {
    color: "#A493A7",
    fontSize: 9,
    marginTop: 5,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  dateCard: {
    flex: 1,
    minHeight: 116,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: "#FFFFFF",
    padding: 13,
  },

  dateArrow: {
    width: 31,
    alignItems: "center",
  },

  dateCardIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: "#F3E5F3",
    alignItems: "center",
    justifyContent: "center",
  },

  dateCardLabel: {
    color: MUTED,
    fontSize: 9.5,
    marginTop: 9,
  },

  dateCardValue: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },

  reviewNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 23,
    padding: 14,
    borderRadius: 17,
    backgroundColor: "#F7EDF7",
    borderWidth: 1,
    borderColor: "#EBD6EC",
  },

  reviewNoticeIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  reviewNoticeTitle: {
    color: TEXT,
    fontSize: 11.5,
    fontWeight: "800",
  },

  reviewNoticeText: {
    color: MUTED,
    fontSize: 9.5,
    lineHeight: 14,
    marginTop: 3,
  },

  submitButton: {
    marginTop: 20,
    borderRadius: 17,
    overflow: "hidden",
  },

  submitGradient: {
    minHeight: 57,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(35,15,38,0.35)",
  },

  packageModal: {
    maxHeight: "72%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#DDCFDE",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 13,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
  },

  modalSubtitle: {
    color: MUTED,
    fontSize: 10.5,
    marginTop: 3,
  },

  modalClose: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: "#F5EEF5",
    alignItems: "center",
    justifyContent: "center",
  },

  packageOption: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0E4EF",
    borderRadius: 16,
    paddingHorizontal: 13,
    marginBottom: 10,
  },

  packageOptionSelected: {
    borderColor: PRIMARY,
    backgroundColor: "#FCF5FC",
  },

  packageOptionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F4E6F4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  packageOptionTitle: {
    color: TEXT,
    fontSize: 12.5,
    fontWeight: "700",
  },

  packageOptionSubtitle: {
    color: MUTED,
    fontSize: 9.5,
    marginTop: 4,
  },

  noPackageContainer: {
    paddingVertical: 35,
    alignItems: "center",
  },

  noPackageIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#F4E5F4",
    alignItems: "center",
    justifyContent: "center",
  },

  noPackageTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 13,
  },

  noPackageText: {
    color: MUTED,
    fontSize: 10.5,
    textAlign: "center",
    marginTop: 5,
  },

  calendarBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(35,15,38,0.42)",
  },

  calendarModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
  },

  calendarTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  calendarTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: "800",
  },

  calendarSubtitle: {
    color: MUTED,
    fontSize: 9.5,
    marginTop: 3,
  },

  monthNavigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },

  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F5EAF5",
    alignItems: "center",
    justifyContent: "center",
  },

  monthTitle: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
  },

  weekRow: {
    flexDirection: "row",
    marginTop: 18,
  },

  weekText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },

  dayCell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },

  dayCircleSelected: {
    backgroundColor: PRIMARY,
  },

  dayText: {
    color: TEXT,
    fontSize: 11,
    fontWeight: "600",
  },

  dayTextDisabled: {
    color: "#D4CAD5",
  },

  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});