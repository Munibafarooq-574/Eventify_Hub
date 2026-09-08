
// fyp-mobile/components/VPDAddNewPackages/VPDAddNewPackages.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { View,Text,TextInput,TouchableOpacity,StyleSheet,ScrollView,Alert,ActivityIndicator,KeyboardAvoidingView,Platform,Image,} from "react-native";
import { router,useLocalSearchParams,Stack,} from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { uploadPackageImages } from "@/services/uploadPackageImages";
import postAddPackages from "@/services/postAddPackages";
import updatePackage from "@/services/updatePackage";
import { getSecureData } from "@/store";

type DurationUnit = "HOURS" | "DAYS";

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

export default function VendorPackagesScreen() {
  const { packageId } = useLocalSearchParams<{
    packageId?: string;
  }>();

  const isEditMode = !!packageId;

  const insets = useSafeAreaInsets();

  const [packageName, setPackageName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [services, setServices] = useState("");

  const [durations, setDurations] = useState<
    PackageDuration[]
  >([]);

  const [allowCustomDuration, setAllowCustomDuration] = useState(false);
  const [customDurationUnit, setCustomDurationUnit] = useState<DurationUnit>("HOURS");
  const [customDurationRate, setCustomDurationRate] = useState("");
const [existingImages, setExistingImages] = useState<string[]>([]);
const [imageAssets, setImageAssets] = useState<PackageImageAsset[]>([]);
const [uploadProgress, setUploadProgress] = useState(0);
const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPackage, setLoadingPackage] =useState(isEditMode);

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

        const existingPackage =
          userData?.packages?.find(
            (pkg: any) =>
              String(pkg._id) === String(packageId),
          );

        if (!existingPackage) {
          Alert.alert(
            "Error",
            "Package details could not be found.",
          );
          return;
        }

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

    const totalCurrentImages =
      existingImages.length + imageAssets.length;

    const remainingSlots = 10 - totalCurrentImages;

    if (remainingSlots <= 0) {
      Alert.alert(
        "Image Limit",
        "You can add up to 10 images per package."
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: remainingSlots,
      });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const selectedImages: PackageImageAsset[] =
      result.assets.map((asset, index) => ({
        uri: asset.uri,
        name:
          asset.fileName ||
          `package-${Date.now()}-${index}.jpg`,
        type:
          asset.mimeType ||
          "image/jpeg",
      }));

    setImageAssets((prev) => [
      ...prev,
      ...selectedImages,
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

    const numericPrice =
      Number(price);

    const hasPrice =
      price.trim().length > 0 &&
      Number.isFinite(numericPrice) &&
      numericPrice >= 0;

    const validDurations = durations.every(
      (duration) =>
        Number(duration.value) > 0 &&
        Number(duration.price) >= 0,
    );

    const customValid = allowCustomDuration
      ? customDurationRate.trim().length > 0 &&
        Number(customDurationRate) >= 0
      : true;

    return (
      hasName &&
      hasPrice &&
      validDurations &&
      customValid
    );
  }, [
    packageName,
    price,
    durations,
    allowCustomDuration,
    customDurationRate,
  ]);

  // ---------------------------------------------------------
  // Save package
  // ---------------------------------------------------------

 const handleSave = async () => {
  if (!isFormValid) {
    Alert.alert(
      "Incomplete Form",
      "Please enter package name, valid price, and correct duration details."
    );
    return;
  }

  setLoading(true);

  try {
    const userRaw =
      await getSecureData("user");

    const userData = JSON.parse(
      userRaw || "{}"
    );

    const userId: string | undefined =
      userData?._id;

    if (!userId) {
      Alert.alert(
        "Error",
        "Could not find logged-in vendor. Please log in again."
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
      packageName: packageName.trim(),

      price: Number(price),

      description: description.trim(),

      services: services.trim(),

      durations: cleanedDurations,

      allowCustomDuration,

      customDurationUnit:
        allowCustomDuration
          ? customDurationUnit
          : undefined,

      customDurationRate:
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
      if (imageAssets.length > 0) {
        try {
          setUploadingImages(true);
          setUploadProgress(0);

          await uploadPackageImages(
            packageId as string,
            imageAssets,
            (progress) => {
              setUploadProgress(progress);
            }
          );

          setUploadProgress(100);
        } finally {
          setUploadingImages(false);
        }
      }

      Alert.alert(
        "Success",
        "Package updated successfully.",
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

    if (imageAssets.length > 0) {
      try {
        setUploadingImages(true);
        setUploadProgress(0);

        await uploadPackageImages(
          createdPackageId,
          imageAssets,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        setUploadProgress(100);
      } finally {
        setUploadingImages(false);
      }
    }

    Alert.alert(
      "Success",
      "Package created successfully.",
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
      err?.response?.data?.message ||
        "Could not save package. Try again."
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
        {/* Back button */}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{
            top: 10,
            bottom: 10,
            left: 10,
            right: 10,
          }}
        >
          <Text style={styles.backButtonIcon}>
            ‹
          </Text>
        </TouchableOpacity>

        {/* Header */}

        <View style={styles.headerWrap}>
          <Text style={styles.heading}>
            {isEditMode
              ? "Edit Package"
              : "Add New Package"}
          </Text>

          <Text style={styles.subheading}>
            {isEditMode
              ? "Update the details of this package"
              : "Build a package clients will love"}
          </Text>
        </View>

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

          <View style={styles.fieldGroup}>
  <Text style={styles.label}>
    Base Package Price
  </Text>

  <View style={styles.priceContainer}>
    <Text style={styles.pricePrefix}>
      Rs.
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

        {/* -------------------------------------------------
            Fixed Duration Options
        ------------------------------------------------- */}

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
                        Rs.
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
                  Rs.
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
                Select up to 10 images for this package.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addDurationButton}
              onPress={pickPackageImages}
              disabled={loading || uploadingImages}
              activeOpacity={0.8}
            >
              <Text style={styles.addDurationText}>
                + Gallery
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
              /10 images
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
              PREVIEW
            </Text>

            <View
              style={styles.previewRow}
            >
              <Text
                style={styles.previewName}
                numberOfLines={1}
              >
                {packageName ||
                  "Package Name"}
              </Text>

              {!!price && (
                <Text
                  style={styles.previewPrice}
                >
                  Rs. {price}
                </Text>
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
              <Text
                style={styles.previewServices}
              >
                {services}
              </Text>
            )}

            {durations.length > 0 && (
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

                      <Text
                        style={
                          styles.previewDurationPrice
                        }
                      >
                        Rs.{" "}
                        {Number(
                          duration.price ||
                            0,
                        ).toLocaleString()}
                      </Text>
                    </View>
                  ),
                )}
              </View>
            )}

            {allowCustomDuration && (
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

                <Text
                  style={
                    styles.previewCustomText
                  }
                >
                  Rs.{" "}
                  {Number(
                    customDurationRate ||
                      0,
                  ).toLocaleString()}
                  /
                  {customDurationUnit ===
                  "DAYS"
                    ? "day"
                    : "hour"}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* -------------------------------------------------
            Save
        ------------------------------------------------- */}

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!isFormValid || loading) &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={
            loading || !isFormValid
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

  previewCard: {
    backgroundColor: "#FDF3FA",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0DCEB",
    padding: 16,
    marginBottom: 20,
  },

  previewTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B589A6",
    letterSpacing: 1,
    marginBottom: 7,
  },

  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  previewName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#221A20",
    flex: 1,
    marginRight: 8,
  },

  previewPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#7B2869",
  },

  previewDescription: {
    fontSize: 12.5,
    color: "#71616C",
    marginTop: 8,
    lineHeight: 18,
  },

  previewServices: {
    fontSize: 12.5,
    color: "#8A7A85",
    marginTop: 7,
    lineHeight: 18,
  },

  previewDurationSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0DCEB",
  },

  previewSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7B2869",
    marginBottom: 7,
  },

  previewDurationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },

  previewDurationText: {
    fontSize: 12.5,
    color: "#4F3D49",
    fontWeight: "600",
  },

  previewDurationPrice: {
    fontSize: 12.5,
    color: "#7B2869",
    fontWeight: "800",
  },

  previewCustomBox: {
    marginTop: 10,
    backgroundColor: "#F3F9F5",
    borderRadius: 12,
    padding: 10,
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
});