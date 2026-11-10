import { currencySymbol } from '@/utils/currency';
import { pricingLabel } from '@/utils/packagePricing';
import PackagePricingLabel from '@/components/booking/PackagePricingLabel';
import PackagePricingFields from '@/components/booking/PackagePricingFields';
import { PackagePricing, PricingMethod, pricingFieldsError, } from '@/utils/packagePricing';
import getVendorPricingOptions from '@/services/getVendorPricingOptions';
import InfoHelp from '@/components/booking/InfoHelp';
import { packagePreviewStyles } from '@/components/booking/packagePreviewStyles';
import DeliveryDetails from '@/components/booking/DeliveryDetails';
import DeliveryPackageFields from '@/components/booking/DeliveryPackageFields';
import { deliveryWindowHelp, defaultDelivery, deliverySettings, deliverySettingsError, DeliverySettings } from '@/utils/deliveryBooking';
// fyp-mobile/components/VPDAddNewPackages/VPDAddNewPackages.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { View,Text,TextInput,TouchableOpacity,StyleSheet,ScrollView,Alert,ActivityIndicator,KeyboardAvoidingView,Platform,Image,} from "react-native";
import { router,useLocalSearchParams,Stack,} from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { uploadPackageImages } from "@/services/uploadPackageImages";
import postAddPackages from "@/services/postAddPackages";
import updatePackage from "@/services/updatePackage";
import { getVendorPackagesList } from "@/services/getVendorPackagesList";
import { getSubscriptionAccessState } from "@/services/getSubscriptionAccessState";
import type { SubscriptionAccessState } from "@/types/subscription.types";
import * as ImageManipulator from "expo-image-manipulator";
import {
  getSecureData,
  getUserData,
} from "@/store";

type DurationUnit = "HOURS" | "DAYS";

type BookingType =
  | "DURATION_BASED"
  | "TIME_SLOT_BASED"
  | "DELIVERY_BASED"
  | "SETUP_BASED";

interface PackageDuration {
  value: number;
  unit: DurationUnit;
  price: number;
}

type PackageImageAsset = {
  uri: string;
  name: string;
  type: string;
};

interface PackageForm {
  packageName: string;
  price: string;
  description: string;
  services: string;
  durations: PackageDuration[];
  allowCustomDuration: boolean;
  customDurationUnit: DurationUnit;
  customDurationRate: string;
}

const screenOptions = {
  headerShown: false,
};

const EMPTY_DURATION: PackageDuration = {
  value: 1,
  unit: "HOURS",
  price: 0,
};

const bookingTypeOptions: {
  label: string;
  value: BookingType;
}[] = [
  { label: "Duration Based", value: "DURATION_BASED" },
  { label: "Time Slot Based", value: "TIME_SLOT_BASED" },
  { label: "Delivery Based", value: "DELIVERY_BASED" },
  { label: "Setup Based", value: "SETUP_BASED" },
];

// ===========================================================
// Friendly time helpers
// ---------------------------------------------------------
// The backend stores everything as plain numbers of minutes
// (a signed "offset" relative to the event start time, and a
// plain "required duration"). Typing raw minutes like "-120"
// is confusing for a vendor, so the UI below lets them pick a
// number + a unit (Hours/Days) + Before/After the event, and
// these helpers convert that back and forth to minutes.
// ===========================================================

import { EMPTY_OFFSET, OFFSET_UNITS, offsetUnitLabel, offsetToMinutes, minutesToOffset, serviceWindowError, type FriendlyOffset, type OffsetDirection } from "@/utils/serviceWindowInput";
import { compactUnitLabels, iosTimingStyles } from "@/components/packageTiming/iosTimingStyles";
type DurationInputUnit = "MINUTES" | "HOURS" | "DAYS";

interface FriendlyDuration {
  value: string;
  unit: DurationInputUnit;
}

const EMPTY_DURATION_INPUT: FriendlyDuration = {
  value: "",
  unit: "MINUTES",
};

// number typed by vendor + unit -> plain minutes for the backend
function durationInputToMinutes(
  duration: FriendlyDuration,
): number | undefined {
  const numeric = Number(duration.value);

  if (
    duration.value.trim().length === 0 ||
    !Number.isFinite(numeric)
  ) {
    return undefined;
  }

  return duration.unit === "DAYS" ? numeric * 1440 : duration.unit === "HOURS" ? numeric * 60 : numeric;
}

// plain minutes from the backend/DB -> friendly value+unit for the UI
function minutesToDurationInput(
  minutes: number | undefined | null,
): FriendlyDuration {
  if (
    minutes === undefined ||
    minutes === null ||
    !Number.isFinite(minutes)
  ) {
    return { ...EMPTY_DURATION_INPUT };
  }

  if (minutes >= 1440 && minutes % 1440 === 0) return { value: String(minutes / 1440), unit: "DAYS" };
  if (minutes >= 60 && minutes % 60 === 0) return { value: String(minutes / 60), unit: "HOURS" };

  return {
    value: String(minutes),
    unit: "MINUTES",
  };
}

// friendly, human display strings used in the live Preview card
function formatDurationDisplay(
  minutes: number | undefined,
): string {
  if (minutes === undefined || !Number.isFinite(minutes)) {
    return "—";
  }

  if (minutes >= 1440 && minutes % 1440 === 0) { const days = minutes / 1440; return `${days} day${days === 1 ? "" : "s"}`; }


  if (minutes >= 60 && minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function formatOffsetDisplay(
  minutes: number | undefined,
): string {
  if (minutes === undefined || !Number.isFinite(minutes)) {
    return "—";
  }

  if (minutes === 0) {
    return "Right when the event starts";
  }

  const direction = minutes < 0 ? "before" : "after";
  const abs = Math.abs(minutes);

  if (abs % (24 * 60) === 0) {
    const days = abs / (24 * 60);
    return `${days} day${days === 1 ? "" : "s"} ${direction} the event`;
  }

  if (abs % 60 === 0) {
    const hours = abs / 60;
    return `${hours} hour${hours === 1 ? "" : "s"} ${direction} the event`;
  }

  return `${abs} minute${abs === 1 ? "" : "s"} ${direction} the event`;
}

export default function VendorPackagesScreen() {
  const { packageId } = useLocalSearchParams<{
    packageId?: string;
  }>();

  const isEditMode = !!packageId;

  const insets = useSafeAreaInsets();

  const [pricing, setPricing] = useState<PackagePricing>({ pricingMethod: 'FIXED' });
  const [pricingOptions, setPricingOptions] = useState<PricingMethod[]>([]);
  const [packageName, setPackageName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState("");

  const [delivery, setDelivery] = useState<DeliverySettings>({...defaultDelivery});
  const [bookingType, setBookingType] =
  useState<BookingType | "">("DURATION_BASED");

// Friendly (vendor-facing) state — never raw signed minutes.
// "How long does the task take" (delivery drop-off, setup, a time slot)
const [serviceDuration, setServiceDuration] =
  useState<FriendlyDuration>({ ...EMPTY_DURATION_INPUT });

// "How early can it happen, relative to the event" (e.g. "2 hours before")
const [windowStart, setWindowStart] = useState<FriendlyOffset>({
  ...EMPTY_OFFSET,
  direction: "BEFORE",
});

// "How late can it happen, relative to the event" (e.g. "at event start")
const [windowEnd, setWindowEnd] = useState<FriendlyOffset>({
  ...EMPTY_OFFSET,
  direction: "AFTER",
});

// Derived plain-minute values — this is what actually gets sent to
// the backend and used in validation. Nothing above the vendor's
// eyes ever shows these raw numbers.
const requiredServiceDurationMinutesValue = useMemo(
  () => durationInputToMinutes(serviceDuration),
  [serviceDuration],
);

const useCompactTiming = Platform.OS === "ios" &&
  (bookingType === "SETUP_BASED" || bookingType === "DELIVERY_BASED");
const serviceWindowStartOffsetMinutesValue = useMemo(
  () => offsetToMinutes(windowStart),
  [windowStart],
);

const serviceWindowEndOffsetMinutesValue = useMemo(
  () => offsetToMinutes(windowEnd),
  [windowEnd],
);

  const [durations, setDurations] = useState<
    PackageDuration[]
  >([]);

  const [allowCustomDuration, setAllowCustomDuration] = useState(false);
  const [customDurationUnit, setCustomDurationUnit] = useState<DurationUnit>("HOURS");
  const [customDurationRate, setCustomDurationRate] = useState("");
  const [baseIncludedHours, setBaseIncludedHours] = useState("");
  const [baseIncludedUnit, setBaseIncludedUnit] = useState<DurationUnit>("HOURS");
  const includedMinutes = Number(baseIncludedHours) * (baseIncludedUnit === "DAYS" ? 1440 : 60);
const [existingImages, setExistingImages] = useState<string[]>([]);
const [imageAssets, setImageAssets] = useState<PackageImageAsset[]>([]);
const [uploadProgress, setUploadProgress] = useState(0);
const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
const [loadingPackage, setLoadingPackage] = useState(isEditMode);

const [subscriptionAccess, setSubscriptionAccess] =
  useState<SubscriptionAccessState | null>(null);

const [loadingSubscription, setLoadingSubscription] =
  useState(true);

  const [subscriptionLoadError, setSubscriptionLoadError] =
  useState(false);

const [vendorId, setVendorId] = useState<string | null>(null);
const [currentPackageCount, setCurrentPackageCount] = useState(0);

  
  // UI-only focus state
  const [focusedField, setFocusedField] = useState<
    string | null
  >(null);

  // ---------------------------------------------------------
  // Stable focus handlers
  // ---------------------------------------------------------

  const focusName = useCallback(
    () => setFocusedField("name"),
    [],
  );

  const focusPrice = useCallback(
    () => setFocusedField("price"),
    [],
  );

  const focusDescription = useCallback(
    () => setFocusedField("description"),
    [],
  );

  const focusServices = useCallback(
    () => setFocusedField("services"),
    [],
  );

  const clearFocus = useCallback(
    () => setFocusedField(null),
    [],
  );

  useEffect(() => {
  const loadSubscriptionAccess = async () => {
    setLoadingSubscription(true);
    setSubscriptionLoadError(false);

    try {
      // =====================================================
      // READ VENDOR FROM EITHER STORAGE
      // =====================================================

      const userData = await getUserData();

      if (!userData?._id) {
        throw new Error(
          "Logged-in vendor could not be found in storage",
        );
      }

      const allowed = await getVendorPricingOptions(userData);
      setPricingOptions(allowed);
      setPricing(current => ({ ...current, pricingMethod: allowed[0] }));
      const id = String(userData._id);

      setVendorId(id);

      console.log(
        "[ADD PACKAGE VENDOR ID]",
        id,
      );

      // =====================================================
      // SUBSCRIPTION ACCESS
      // =====================================================

      const access =
        await getSubscriptionAccessState(id);

      console.log(
        "[ADD PACKAGE ACCESS]",
        JSON.stringify(access, null, 2),
      );

      setSubscriptionAccess(access);
      setSubscriptionLoadError(false);

      // =====================================================
      // PACKAGE COUNT
      // =====================================================

      try {
        const vendorPackages =
          await getVendorPackagesList(id);

        const count =
          Array.isArray(vendorPackages)
            ? vendorPackages.length
            : 0;

        setCurrentPackageCount(count);

        console.log(
          "[ADD PACKAGE COUNT]",
          count,
        );
      } catch (packageError) {
        console.error(
          "[ADD PACKAGE COUNT ERROR]",
          packageError,
        );

        setCurrentPackageCount(
          Array.isArray(userData?.packages)
            ? userData.packages.length
            : 0,
        );
      }
    } catch (error) {
      console.error(
        "[ADD PACKAGE SUBSCRIPTION ERROR]",
        error,
      );

      setSubscriptionAccess(null);
      setSubscriptionLoadError(true);
    } finally {
      setLoadingSubscription(false);
    }
  };

  loadSubscriptionAccess();
}, []);

  const maxPackages =
  subscriptionAccess?.limits?.maxPackages ?? 0;

const maxImagesPerPackage =
  subscriptionAccess?.limits?.maxImagesPerPackage ?? 0;

const packageLimitReached =
  !isEditMode &&
  !loadingSubscription &&
  !subscriptionLoadError &&
  subscriptionAccess !== null &&
  currentPackageCount >= maxPackages;

const totalCurrentImages =
  existingImages.length + imageAssets.length;

const remainingPackageImageSlots = Math.max(
  0,
  maxImagesPerPackage - totalCurrentImages
);

const packageImageLimitReached =
  !loadingSubscription &&
  !subscriptionLoadError &&
  subscriptionAccess !== null &&
  remainingPackageImageSlots <= 0;

  // ---------------------------------------------------------
  // Load existing package in edit mode
  // ---------------------------------------------------------

  useEffect(() => {
    const loadPackage = async () => {
      if (!isEditMode || !packageId) {
        setLoadingPackage(false);
        return;
      }

      try {
        const userRaw = await getSecureData("user");

if (!userRaw) {
  Alert.alert(
    "Error",
    "Vendor data not found. Please log in again.",
  );
  return;
}

const userData = JSON.parse(userRaw);

const id: string | undefined = userData?._id;

if (!id) {
  Alert.alert(
    "Error",
    "Vendor ID not found. Please log in again.",
  );
  return;
}

const vendorPackages =
  await getVendorPackagesList(id);

const existingPackage =
  vendorPackages.find(
    (pkg) =>
      String(pkg._id) === String(packageId),
  );

        if (!existingPackage) {
          Alert.alert(
            "Error",
            "Package details could not be found.",
          );
          return;
        }

        setPricing({ pricingMethod: existingPackage.pricingMethod || 'FIXED', groupSize: existingPackage.groupSize });
        setPackageName(
          existingPackage.packageName || "",
        );

        setPrice(
          existingPackage.price !== undefined &&
            existingPackage.price !== null
            ? String(existingPackage.price)
            : "",
        );

        setDescription(
          existingPackage.description || "",
        );

        setServices(
          existingPackage.services || "",
        );

    setDelivery(deliverySettings(existingPackage));
         setBookingType(
          String(existingPackage.bookingType) === "CUSTOM" ? "" : existingPackage.bookingType || "DURATION_BASED",
        );

        setServiceDuration(
          minutesToDurationInput(
            existingPackage.requiredServiceDurationMinutes,
          ),
        );

        setWindowStart(
          minutesToOffset(
            existingPackage.serviceWindowStartOffsetMinutes,
          ),
        );

        setWindowEnd(
          minutesToOffset(
            existingPackage.serviceWindowEndOffsetMinutes,
          ),
        );
        setDurations(
          Array.isArray(existingPackage.durations)
            ? existingPackage.durations.map(
                (duration: any) => ({
                  value: Number(
                    duration.value || 1,
                  ),
                  unit:
                    duration.unit === "DAYS"
                      ? "DAYS"
                      : "HOURS",
                  price: Number(
                    duration.price || 0,
                  ),
                }),
              )
            : [],
        );

        setBaseIncludedHours(existingPackage.baseIncludedDurationMinutes != null ? String(Number(existingPackage.baseIncludedDurationMinutes) / 60) : "");
        setBaseIncludedUnit("HOURS");
        setAllowCustomDuration(
          Boolean(
            existingPackage.allowCustomDuration,
          ),
        );

        setCustomDurationUnit(
          existingPackage.customDurationUnit ===
            "DAYS"
            ? "DAYS"
            : "HOURS",
        );
        setCustomDurationRate(
          existingPackage.customDurationRate !==
            undefined &&
            existingPackage.customDurationRate !==
              null
            ? String(
                existingPackage.customDurationRate,
              )
            : "",
        );

        setExistingImages(
        Array.isArray(existingPackage.images)
            ? existingPackage.images
            : []
        );
        setImageAssets([]);
      } catch (error) {
        console.error(
          "Error loading package:",
          error,
        );
        Alert.alert(
          "Error",
          "Could not load package details.",
        );
      } finally {
        setLoadingPackage(false);
      }
    };

    loadPackage();
  }, [isEditMode, packageId]);

  // ---------------------------------------------------------
  // Duration helpers
  // ---------------------------------------------------------

  const addDuration = () => {
    setDurations((prev) => [
      ...prev,
      {
        ...EMPTY_DURATION,
      },
    ]);
  };

  const removeDuration = (index: number) => {
    setDurations((prev) =>
      prev.filter((_, i) => i !== index),
    );
  };

  const updateDuration = (
    index: number,
    field: keyof PackageDuration,
    value: string | number | DurationUnit,
  ) => {
    setDurations((prev) =>
      prev.map((duration, i) =>
        i === index
          ? {
              ...duration,
              [field]: value,
            }
          : duration,
      ),
    );
  };

  const formatUnit = (unit: DurationUnit) => {
    return unit === "HOURS" ? "Hours" : "Days";
  };

  // ---------------------------------------------------------
// Package image picker
// ---------------------------------------------------------

const pickPackageImages = async () => {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow gallery access to select package images."
      );
      return;
    }

    if (loadingSubscription) {
  Alert.alert(
    "Please Wait",
    "Your subscription limits are still loading."
  );
  return;
}

if (subscriptionLoadError || !subscriptionAccess) {
  Alert.alert(
    "Subscription Unavailable",
    "We could not verify your subscription limits. Please check your connection and try again."
  );
  return;
}

if (maxImagesPerPackage <= 0) {
  Alert.alert(
    "Image Upload Unavailable",
    "Your current subscription does not allow new package image uploads. Please renew or upgrade your subscription."
  );
  return;
}

if (remainingPackageImageSlots <= 0) {
  Alert.alert(
    "Image Limit Reached",
    `Your current subscription allows up to ${maxImagesPerPackage} images per package.`,
    [
      { text: "Not Now", style: "cancel" },
      {
        text: "View Plans",
        onPress: () => {
          if (!vendorId) return;

          router.push({
            pathname: "/subscriptionscreen",
            params: { vendorId },
          });
        },
      },
    ]
  );
  return;
}

const remainingSlots =
  remainingPackageImageSlots;

const result =
  await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],

    // Select multiple package images in one gallery session
    allowsMultipleSelection: true,

    // Subscription-aware limit
    selectionLimit: remainingSlots,

    // Better multi-selection behavior on Android/Samsung
    legacy: Platform.OS === "android",

    allowsEditing: false,

    quality: 0.8,
  });

    if (result.canceled || !result.assets?.length) {
      return;
    }

        const compressedImages: PackageImageAsset[] = [];

    for (let index = 0; index < result.assets.length; index++) {
      const asset = result.assets[index];

      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1280 } }], // width se zyada bara nahi hoga
          {
            compress: 0.6, // 0 = zyada compress, 1 = original quality
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        compressedImages.push({
          uri: manipulated.uri,
          name:
            asset.fileName ||
            `package-${Date.now()}-${index}.jpg`,
          type: "image/jpeg",
        });
      } catch (compressError) {
        console.error("Image compression failed:", compressError);
        compressedImages.push({
          uri: asset.uri,
          name:
            asset.fileName ||
            `package-${Date.now()}-${index}.jpg`,
          type: asset.mimeType || "image/jpeg",
        });
      }
    }

    setImageAssets((prev) => [
      ...prev,
      ...compressedImages,
    ]);
  } catch (error) {
    console.error(
      "Error selecting package images:",
      error
    );

    Alert.alert(
      "Error",
      "Unable to select images. Please try again."
    );
  }
};

// ---------------------------------------------------------
// Remove newly selected image
// ---------------------------------------------------------

const removeImageAsset = (index: number) => {
  setImageAssets((prev) =>
    prev.filter((_, i) => i !== index)
  );
};

  // ---------------------------------------------------------
  // Validation
  // ---------------------------------------------------------

  const isFormValid = useMemo(() => {
  const hasName =
    packageName.trim().length > 0;

  const numericPrice = Number(price);

  const hasPrice =
    price.trim().length > 0 &&
    Number.isFinite(numericPrice) &&
    numericPrice >= 0;

  if (!pricingOptions.length || pricingFieldsError(pricing) || !bookingType || !hasName || !hasPrice) {
    return false;
  }

  if (bookingType === "DURATION_BASED") {
    if (!baseIncludedHours.trim() || !Number.isFinite(includedMinutes) || includedMinutes <= 0) return false;
    const tiers = [{ minutes: includedMinutes, price: numericPrice }, ...durations.map(d => ({ minutes: Number(d.value) * (d.unit === "DAYS" ? 1440 : 60), price: Number(d.price) }))].sort((a,b) => a.minutes - b.minutes);
    if (tiers.some((t,i) => !Number.isFinite(t.minutes) || !Number.isFinite(t.price) || (i > 0 && (t.minutes <= tiers[i-1].minutes || t.price < tiers[i-1].price)))) return false;
    const validDurations = durations.every(
      (duration) =>
        Number(duration.value) > 0 &&
        Number(duration.price) >= 0,
    );

    const customValid = allowCustomDuration
      ? customDurationRate.trim().length > 0 &&
        Number(customDurationRate) > 0
      : true;

    return validDurations && customValid;
  }

  if (bookingType === "TIME_SLOT_BASED") {
    return (
      requiredServiceDurationMinutesValue !== undefined &&
      requiredServiceDurationMinutesValue > 0
    );
  }

  const startOffset = serviceWindowStartOffsetMinutesValue;
  const endOffset = serviceWindowEndOffsetMinutesValue;

  const validWindow = !serviceWindowError(startOffset, endOffset, bookingType === "DELIVERY_BASED" ? undefined : requiredServiceDurationMinutesValue) && (bookingType !== "SETUP_BASED" || (startOffset !== undefined && startOffset <= 0 && endOffset !== undefined && endOffset <= 0));

  if (bookingType === "DELIVERY_BASED" && deliverySettingsError(delivery)) return false;
  if (bookingType === "DELIVERY_BASED") {
    return validWindow;
  }

  const validRequiredDuration =
    requiredServiceDurationMinutesValue !== undefined &&
    requiredServiceDurationMinutesValue > 0;

  return validRequiredDuration && validWindow;
}, [
  pricing, pricingOptions,
  packageName,
  price,
  delivery,
  bookingType,
  durations,
  baseIncludedHours,
  baseIncludedUnit,
  allowCustomDuration,
  customDurationRate,
  requiredServiceDurationMinutesValue,
  serviceWindowStartOffsetMinutesValue,
  serviceWindowEndOffsetMinutesValue,
]);
    // ---------------------------------------------------------
  // Upload images with 1 automatic retry on transient server errors
  // ---------------------------------------------------------

  const uploadImagesWithRetry = async (
    targetId: string,
    assets: PackageImageAsset[],
    onProgress: (progress: number) => void,
    retriesLeft = 1
  ): Promise<void> => {
    try {
      await uploadPackageImages(targetId, assets, onProgress);
    } catch (error: any) {
      const status = error?.response?.status || error?.status;
      const isRetryable = status === 520 || status === 502 || status === 503;

      if (isRetryable && retriesLeft > 0) {
        console.warn(`Upload failed (status ${status}), retrying in 5s...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return uploadImagesWithRetry(targetId, assets, onProgress, retriesLeft - 1);
      }

      throw error;
    }
  };

  // ---------------------------------------------------------
  // Save package
  // ---------------------------------------------------------

 const handleSave = async () => {
  if (!bookingType || !isFormValid) {
    Alert.alert(
      "Incomplete Form",
   "Please complete the required package and booking configuration."    );
    return;
  }

  if (loadingSubscription) {
  Alert.alert(
    "Please Wait",
    "Your subscription limits are still loading."
  );
  return;
}

if (subscriptionLoadError || !subscriptionAccess) {
  Alert.alert(
    "Subscription Unavailable",
    "We could not verify your subscription limits. Please check your connection and try again."
  );
  return;
}

if (!isEditMode && packageLimitReached) {
  Alert.alert(
    "Package Limit Reached",
    `Your current subscription allows up to ${maxPackages} packages.`,
    [
      { text: "Not Now", style: "cancel" },
      {
        text: "View Plans",
        onPress: () => {
          if (!vendorId) return;

          router.push({
            pathname: "/subscriptionscreen",
            params: { vendorId },
          });
        },
      },
    ]
  );
  return;
}

if (
  imageAssets.length > 0 &&
  totalCurrentImages > maxImagesPerPackage
) {
  Alert.alert(
    "Image Limit Reached",
    `Your current subscription allows up to ${maxImagesPerPackage} images per package.`
  );
  return;
}
  setLoading(true);

  try {
   const storedUser = await getUserData();

const userId: string | undefined =
  storedUser?._id;

if (!userId) {
  Alert.alert(
    "Error",
    "Could not find logged-in vendor. Please log in again.",
  );
  return;
}

    const cleanedDurations =
      durations.map((duration) => ({
        value: Number(duration.value),
        unit: duration.unit,
        price: Number(duration.price),
      }));

    const payload = {
  pricingMethod: pricing.pricingMethod,
  groupSize: pricing.pricingMethod === 'GROUP' ? pricing.groupSize : null,
  ...(bookingType === "DELIVERY_BASED" ? deliverySettings(delivery) : {}),
  packageName: packageName.trim(),

  price: Number(price),

  description: description.trim(),

  services: services.trim(),

  bookingType,

  requiredServiceDurationMinutes:
    bookingType !== "DURATION_BASED" &&
    bookingType !== "DELIVERY_BASED"
      ? requiredServiceDurationMinutesValue
      : undefined,

  serviceWindowStartOffsetMinutes:
    bookingType === "DELIVERY_BASED" ||
    bookingType === "SETUP_BASED"
      ? serviceWindowStartOffsetMinutesValue
      : undefined,

  serviceWindowEndOffsetMinutes:
    bookingType === "DELIVERY_BASED" ||
    bookingType === "SETUP_BASED"
      ? serviceWindowEndOffsetMinutesValue
      : undefined,

  baseIncludedDurationMinutes: bookingType === "DURATION_BASED" ? includedMinutes : undefined,

  durations:
    bookingType === "DURATION_BASED"
      ? cleanedDurations
      : [],

  allowCustomDuration:
    bookingType === "DURATION_BASED"
      ? allowCustomDuration
      : false,

  customDurationUnit:
    bookingType === "DURATION_BASED" &&
    allowCustomDuration
      ? customDurationUnit
      : undefined,

  customDurationRate:
    bookingType === "DURATION_BASED" &&
    allowCustomDuration
      ? Number(customDurationRate)
      : undefined,
};

    // =====================================================
    // EDIT PACKAGE
    // =====================================================

        if (isEditMode) {
      await updatePackage(
        packageId as string,
        payload
      );

      // Upload newly selected images
      let editImageUploadFailed = false;

      if (imageAssets.length > 0) {
        try {
          setUploadingImages(true);
          setUploadProgress(0);

            await uploadImagesWithRetry(
            packageId as string,
            imageAssets,
            (progress) => {
              setUploadProgress(progress);
            }
          );

          setUploadProgress(100);
        } catch (imgErr) {
          console.error("Image upload failed:", imgErr);
          editImageUploadFailed = true;
        } finally {
          setUploadingImages(false);
        }
      }

      Alert.alert(
        editImageUploadFailed ? "Package Saved" : "Success",
        editImageUploadFailed
          ? "Your changes were saved, but the images couldn't be uploaded (server error). Please try adding images again."
          : "Package updated successfully.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );

      return;
    }

    // =====================================================
    // CREATE PACKAGE
    // =====================================================

    const response =
      await postAddPackages(userId, {
        packages: [payload],
      });

    console.log(
      "Package creation response:",
      response
    );

    const returnedPackages =
      response?.packages ||
      response?.user?.packages ||
      [];

    if (
      !Array.isArray(returnedPackages) ||
      returnedPackages.length === 0
    ) {
      throw new Error(
        "Package created but package ID could not be found."
      );
    }

    const createdPackage =
      returnedPackages[
        returnedPackages.length - 1
      ];

    const createdPackageId =
      createdPackage?._id?.toString();

    if (!createdPackageId) {
      throw new Error(
        "Created package ID is missing."
      );
    }

        // =====================================================
    // Upload package images
    // =====================================================

    let imageUploadFailed = false;

    if (imageAssets.length > 0) {
      try {
        setUploadingImages(true);
        setUploadProgress(0);

        await uploadImagesWithRetry(
          createdPackageId,
          imageAssets,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        setUploadProgress(100);
      } catch (imgErr) {
        console.error("Image upload failed:", imgErr);
        imageUploadFailed = true;
      } finally {
        setUploadingImages(false);
      }
    }

    Alert.alert(
      imageUploadFailed ? "Package Saved" : "Success",
      imageUploadFailed
        ? "Your package was saved, but the images couldn't be uploaded (server error). You can edit this package to add images again."
        : "Package created successfully.",
      [
        {
          text: "OK",
          onPress: () =>
            router.back(),
        },
      ]
    );
  } catch (err: any) {
    console.error(
      "Error saving package:",
      err?.response?.data ||
        err?.message ||
        err
    );

    Alert.alert(
      "Error",
      (typeof err?.response?.data?.message === "string"
        ? err.response.data.message
        : typeof err?.response?.data?.message?.message === "string"
          ? err.response.data.message.message
          : typeof err?.message === "string"
            ? err.message
            : "Could not save package. Try again.")
    );
  } finally {
    setLoading(false);
  }
};

  // ---------------------------------------------------------
  // Loading edit package
  // ---------------------------------------------------------

  if (loadingPackage) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color="#7B2869"
        />

        <Text style={styles.loadingText}>
          Loading package details...
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------
  // Main screen
  // ---------------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: "#FAF6F9",
      }}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      keyboardVerticalOffset={
        Platform.OS === "ios"
          ? insets.top
          : 0
      }
    >
      <Stack.Screen options={screenOptions} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 48,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topHeaderRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}><Text style={styles.backButtonIcon}>‹</Text></TouchableOpacity>
          <Text style={styles.topHeaderTitle}>{isEditMode ? "Edit Package" : "Add New Package"}</Text>
          <View style={{ width: 42 }} />
        </View>
        <Text style={styles.topHeaderSubtitle}>{isEditMode ? "Update the details of this package" : "Build a package clients will love"}</Text>
        {/* -------------------------------------------------
            Package Basic Information
        ------------------------------------------------- */}

        <View style={styles.card}>
          {/* Package Name */}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Package Name
            </Text>

            <TextInput
              style={[
                styles.input,
                focusedField === "name" &&
                  styles.inputFocused,
              ]}
              value={packageName}
              onChangeText={setPackageName}
              onFocus={focusName}
              onBlur={clearFocus}
              placeholder="e.g. Gold Wedding Package"
              placeholderTextColor="#9C9CA3"
            />
          </View>

          {/* Base Price */}

          <PackagePricingFields value={pricing} allowed={pricingOptions} onChange={setPricing} />
          <View style={styles.fieldGroup}>
  <Text style={styles.label}>
    {pricing.pricingMethod === 'PER_PERSON' ? 'Price per person' : pricing.pricingMethod === 'GROUP' ? 'Price per group' : 'Base Package Price'}
  </Text>

  <View style={styles.priceContainer}>
    <Text style={styles.pricePrefix}>
      {currencySymbol()}
    </Text>

    <TextInput
      style={styles.priceInput}
      value={price}
      onChangeText={setPrice}
      keyboardType="number-pad"
      inputMode="numeric"
      placeholder="80000"
      placeholderTextColor="#9C9CA3"
      editable={true}
      autoCorrect={false}
    />
  </View>
</View>

          {/* Description */}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              Description
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.textArea,
                focusedField ===
                  "description" &&
                  styles.inputFocused,
              ]}
              value={description}
              onChangeText={setDescription}
              onFocus={focusDescription}
              onBlur={clearFocus}
              multiline
              placeholder="Describe what this package offers..."
              placeholderTextColor="#9C9CA3"
            />
          </View>

          {/* Services */}

          <View
            style={[
              styles.fieldGroup,
              { marginBottom: 0 },
            ]}
          >
            <Text style={styles.label}>
              What's Included
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.textArea,
                focusedField ===
                  "services" &&
                  styles.inputFocused,
              ]}
              value={services}
              onChangeText={setServices}
              onFocus={focusServices}
              onBlur={clearFocus}
              multiline
              placeholder="e.g. Photography, Videography, Drone, Album..."
              placeholderTextColor="#9C9CA3"
            />
          </View>
        </View>

{/* Booking Type */}

<View style={styles.card}>
  <View style={{flexDirection:'row',alignItems:'center',gap:3}}>
    <Text style={styles.sectionTitle}>Booking Type</Text>
    {bookingType === "DELIVERY_BASED" && <InfoHelp title="Booking Type" message="Select how this package uses vendor availability. Delivery Based lets customers choose an available delivery time." />}
  </View>
  {bookingType !== "DELIVERY_BASED" && <Text style={styles.sectionSubtitle}>
    Select how this package uses vendor availability.
  </Text>}

  <View style={{ marginTop: 14, gap: 10 }}>
    {bookingTypeOptions.map((option) => {
      const selected =
        bookingType === option.value;

      return (
        <TouchableOpacity
          key={option.value}
          onPress={() =>
            setBookingType(option.value)
          }
          activeOpacity={0.8}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: selected
              ? "#7B2869"
              : "#E5D8E2",
            backgroundColor: selected
              ? "#F5EAF2"
              : "#FFFFFF",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: selected
                ? "700"
                : "500",
              color: selected
                ? "#7B2869"
                : "#333333",
            }}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
</View>

        {/* -------------------------------------------------
            Fixed Duration Options
        ------------------------------------------------- */}
         {bookingType === "DELIVERY_BASED" && <>
  <DeliveryPackageFields value={delivery} onChange={setDelivery} />
</>}
  {bookingType === "DURATION_BASED" && (
  <>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Base Package Included Time</Text>
      <Text style={styles.sectionSubtitle}>Choose how much coverage is included in the base price.</Text>
      <View style={styles.includedTimePanel}>
        <Text style={styles.smallLabel}>Included duration</Text>
        <View style={styles.includedTimeRow}>
          <TextInput style={styles.includedTimeInput} keyboardType="decimal-pad" placeholder="e.g. 2" value={baseIncludedHours} onChangeText={setBaseIncludedHours} />
          {(["HOURS", "DAYS"] as DurationUnit[]).map((unit) => (
            <TouchableOpacity key={unit} style={[styles.includedTimeUnit, baseIncludedUnit === unit && styles.includedTimeUnitActive]} onPress={() => {
              if (unit !== baseIncludedUnit) {
                if (baseIncludedHours.trim() && Number.isFinite(Number(baseIncludedHours))) setBaseIncludedHours(String(Number((unit === "DAYS" ? Number(baseIncludedHours) / 24 : Number(baseIncludedHours) * 24).toFixed(4))));
                setBaseIncludedUnit(unit);
              }
            }}>
              <Text style={[styles.includedTimeUnitText, baseIncludedUnit === unit && styles.includedTimeUnitTextActive]}>{unit === "HOURS" ? "Hours" : "Days"}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {Number.isFinite(includedMinutes) && includedMinutes > 0 && <Text style={styles.includedTimeSummary}>Base {currencySymbol()} {Number(price || 0).toLocaleString()} includes {baseIncludedHours} {baseIncludedUnit === "DAYS" ? "day(s)" : "hour(s)"}</Text>}
      </View>
      <Text style={styles.includedTimeHint}>Fixed duration prices are full prices, not extra charges. Longer durations cannot cost less.</Text>
    </View>
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderTextWrap}>
              
              <Text
                style={styles.sectionTitle}
              >
                Fixed Duration Options
              </Text>

              <Text
                style={styles.sectionSubtitle}
              >
                Add one or more predefined
                durations and prices.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addDurationButton}
              onPress={addDuration}
              activeOpacity={0.8}
            >
              <Text
                style={styles.addDurationText}
              >
                + Add
              </Text>
            </TouchableOpacity>
          </View>

          {durations.length === 0 ? (
            <View
              style={
                styles.emptyDurationBox
              }
            >
              <Text
                style={styles.emptyDurationTitle}
              >
                No fixed durations added
              </Text>

              <Text
                style={styles.emptyDurationText}
              >
                Add options like 4 Hours, 8
                Hours, 1 Day or 2 Days.
              </Text>
            </View>
          ) : (
            durations.map(
              (
                duration,
                index,
              ) => (
                <View
                  key={`duration-${index}`}
                  style={
                    styles.durationEditorCard
                  }
                >
                  {/* Duration top row */}

                  <View
                    style={
                      styles.durationEditorHeader
                    }
                  >
                    <Text
                      style={
                        styles.durationEditorTitle
                      }
                    >
                      Duration {index + 1}
                    </Text>

                    <TouchableOpacity
                      onPress={() =>
                        removeDuration(index)
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={
                          styles.removeDurationText
                        }
                      >
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Value + Unit */}

                  <View
                    style={
                      styles.durationFieldsRow
                    }
                  >
                    <View
                      style={
                        styles.durationValueWrapper
                      }
                    >
                      <Text
                        style={
                          styles.smallLabel
                        }
                      >
                        Value
                      </Text>

                      <TextInput
                        style={styles.smallInput}
                        value={String(
                          duration.value,
                        )}
                        onChangeText={(
                          value,
                        ) =>
                          updateDuration(
                            index,
                            "value",
                            Number(
                              value.replace(
                                /[^0-9]/g,
                                "",
                              ) || 0,
                            ),
                          )
                        }
                        keyboardType="numeric"
                        placeholder="4"
                        placeholderTextColor="#9C9CA3"
                      />
                    </View>

                    <View
                      style={
                        styles.durationUnitWrapper
                      }
                    >
                      <Text
                        style={
                          styles.smallLabel
                        }
                      >
                        Unit
                      </Text>

                      <View
                        style={
                          styles.unitToggleRow
                        }
                      >
                        {(
                          [
                            "HOURS",
                            "DAYS",
                          ] as DurationUnit[]
                        ).map(
                          (unit) => {
                            const active =
                              duration.unit ===
                              unit;

                            return (
                              <TouchableOpacity
                                key={unit}
                                style={[
                                  styles.unitButton,
                                  active &&
                                    styles.unitButtonActive,
                                ]}
                                onPress={() =>
                                  updateDuration(
                                    index,
                                    "unit",
                                    unit,
                                  )
                                }
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.unitButtonText,
                                    active &&
                                      styles.unitButtonTextActive,
                                  ]}
                                >
                                  {formatUnit(
                                    unit,
                                  )}
                                </Text>
                              </TouchableOpacity>
                            );
                          },
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Duration Price */}

                  <View
                    style={styles.durationPriceWrapper}
                  >
                    <Text
                      style={styles.smallLabel}
                    >
                      Duration Price
                    </Text>

                    <View
                      style={
                        styles.priceContainerSmall
                      }
                    >
                      <Text
                        style={
                          styles.pricePrefixSmall
                        }
                      >
                        {currencySymbol()}
                      </Text>

                      <TextInput
                        style={
                          styles.priceInputSmall
                        }
                        value={String(
                          duration.price,
                        )}
                        onChangeText={(
                          value,
                        ) =>
                          updateDuration(
                            index,
                            "price",
                            Number(
                              value.replace(
                                /[^0-9]/g,
                                "",
                              ) || 0,
                            ),
                          )
                        }
                        keyboardType="numeric"
                        placeholder="80000"
                        placeholderTextColor="#9C9CA3"
                      />
                    </View>
                  </View>
                </View>
              ),
            )
                    )}
        </View>

        {/* -------------------------------------------------
            Custom Duration
        ------------------------------------------------- */}

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View
              style={
                styles.sectionHeaderTextWrap
              }
            >
              <Text
                style={styles.sectionTitle}
              >
                Custom Duration
              </Text>

              <Text
                style={styles.sectionSubtitle}
              >
                Allow clients to request a duration
                outside the fixed options.
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.switchButton,
                allowCustomDuration &&
                  styles.switchButtonActive,
              ]}
              onPress={() =>
                setAllowCustomDuration(
                  (prev) => !prev,
                )
              }
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.switchCircle,
                  allowCustomDuration &&
                    styles.switchCircleActive,
                ]}
              />

              <Text
                style={[
                  styles.switchText,
                  allowCustomDuration &&
                    styles.switchTextActive,
                ]}
              >
                {allowCustomDuration
                  ? "ON"
                  : "OFF"}
              </Text>
            </TouchableOpacity>
          </View>

          {allowCustomDuration && (
            <View
              style={
                styles.customDurationContent
              }
            >
              {/* Custom Unit */}

              <Text
                style={styles.smallLabel}
              >
                Custom Duration Unit
              </Text>

              <View
                style={styles.unitToggleRow}
              >
                {(
                  [
                    "HOURS",
                    "DAYS",
                  ] as DurationUnit[]
                ).map((unit) => {
                  const active =
                    customDurationUnit ===
                    unit;

                  return (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.customUnitButton,
                        active &&
                          styles.customUnitButtonActive,
                      ]}
                      onPress={() =>
                        setCustomDurationUnit(
                          unit,
                        )
                      }
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.customUnitText,
                          active &&
                            styles.customUnitTextActive,
                        ]}
                      >
                        {formatUnit(unit)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Rate */}

              <Text
                style={[
                  styles.smallLabel,
                  { marginTop: 15 },
                ]}
              >
                Custom Duration Rate
              </Text>

              <View
                style={
                  styles.priceContainerSmall
                }
              >
                <Text
                  style={
                    styles.pricePrefixSmall
                  }
                >
                  {currencySymbol()}
                </Text>

                <TextInput
                  style={
                    styles.priceInputSmall
                  }
                  value={customDurationRate}
                  onChangeText={setCustomDurationRate}
                  keyboardType="numeric"
                  placeholder="20000"
                  placeholderTextColor="#9C9CA3"
                />

                <Text
                  style={styles.rateSuffix}
                >
                  /
                  {customDurationUnit ===
                  "DAYS"
                    ? "day"
                    : "hour"}
                </Text>
              </View>
            </View>
          )}
        </View>
  </>
)}

{/* -------------------------------------------------
    Non-Duration Booking Configuration
------------------------------------------------- */}

{bookingType !== "" && bookingType !== "DURATION_BASED" && (
  <View style={styles.card}>
    <View style={{flexDirection:"row",alignItems:"center",gap:3}}>
    <Text style={[styles.sectionTitle,{flexShrink:1}]}>
      {bookingType === "TIME_SLOT_BASED"
        ? "How long does this take?"
        : bookingType === "DELIVERY_BASED"
        ? "Delivery Window"
        : "Setup Duration & Allowed Window"}
    </Text>
    {bookingType === "DELIVERY_BASED" && <InfoHelp title="Delivery Window" message={deliveryWindowHelp(serviceWindowStartOffsetMinutesValue,serviceWindowEndOffsetMinutesValue)} />}
    </View>

    {bookingType !== "DELIVERY_BASED" && <Text style={styles.sectionSubtitle}>
      {bookingType === "TIME_SLOT_BASED"
        ? "This is how much of your time a single booking takes — e.g. a makeup session or a transport trip."
        : "Enter how long setup takes, the earliest it may start, and when it must be finished. The setup duration must fit inside this window."}
    </Text>}

    {/* --------------------------------------------------
        How long does it take (duration)
    -------------------------------------------------- */}

    {(bookingType === "TIME_SLOT_BASED" ||
      bookingType === "SETUP_BASED") && (
      <View style={[{ marginTop: 18 }, useCompactTiming && iosTimingStyles.field]}>
        <Text style={styles.smallLabel}>
          {bookingType === "TIME_SLOT_BASED"
            ? "Time needed per booking"
            : "Time needed to set up"}
        </Text>

        <View style={[styles.friendlyRow, useCompactTiming && iosTimingStyles.amountRow]}>
          <TextInput
            style={[styles.input, styles.friendlyValueInput, useCompactTiming && iosTimingStyles.amount]}
            value={serviceDuration.value}
            onChangeText={(value) =>
              setServiceDuration((prev) => ({
                ...prev,
                value: value.replace(/[^0-9]/g, ""),
              }))
            }
            keyboardType="numeric"
            placeholder={
              bookingType === "TIME_SLOT_BASED"
                ? "e.g. 1"
                : "e.g. 2"
            }
            placeholderTextColor="#9C9CA3"
          />

          <View style={[styles.friendlyToggleRow, useCompactTiming && iosTimingStyles.segments]}>
            {((bookingType === "SETUP_BASED" ? ["MINUTES", "HOURS", "DAYS"] : ["MINUTES", "HOURS"]) as DurationInputUnit[]).map(
              (unit) => {
                const active = serviceDuration.unit === unit;

                return (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.friendlyToggleButton,
                      active && styles.friendlyToggleButtonActive,
                      useCompactTiming && iosTimingStyles.segment,
                      useCompactTiming && active && iosTimingStyles.selectedSegment,
                    ]}
                    onPress={() =>
                      setServiceDuration((prev) => ({
                        ...prev,
                        unit,
                      }))
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.friendlyToggleText,
                        active && styles.friendlyToggleTextActive,
                      ]}
                    >
                      {useCompactTiming ? compactUnitLabels[unit] : unit === "MINUTES" ? "Minutes" : unit === "HOURS" ? "Hours" : "Days"}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </View>
        </View>
      </View>
    )}

    {/* --------------------------------------------------
        Earliest it can happen (window start)
    -------------------------------------------------- */}

    {bookingType !== "TIME_SLOT_BASED" && (
      <>
        <View style={[{ marginTop: 22 }, useCompactTiming && iosTimingStyles.field]}>
          <Text style={styles.smallLabel}>
            {bookingType === "DELIVERY_BASED"
              ? "Earliest delivery time"
              : "Earliest setup start"}
          </Text>

          <View style={[styles.friendlyRow, useCompactTiming && iosTimingStyles.amountRow]}>
            <TextInput
              style={[styles.input, styles.friendlyValueInput, useCompactTiming && iosTimingStyles.amount]}
              value={windowStart.value}
              onChangeText={(value) =>
                setWindowStart((prev) => ({
                  ...prev,
                  value: value.replace(/[^0-9]/g, ""),
                }))
              }
              keyboardType="numeric"
              placeholder="e.g. 2"
              placeholderTextColor="#9C9CA3"
            />

            <View style={[styles.friendlyToggleRow, useCompactTiming && iosTimingStyles.segments]}>
              {OFFSET_UNITS.map((unit) => {
                const active = windowStart.unit === unit;

                return (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.friendlyToggleButton,
                      active && styles.friendlyToggleButtonActive,
                      useCompactTiming && iosTimingStyles.segment,
                      useCompactTiming && active && iosTimingStyles.selectedSegment,
                    ]}
                    onPress={() =>
                      setWindowStart((prev) => ({ ...prev, unit }))
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.friendlyToggleText,
                        active && styles.friendlyToggleTextActive,
                      ]}
                    >
                      {useCompactTiming ? compactUnitLabels[unit] : offsetUnitLabel(unit)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {bookingType === "SETUP_BASED" ? (
            <Text style={{ marginTop: 8, color: "#77717A", fontSize: 13 }}>
              Before event start
            </Text>
          ) : (
            <View style={[styles.friendlyToggleRow, { marginTop: 8 }, useCompactTiming && iosTimingStyles.segments]}>
              {bookingType === "DELIVERY_BASED" && (
                <TouchableOpacity
                  onPress={() => setWindowStart((prev) => ({ ...prev, value: "0" }))}
                  style={useCompactTiming ? [
                    styles.friendlyDirectionButton,
                    iosTimingStyles.segment,
                    serviceWindowStartOffsetMinutesValue === 0 && iosTimingStyles.selectedSegment,
                  ] : { padding: 10 }}
                  accessibilityRole="button"
                  accessibilityState={useCompactTiming ? { selected: serviceWindowStartOffsetMinutesValue === 0 } : undefined}
                >
                  <Text style={useCompactTiming ? [
                    styles.friendlyToggleText,
                    serviceWindowStartOffsetMinutesValue === 0 && styles.friendlyToggleTextActive,
                  ] : { color: "#7B2869", fontWeight: "600" }}>
                    {useCompactTiming ? "At start" : "At event start"}
                  </Text>
                </TouchableOpacity>
              )}
              {(["BEFORE", "AFTER"] as OffsetDirection[]).map(
                (direction) => {
                  const active = windowStart.direction === direction &&
                    !(useCompactTiming && bookingType === "DELIVERY_BASED" && serviceWindowStartOffsetMinutesValue === 0);
  
                  return (
                    <TouchableOpacity
                      key={direction}
                      style={[
                        styles.friendlyDirectionButton,
                        active && styles.friendlyDirectionButtonActive,
                        useCompactTiming && iosTimingStyles.segment,
                        useCompactTiming && active && iosTimingStyles.selectedSegment,
                      ]}
                      onPress={() =>
                        setWindowStart((prev) => ({ ...prev, direction }))
                      }
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.friendlyToggleText,
                          active && styles.friendlyToggleTextActive,
                        ]}
                      >
                        {useCompactTiming
                          ? (direction === "BEFORE" ? "Before" : "After")
                          : direction === "BEFORE"
                          ? "Before the event"
                          : "After event starts"}
                      </Text>
                    </TouchableOpacity>
                  );
                },
              )}
            </View>
          )}
        </View>

        {/* --------------------------------------------------
            Latest it can happen (window end)
        -------------------------------------------------- */}

        <View style={[{ marginTop: 22 }, useCompactTiming && iosTimingStyles.field]}>
          <Text style={styles.smallLabel}>
            {bookingType === "DELIVERY_BASED"
              ? "Latest delivery time"
              : bookingType === "SETUP_BASED"
              ? "Setup completion deadline"
              : "Service completion deadline"}
          </Text>

          <View style={[styles.friendlyRow, useCompactTiming && iosTimingStyles.amountRow]}>
            <TextInput
              style={[styles.input, styles.friendlyValueInput, useCompactTiming && iosTimingStyles.amount]}
              value={windowEnd.value}
              onChangeText={(value) =>
                setWindowEnd((prev) => ({
                  ...prev,
                  value: value.replace(/[^0-9]/g, ""),
                }))
              }
              keyboardType="numeric"
              placeholder="e.g. 0"
              placeholderTextColor="#9C9CA3"
            />

            <View style={[styles.friendlyToggleRow, useCompactTiming && iosTimingStyles.segments]}>
              {OFFSET_UNITS.map((unit) => {
                const active = windowEnd.unit === unit;

                return (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.friendlyToggleButton,
                      active && styles.friendlyToggleButtonActive,
                      useCompactTiming && iosTimingStyles.segment,
                      useCompactTiming && active && iosTimingStyles.selectedSegment,
                    ]}
                    onPress={() =>
                      setWindowEnd((prev) => ({ ...prev, unit }))
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.friendlyToggleText,
                        active && styles.friendlyToggleTextActive,
                      ]}
                    >
                      {useCompactTiming ? compactUnitLabels[unit] : offsetUnitLabel(unit)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.friendlyToggleRow, { marginTop: 8 }, useCompactTiming && iosTimingStyles.segments]}>
            {bookingType === "DELIVERY_BASED" && (
              <TouchableOpacity
                onPress={() => setWindowEnd((prev) => ({ ...prev, value: "0" }))}
                style={useCompactTiming ? [
                  styles.friendlyDirectionButton,
                  iosTimingStyles.segment,
                  serviceWindowEndOffsetMinutesValue === 0 && iosTimingStyles.selectedSegment,
                ] : { padding: 10 }}
                accessibilityRole="button"
                accessibilityState={useCompactTiming ? { selected: serviceWindowEndOffsetMinutesValue === 0 } : undefined}
              >
                <Text style={useCompactTiming ? [
                  styles.friendlyToggleText,
                  serviceWindowEndOffsetMinutesValue === 0 && styles.friendlyToggleTextActive,
                ] : { color: "#7B2869", fontWeight: "600" }}>
                  {useCompactTiming ? "At start" : "At event start"}
                </Text>
              </TouchableOpacity>
            )}
            {((bookingType === "SETUP_BASED" ? ["BEFORE", "AFTER"] : ["BEFORE", "AFTER"]) as OffsetDirection[]).map(
              (direction) => {
                const active = windowEnd.direction === direction &&
                    !(useCompactTiming && bookingType === "DELIVERY_BASED" && serviceWindowEndOffsetMinutesValue === 0);

                return (
                  <TouchableOpacity
                    key={direction}
                    style={[
                      styles.friendlyDirectionButton,
                      active && styles.friendlyDirectionButtonActive,
                      useCompactTiming && iosTimingStyles.segment,
                      useCompactTiming && active && iosTimingStyles.selectedSegment,
                    ]}
                    onPress={() =>
                      setWindowEnd((prev) => bookingType === "SETUP_BASED" && direction === "AFTER" ? { ...prev, value: "0", direction: "AFTER" } : { ...prev, direction })
                    }
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.friendlyToggleText,
                        active && styles.friendlyToggleTextActive,
                      ]}
                    >
                      {useCompactTiming
                          ? (direction === "BEFORE" ? "Before" : bookingType === "SETUP_BASED" ? "At start" : "After")
                          : direction === "BEFORE"
                        ? "Before the event"
                        : bookingType === "SETUP_BASED" ? "At event start" : "At / after event starts"}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </View>

          {serviceWindowStartOffsetMinutesValue !== undefined && serviceWindowEndOffsetMinutesValue !== undefined && (bookingType !== "DELIVERY_BASED" || !!serviceWindowError(serviceWindowStartOffsetMinutesValue, serviceWindowEndOffsetMinutesValue, undefined)) && (
            <Text style={[styles.sectionSubtitle, { marginTop: 12 },
              serviceWindowError(serviceWindowStartOffsetMinutesValue, serviceWindowEndOffsetMinutesValue, bookingType === "DELIVERY_BASED" ? undefined : requiredServiceDurationMinutesValue) ? { color: "#B42318" } : {}]}>
              {serviceWindowError(serviceWindowStartOffsetMinutesValue, serviceWindowEndOffsetMinutesValue, bookingType === "DELIVERY_BASED" ? undefined : requiredServiceDurationMinutesValue) ||
                `Service window: ${formatOffsetDisplay(serviceWindowStartOffsetMinutesValue)} → ${formatOffsetDisplay(serviceWindowEndOffsetMinutesValue)}`}
            </Text>
          )}

          {bookingType !== "DELIVERY_BASED" && <Text style={[styles.sectionSubtitle, { marginTop: 8 }]}>
            {bookingType === "SETUP_BASED" ? 'Tip: choose 0 + "At event start" to finish exactly when the event begins.' : 'Tip: enter 0 + "After event starts" to mean right when the event begins.'}
          </Text>}
        </View>
      </>
    )}
  </View>
)}
        {/* -------------------------------------------------
            Package Images
        ------------------------------------------------- */}

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderTextWrap}>
              <Text style={styles.sectionTitle}>
                Package Images
              </Text>

              <Text style={styles.sectionSubtitle}>
                {loadingSubscription
              ? "Loading your package image limit..."
              : `Your plan allows up to ${maxImagesPerPackage} images per package.`}
              </Text>
            </View>

            <TouchableOpacity
          style={[
            styles.addDurationButton,
             (loading ||
              uploadingImages ||
              loadingSubscription) &&
              styles.addDurationButtonDisabled,
          ]}
          onPress={pickPackageImages}
          disabled={
          loading ||
          uploadingImages ||
          loadingSubscription
        }
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.addDurationText,
               loadingSubscription &&
              styles.addDurationTextDisabled,
            ]}
          >
            {packageImageLimitReached
              ? "Limit Reached"
              : "+ Gallery"}
          </Text>
        </TouchableOpacity>
          </View>

          {/* Existing images */}

          {existingImages.length > 0 && (
            <View style={styles.imageSectionBlock}>
              <Text style={styles.imageSectionLabel}>
                Existing Images
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={
                  styles.imageRow
                }
              >
                {existingImages.map(
                  (image, index) => (
                    <View
                      key={`existing-${image}-${index}`}
                      style={
                        styles.imagePreviewContainer
                      }
                    >
                      <Image
                        source={{
                          uri: image,
                        }}
                        style={
                          styles.imagePreview
                        }
                      />

                      <View
                        style={
                          styles.existingImageBadge
                        }
                      >
                        <Text
                          style={
                            styles.existingImageBadgeText
                          }
                        >
                          Existing
                        </Text>
                      </View>
                    </View>
                  )
                )}
              </ScrollView>
            </View>
          )}

          {/* Newly selected images */}

          {imageAssets.length > 0 && (
            <View style={styles.imageSectionBlock}>
              <Text style={styles.imageSectionLabel}>
                New Images
              </Text>

              <View style={styles.imageGrid}>
                {imageAssets.map(
                  (image, index) => (
                    <View
                      key={`${image.uri}-${index}`}
                      style={
                        styles.imagePreviewContainer
                      }
                    >
                      <Image
                        source={{
                          uri: image.uri,
                        }}
                        style={
                          styles.imagePreview
                        }
                      />

                      <TouchableOpacity
                        style={
                          styles.imageRemoveButton
                        }
                        onPress={() =>
                          removeImageAsset(index)
                        }
                        disabled={
                          loading ||
                          uploadingImages
                        }
                        activeOpacity={0.8}
                      >
                        <Text
                          style={
                            styles.imageRemoveText
                          }
                        >
                          ×
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )
                )}
              </View>
            </View>
          )}

          {/* Empty state */}

          {existingImages.length === 0 &&
            imageAssets.length === 0 && (
              <View
                style={
                  styles.emptyImageBox
                }
              >
                <Text
                  style={
                    styles.emptyImageIcon
                  }
                >
                  📷
                </Text>

                <Text
                  style={
                    styles.emptyImageText
                  }
                >
                  No package images selected.
                </Text>

                <Text
                  style={
                    styles.emptyImageSubText
                  }
                >
                  Tap Gallery to choose images.
                </Text>
              </View>
            )}

          {/* Count */}

          {(existingImages.length +
            imageAssets.length) > 0 && (
            <Text
              style={
                styles.imageCountText
              }
            >
              {existingImages.length +
              imageAssets.length}
            /{maxImagesPerPackage} images
            </Text>
          )}

          {/* Upload progress */}

          {uploadingImages && (
            <View
              style={
                styles.uploadProgressContainer
              }
            >
              <View
                style={
                  styles.uploadProgressHeader
                }
              >
                <Text
                  style={
                    styles.uploadProgressLabel
                  }
                >
                  Uploading package images...
                </Text>

                <Text
                  style={
                    styles.uploadProgressPercent
                  }
                >
                  {uploadProgress}%
                </Text>
              </View>

              <View
                style={
                  styles.progressBackground
                }
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${uploadProgress}%`,
                    },
                  ]}
                />
              </View>

              <View
                style={
                  styles.uploadingRow
                }
              >
                <ActivityIndicator
                  size="small"
                  color="#7B2869"
                />

                <Text
                  style={
                    styles.uploadingText
                  }
                >
                  Please wait...
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* -------------------------------------------------
            Live Preview
        ------------------------------------------------- */}

        {(packageName ||
          price ||
          description ||
          services ||
          durations.length > 0 ||
          allowCustomDuration) && (
          <View style={styles.previewCard}>
            <Text style={styles.previewTag}>
              PACKAGE PREVIEW
            </Text>

            <View
              style={styles.previewRow}
            >
              <View style={{ flex: 1, minWidth: 100 }}>
              <Text
                style={[styles.previewName, { flex: 0 }]}
                numberOfLines={2}
              >
                {packageName ||
                  "Package Name"}
              </Text>

              <PackagePricingLabel pkg={pricing} />
              </View>
              {!!price && (
                <View style={styles.previewPriceBadge}>
                  <Text style={styles.previewPriceAmount} numberOfLines={1} adjustsFontSizeToFit>
                    {currencySymbol()} {price}
                  </Text>
                  <Text style={styles.previewPriceMeta}>
                    {pricingLabel(pricing).replace(' · serves ', '\nserves ')}
                  </Text>
                </View>
              )}
            </View>

            {!!description && (
              <Text
                style={styles.previewDescription}
              >
                {description}
              </Text>
            )}

            {!!services && (
              <Text style={styles.previewServices}>
                Includes: {services}
              </Text>
            )}

    {bookingType === "DURATION_BASED" && includedMinutes > 0 && Number.isFinite(includedMinutes) && (
      <View style={styles.previewDurationRow}><Text style={styles.previewDurationText}>Base price includes</Text><Text style={styles.previewDurationPrice}>{baseIncludedHours} {baseIncludedUnit === "DAYS" ? "day(s)" : "hour(s)"}</Text></View>
    )}
    {/* Booking Type Preview — shown exactly once */}

<View style={styles.previewDurationSection}>
  <Text style={styles.previewSectionTitle}>
    Booking Type
  </Text>

  <View style={styles.previewDurationRow}>
    <Text style={styles.previewDurationText}>
      Type
    </Text>

    <Text style={styles.previewDurationPrice}>
      {bookingTypeOptions.find(
        (option) => option.value === bookingType,
      )?.label || bookingType}
    </Text>
  </View>

  {bookingType === "TIME_SLOT_BASED" &&
    requiredServiceDurationMinutesValue !== undefined && (
      <View style={styles.previewDurationRow}>
        <Text style={styles.previewDurationText}>
          Time needed per booking
        </Text>

        <Text style={styles.previewDurationPrice}>
          {formatDurationDisplay(
            requiredServiceDurationMinutesValue,
          )}
        </Text>
      </View>
    )}

  {bookingType === "DELIVERY_BASED" && (
    <>
      <DeliveryDetails pkg={delivery} showConfiguration />


      <View style={styles.previewDurationRow}>
        <Text style={styles.previewDurationText}>
          Earliest delivery
        </Text>

        <Text style={styles.previewDurationPrice}>
          {formatOffsetDisplay(
            serviceWindowStartOffsetMinutesValue,
          )}
        </Text>
      </View>

      <View style={styles.previewDurationRow}>
        <Text style={styles.previewDurationText}>
          Latest delivery
        </Text>

        <Text style={styles.previewDurationPrice}>
          {formatOffsetDisplay(
            serviceWindowEndOffsetMinutesValue,
          )}
        </Text>
      </View>
    </>
  )}

  {bookingType === "SETUP_BASED" && (
    <>
      {requiredServiceDurationMinutesValue !== undefined && (
        <View style={styles.previewDurationRow}>
          <Text style={styles.previewDurationText}>
            Time to set up
          </Text>

          <Text style={styles.previewDurationPrice}>
            {formatDurationDisplay(
              requiredServiceDurationMinutesValue,
            )}
          </Text>
        </View>
      )}

      <View style={styles.previewDurationRow}>
        <Text style={styles.previewDurationText}>
          Earliest setup start
        </Text>

        <Text style={styles.previewDurationPrice}>
          {formatOffsetDisplay(
            serviceWindowStartOffsetMinutesValue,
          )}
        </Text>
      </View>

      <View style={styles.previewDurationRow}>
        <Text style={styles.previewDurationText}>
          Setup completion deadline
        </Text>

        <Text style={styles.previewDurationPrice}>
          {formatOffsetDisplay(
            serviceWindowEndOffsetMinutesValue,
          )}
        </Text>
      </View>
    </>
  )}

</View>

            {bookingType === "DURATION_BASED" &&
              durations.length > 0 && (
              <View
                style={
                  styles.previewDurationSection
                }
              >
                <Text
                  style={
                    styles.previewSectionTitle
                  }
                >
                  Fixed Durations
                </Text>

                {durations.map(
                  (
                    duration,
                    index,
                  ) => (
                    <View
                      key={`preview-${index}`}
                      style={
                        styles.previewDurationRow
                      }
                    >
                      <Text
                        style={
                          styles.previewDurationText
                        }
                      >
                        {duration.value}{" "}
                        {duration.unit ===
                        "HOURS"
                          ? duration.value ===
                            1
                            ? "Hour"
                            : "Hours"
                          : duration.value ===
                            1
                          ? "Day"
                          : "Days"}
                      </Text>

                      <View style={styles.previewDurationPriceBlock}>
                        <Text style={styles.previewDurationAmount}>
                          {currencySymbol()}{" "}
                          {Number(duration.price || 0).toLocaleString()}
                        </Text>
                        <Text style={styles.previewDurationBasis}>
                          {pricingLabel(pricing).replace(' · serves ', '\nserves ')}
                        </Text>
                      </View>
                    </View>
                  ),
                )}
              </View>
            )}

            {bookingType === "DURATION_BASED" &&
            allowCustomDuration && (
              <View
                style={
                  styles.previewCustomBox
                }
              >
                <Text
                  style={
                    styles.previewCustomTitle
                  }
                >
                  Custom Duration
                </Text>

                <View style={styles.previewCustomPriceBlock}>
                  <Text style={styles.previewCustomText} numberOfLines={1}>
                    {currencySymbol()}{" "}
                    {Number(customDurationRate || 0).toLocaleString()}/{customDurationUnit === "DAYS" ? "day" : "hour"}
                  </Text>
                  <Text style={styles.previewCustomBasis}>
                    {pricingLabel(pricing).replace(' · serves ', '\nserves ')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

{!isEditMode &&
  !loadingSubscription &&
  packageLimitReached && (
    <View style={styles.limitWarningCard}>
      <Text style={styles.limitWarningTitle}>
        Package Limit Reached
      </Text>

      <Text style={styles.limitWarningText}>
        Your current subscription allows up to{" "}
        {maxPackages} packages. You currently have{" "}
        {currentPackageCount}.
      </Text>

      <TouchableOpacity
        style={styles.upgradeButton}
        onPress={() => {
          if (!vendorId) {
            Alert.alert(
              "Error",
              "Vendor ID not found."
            );
            return;
          }

          router.push({
            pathname: "/subscriptionscreen",
            params: { vendorId },
          });
        }}
        activeOpacity={0.85}
      >
        <Text style={styles.upgradeButtonText}>
          View Subscription Plans
        </Text>
      </TouchableOpacity>
    </View>
  )}
        {/* -------------------------------------------------
            Save
        ------------------------------------------------- */}

        <TouchableOpacity
              style={[
            styles.saveButton,
            (!isFormValid ||
              loading ||
              loadingSubscription) &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={
            loading ||
            loadingSubscription ||
            !isFormValid
          }
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text
              style={styles.saveButtonText}
            >
              {isEditMode
                ? "Save Changes"
                : "Save Package"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel */}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text
            style={styles.cancelButtonText}
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// =========================================================
// Styles
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FAF6F9",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FAF6F9",
  },

  loadingText: {
    marginTop: 10,
    color: "#8A7A85",
    fontSize: 13,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#221A20",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  backButtonIcon: {
    fontSize: 26,
    fontWeight: "700",
    color: "#7B2869",
    marginTop: -2,
  },

  topHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, marginBottom: 8 },
  topHeaderTitle: { flex: 1, textAlign: "center", color: "#221A20", fontSize: 21, fontWeight: "800" },
  topHeaderSubtitle: { textAlign: "center", fontSize: 13, color: "#8A7A85", marginBottom: 24 },
  includedTimePanel: { backgroundColor: "#FCF7FB", borderWidth: 1, borderColor: "#EAD8E5", borderRadius: 16, padding: 14, marginTop: 14 },
  includedTimeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  includedTimeInput: { flex: 1, minWidth: 55, borderWidth: 1, borderColor: "#E6D6E1", borderRadius: 12, backgroundColor: "#FFFFFF", color: "#221A20", paddingHorizontal: 12, paddingVertical: 10, fontSize: 17, fontWeight: "700" },
  includedTimeUnit: { paddingHorizontal: 12, paddingVertical: 13, borderWidth: 1, borderColor: "#E6D6E1", borderRadius: 12, backgroundColor: "#FFFFFF" },
  includedTimeUnitActive: { backgroundColor: "#7B2869", borderColor: "#7B2869" },
  includedTimeUnitText: { color: "#806D7B", fontWeight: "700" },
  includedTimeUnitTextActive: { color: "#FFFFFF" },
  includedTimeSummary: { marginTop: 13, color: "#7B2869", fontWeight: "700", fontSize: 12 },
  includedTimeHint: { marginTop: 12, color: "#8A7A85", fontSize: 12, lineHeight: 19 },
  headerWrap: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },

  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#221A20",
    textAlign: "center",
  },

  subheading: {
    fontSize: 13.5,
    color: "#8A7A85",
    marginTop: 4,
    textAlign: "center",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,

    shadowColor: "#221A20",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 2,
    marginBottom: 16,
  },

  fieldGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 16,
    fontWeight: "700",
    color: "#221A20",
    marginBottom: 8,
  },

  input: {
    borderWidth: 1.5,
    borderColor: "#EFE0EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#221A20",
    backgroundColor: "#FCFAFB",
  },

  inputFocused: {
    borderColor: "#7B2869",
    backgroundColor: "#FFFFFF",

    shadowColor: "#7B2869",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  textArea: {
    height: 120,
    textAlignVertical: "top",
  },

  priceContainer: {
    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1.5,
    borderColor: "#EFE0EB",
    borderRadius: 14,
    backgroundColor: "#FCFAFB",

    paddingHorizontal: 14,
    height: 50,
  },

  pricePrefix: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7B2869",
    marginRight: 8,
  },

  priceInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
    color: "#221A20",
    paddingVertical: 0,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  sectionHeaderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#221A20",
  },

  sectionSubtitle: {
    fontSize: 12,
    color: "#8A7A85",
    lineHeight: 18,
    marginTop: 4,
  },

  addDurationButton: {
    backgroundColor: "#F3E4EF",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
  },

  addDurationText: {
    color: "#7B2869",
    fontSize: 12,
    fontWeight: "800",
  },

  emptyDurationBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E8D4E1",
    borderRadius: 15,
    padding: 18,
    alignItems: "center",
    backgroundColor: "#FCF8FB",
  },

  emptyDurationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#55434F",
  },

  emptyDurationText: {
    marginTop: 5,
    fontSize: 11.5,
    color: "#968792",
    textAlign: "center",
    lineHeight: 17,
  },

  durationEditorCard: {
    backgroundColor: "#FCF9FB",
    borderWidth: 1,
    borderColor: "#EEE0E8",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },

  durationEditorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  durationEditorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#3E2B39",
  },

  removeDurationText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#C04444",
  },

  durationFieldsRow: {
    flexDirection: "row",
    gap: 10,
  },

  durationValueWrapper: {
    width: 82,
  },

  durationUnitWrapper: {
    flex: 1,
  },

  smallLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#74636D",
    marginBottom: 6,
  },

  smallInput: {
    height: 46,
    borderWidth: 1.2,
    borderColor: "#E5D7E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    color: "#221A20",
    fontSize: 14,
  },

  unitToggleRow: {
    flexDirection: "row",
    gap: 8,
  },

  unitButton: {
    flex: 1,
    height: 46,
    borderWidth: 1.2,
    borderColor: "#E5D7E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  unitButtonActive: {
    backgroundColor: "#7B2869",
    borderColor: "#7B2869",
  },

  unitButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#776873",
  },

  unitButtonTextActive: {
    color: "#FFFFFF",
  },

  durationPriceWrapper: {
    marginTop: 12,
  },

  friendlyRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },

  friendlyValueInput: {
    width: 90,
  },

  friendlyToggleRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  friendlyToggleButton: {
    flex: 1,
    minWidth: 65,
    height: 50,
    borderWidth: 1.5,
    borderColor: "#EFE0EB",
    borderRadius: 14,
    backgroundColor: "#FCFAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  friendlyToggleButtonActive: {
    backgroundColor: "#7B2869",
    borderColor: "#7B2869",
  },

  friendlyDirectionButton: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: "#EFE0EB",
    borderRadius: 14,
    backgroundColor: "#FCFAFB",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },

  friendlyDirectionButtonActive: {
    backgroundColor: "#7B2869",
    borderColor: "#7B2869",
  },

  friendlyToggleText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#776873",
    textAlign: "center",
  },

  friendlyToggleTextActive: {
    color: "#FFFFFF",
  },

  priceContainerSmall: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 46,
    borderWidth: 1.2,
    borderColor: "#E5D7E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },

  pricePrefixSmall: {
    fontSize: 13,
    fontWeight: "800",
    color: "#7B2869",
    marginRight: 7,
  },

  priceInputSmall: {
    flex: 1,
    height: 44,
    color: "#221A20",
    fontSize: 14,
    paddingVertical: 0,
  },

  rateSuffix: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A7A85",
  },

  switchButton: {
    width: 76,
    height: 34,
    borderRadius: 18,
    backgroundColor: "#ECE8EB",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    justifyContent: "flex-start",
  },

  switchButtonActive: {
    backgroundColor: "#F3E4EF",
  },

  switchCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    elevation: 2,
  },

  switchCircleActive: {
    backgroundColor: "#7B2869",
    marginLeft: 42,
  },

  switchText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#83757E",
    position: "absolute",
    right: 8,
  },

  switchTextActive: {
    color: "#7B2869",
    left: 8,
    right: undefined,
  },

  customDurationContent: {
    marginTop: 14,
    backgroundColor: "#FCF9FB",
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: "#EEE0E8",
  },

  customUnitButton: {
    flex: 1,
    height: 44,
    borderWidth: 1.2,
    borderColor: "#E5D7E1",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  customUnitButtonActive: {
    backgroundColor: "#7B2869",
    borderColor: "#7B2869",
  },

  customUnitText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#776873",
  },

  customUnitTextActive: {
    color: "#FFFFFF",
  },

  ...packagePreviewStyles,

  previewPriceBadge: {
    alignSelf: "flex-start",
    maxWidth: "46%",
    minWidth: 116,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#7B2869",
    borderRadius: 15,
    alignItems: "center",
  },
  previewPriceAmount: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  previewPriceMeta: {
    color: "#F7EAF4",
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 2,
  },
  previewDurationPriceBlock: {
    flex: 1,
    alignItems: "flex-end",
    minWidth: 0,
  },
  previewDurationAmount: {
    color: "#632052",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },
  previewDurationBasis: {
    color: "#805876",
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: "right",
  },
  previewCustomPriceBlock: {
    alignItems: "flex-end",
    flexShrink: 1,
    marginLeft: 8,
  },
  previewCustomBasis: {
    fontSize: 10.5,
    lineHeight: 14,
    color: "#3D6E4D",
    textAlign: "right",
  },

  previewCustomBox: {
    marginTop: 10,
    backgroundColor: "#F3F9F5",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#DCEBDD",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  previewCustomTitle: {
    fontSize: 12,
    color: "#3D6E4D",
    fontWeight: "700",
  },

  previewCustomText: {
    fontSize: 12,
    color: "#2E8A50",
    fontWeight: "800",
  },

  saveButton: {
    backgroundColor: "#7B2869",
    borderRadius: 26,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#7B2869",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 4,
  },

  saveButtonDisabled: {
    backgroundColor: "#C9A9BF",
    shadowOpacity: 0,
    elevation: 0,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15.5,
  },

  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
  },

  cancelButtonText: {
    color: "#8A7A85",
    fontWeight: "600",
    fontSize: 14,
  },

  imageSectionBlock: {
  marginTop: 4,
  marginBottom: 8,
},

imageSectionLabel: {
  fontSize: 12,
  fontWeight: "800",
  color: "#5F4A58",
  marginBottom: 8,
},

imageRow: {
  paddingRight: 8,
},

imageGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
},

imagePreviewContainer: {
  width: 92,
  height: 92,
  borderRadius: 14,
  overflow: "hidden",
  position: "relative",
  backgroundColor: "#F3E8F0",
},

imagePreview: {
  width: "100%",
  height: "100%",
  backgroundColor: "#F3E8F0",
},

imageRemoveButton: {
  position: "absolute",
  top: 5,
  right: 5,
  width: 24,
  height: 24,
  borderRadius: 12,
  backgroundColor: "rgba(0,0,0,0.65)",
  alignItems: "center",
  justifyContent: "center",
},

imageRemoveText: {
  color: "#FFFFFF",
  fontSize: 20,
  lineHeight: 21,
  fontWeight: "700",
},

existingImageBadge: {
  position: "absolute",
  left: 5,
  bottom: 5,
  backgroundColor: "rgba(34,26,32,0.72)",
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderRadius: 7,
},

existingImageBadgeText: {
  color: "#FFFFFF",
  fontSize: 9,
  fontWeight: "700",
},

emptyImageBox: {
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "#E8D4E1",
  borderRadius: 16,
  paddingVertical: 28,
  backgroundColor: "#FCF8FB",
},

emptyImageIcon: {
  fontSize: 28,
  marginBottom: 8,
},

emptyImageText: {
  fontSize: 13,
  fontWeight: "700",
  color: "#55434F",
},

emptyImageSubText: {
  fontSize: 11.5,
  color: "#968792",
  marginTop: 4,
},

imageCountText: {
  fontSize: 11,
  color: "#8A7A85",
  fontWeight: "600",
  marginTop: 8,
},

uploadProgressContainer: {
  marginTop: 14,
  backgroundColor: "#F9F3F8",
  borderRadius: 14,
  padding: 12,
},

uploadProgressHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
},

uploadProgressLabel: {
  fontSize: 11.5,
  fontWeight: "700",
  color: "#7B2869",
},

uploadProgressPercent: {
  fontSize: 12,
  fontWeight: "800",
  color: "#7B2869",
},

progressBackground: {
  height: 7,
  backgroundColor: "#E8DDE5",
  borderRadius: 4,
  overflow: "hidden",
},

progressFill: {
  height: "100%",
  backgroundColor: "#7B2869",
  borderRadius: 4,
},

uploadingRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 8,
  gap: 7,
},

uploadingText: {
  fontSize: 11,
  color: "#7A6973",
},

addDurationButtonDisabled: {
  opacity: 0.5,
},

addDurationTextDisabled: {
  color: "#A991A3",
},

limitWarningCard: {
  backgroundColor: "#FFF7F0",
  borderWidth: 1,
  borderColor: "#F1D7BE",
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
},

limitWarningTitle: {
  fontSize: 14,
  fontWeight: "800",
  color: "#8A4B16",
},

limitWarningText: {
  fontSize: 12.5,
  color: "#7A6759",
  lineHeight: 18,
  marginTop: 6,
},

upgradeButton: {
  marginTop: 12,
  backgroundColor: "#7B2869",
  borderRadius: 18,
  paddingVertical: 11,
  alignItems: "center",
  justifyContent: "center",
},

upgradeButtonText: {
  color: "#FFFFFF",
  fontSize: 12.5,
  fontWeight: "800",
},


});