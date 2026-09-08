
// fyp-mobile/components/vendorpackages/EditPackageIndex.tsx

import deletePackage from "@/services/deletePackage";
import updatePackage from "@/services/updatePackage";

import {
  getSecureData,
  saveSecureData,
  getUserData,
  saveUserData,
} from "@/store";

import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { uploadPackageImages } from "@/services/uploadPackageImages";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import React, { useEffect, useMemo, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PRIMARY = "#7B2869";
const PRIMARY_LIGHT = "#9F4F8E";
const PRIMARY_SOFT = "#F3E4EF";
const BG = "#FAF6F9";
const CARD = "#FFFFFF";
const TEXT_DARK = "#221A20";
const TEXT_MUTED = "#8A7C86";
const BORDER = "#EFE0EB";
const DANGER = "#D9534F";

type DurationUnit = "HOURS" | "DAYS";

type PackageImageAsset = {
  uri: string;
  name: string;
  type: string;
};

interface PackageDuration {
  value: number;
  unit: DurationUnit;
  price: number;
}

const PackageScreen = () => {
  const insets = useSafeAreaInsets();

  const [keyboardVisible, setKeyboardVisible] =
    useState(false);

  const [isModalVisible, setModalVisible] =
    useState(false);

  const [packageDetails, setPackageDetails] =
    useState<any>(null);

  const [loading, setLoading] =
    useState(true);

  const [deleting, setDeleting] =
    useState(false);

  const { packageId } =
    useLocalSearchParams<{
      packageId?: string;
    }>();

  // -------------------------------------------------------
  // Editable fields
  // -------------------------------------------------------

  const [servicesInputHeight, setServicesInputHeight] =
    useState(140);

  const [descriptionInputHeight, setDescriptionInputHeight] =
    useState(120);

  const [editableName, setEditableName] =
    useState("");

  const [editablePrice, setEditablePrice] =
    useState("");

  const [editableDescription, setEditableDescription] =
    useState("");

  const [editableServices, setEditableServices] =
    useState("");

  const [editableDurations, setEditableDurations] =
    useState<PackageDuration[]>([]);

  const [allowCustomDuration, setAllowCustomDuration] =
    useState(false);

  const [customDurationUnit, setCustomDurationUnit] =
    useState<DurationUnit>("HOURS");

  const [customDurationRate, setCustomDurationRate] =
    useState("");

  const [existingImages, setExistingImages] =
  useState<string[]>([]);

const [newImageAssets, setNewImageAssets] =
  useState<PackageImageAsset[]>([]);

const [uploadingImages, setUploadingImages] =
  useState(false);

const [uploadProgress, setUploadProgress] =
  useState(0);

  // -------------------------------------------------------
  // Keyboard listeners
  // -------------------------------------------------------

  useEffect(() => {
    const show = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
      },
    );

    const hide = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      },
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // -------------------------------------------------------
  // Load package
  // -------------------------------------------------------

  useEffect(() => {
    if (packageId) {
      fetchPackageDetails(packageId as string);
    } else {
      setLoading(false);
    }
  }, [packageId]);

  // -------------------------------------------------------
  // Storage helpers
  // -------------------------------------------------------

  const readUser = async (): Promise<
    any | null
  > => {
    try {
      const userRaw =
        await getSecureData("user");

      if (userRaw) {
        return JSON.parse(userRaw);
      }
    } catch (err) {
      console.error(
        "Failed to parse user from SecureStore:",
        err,
      );
    }

    try {
      const userObj =
        await getUserData();

      if (userObj) {
        return userObj;
      }
    } catch (err) {
      console.error(
        "Failed to read user from AsyncStorage:",
        err,
      );
    }

    return null;
  };

  const writeUser = async (user: any) => {
    try {
      const userRaw =
        await getSecureData("user");

      if (userRaw) {
        await saveSecureData(
          "user",
          JSON.stringify(user),
        );
      } else {
        await saveUserData(user);
      }
    } catch (error) {
      console.error(
        "Failed to save user cache:",
        error,
      );
    }
  };

  // -------------------------------------------------------
  // Fetch package details
  // -------------------------------------------------------

  const fetchPackageDetails = async (
    id: string,
  ) => {
    setLoading(true);

    try {
      const user = await readUser();

      if (!user || !user.packages) {
        console.error(
          "User or packages not found",
        );

        setPackageDetails(null);
        return;
      }

      const pkg =
        user.packages.find(
          (x: any) =>
            String(x._id) === String(id),
        );

      if (!pkg) {
        console.error(
          "Package not found for id:",
          id,
        );
      }

      setPackageDetails(pkg || null);
    } catch (error) {
      console.error(
        "Error fetching package details:",
        error,
      );

      setPackageDetails(null);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------
  // Populate editable state
  // -------------------------------------------------------

  useEffect(() => {
    if (!packageDetails) return;

    setEditableName(
      packageDetails.packageName || "",
    );

    setEditablePrice(
      packageDetails.price !== undefined &&
        packageDetails.price !== null
        ? String(packageDetails.price)
        : "",
    );

    setEditableDescription(
      packageDetails.description || "",
    );

    setEditableServices(
      packageDetails.services || "",
    );

    setEditableDurations(
      Array.isArray(
        packageDetails.durations,
      )
        ? packageDetails.durations.map(
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
        packageDetails.allowCustomDuration,
      ),
    );

    setCustomDurationUnit(
      packageDetails.customDurationUnit ===
        "DAYS"
        ? "DAYS"
        : "HOURS",
    );

    setCustomDurationRate(
      packageDetails.customDurationRate !==
        undefined &&
        packageDetails.customDurationRate !==
          null
        ? String(
            packageDetails.customDurationRate,
          )
        : "",
    );
    setExistingImages(
  Array.isArray(packageDetails.images)
    ? packageDetails.images
    : []
);

setNewImageAssets([]);
  }, [packageDetails]);

  // -------------------------------------------------------
  // Duration helpers
  // -------------------------------------------------------

  const formatUnit = (
    unit: DurationUnit,
  ) => {
    return unit === "HOURS"
      ? "Hours"
      : "Days";
  };

  const addDuration = () => {
    setEditableDurations(
      (prev) => [
        ...prev,
        {
          value: 1,
          unit: "HOURS",
          price: 0,
        },
      ],
    );
  };

  const removeDuration = (
    index: number,
  ) => {
    setEditableDurations(
      (prev) =>
        prev.filter(
          (_, i) => i !== index,
        ),
    );
  };

  const updateDuration = (
    index: number,
    field: keyof PackageDuration,
    value:
      | string
      | number
      | DurationUnit,
  ) => {
    setEditableDurations(
      (prev) =>
        prev.map(
          (duration, i) =>
            i === index
              ? {
                  ...duration,
                  [field]: value,
                }
              : duration,
        ),
    );
  };

  // -------------------------------------------------------
// Package Images
// -------------------------------------------------------

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

    const totalImages =
      existingImages.length +
      newImageAssets.length;

    const remainingSlots =
      10 - totalImages;

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
        selectionLimit: remainingSlots,
        quality: 0.8,
      });

    if (
      result.canceled ||
      !result.assets?.length
    ) {
      return;
    }

    const selectedImages: PackageImageAsset[] =
      result.assets.map(
        (asset, index) => ({
          uri: asset.uri,
          name:
            asset.fileName ||
            `package-${Date.now()}-${index}.jpg`,
          type:
            asset.mimeType ||
            "image/jpeg",
        })
      );

    setNewImageAssets(
      (prev) => [
        ...prev,
        ...selectedImages,
      ].slice(0, remainingSlots)
    );
  } catch (error) {
    console.error(
      "Image picker error:",
      error
    );

    Alert.alert(
      "Error",
      "Could not select images."
    );
  }
};

const removeNewImage = (
  index: number
) => {
  setNewImageAssets((prev) =>
    prev.filter(
      (_, i) => i !== index
    )
  );
};
  // -------------------------------------------------------
  // Validation
  // -------------------------------------------------------

  const isFormValid = useMemo(() => {
    const validName =
      editableName.trim().length > 0;

    const numericPrice =
      Number(editablePrice);

    const validPrice =
      editablePrice.trim().length > 0 &&
      Number.isFinite(numericPrice) &&
      numericPrice >= 0;

    const validDurations =
      editableDurations.every(
        (duration) =>
          Number(duration.value) > 0 &&
          Number(duration.price) >= 0,
      );

    const validCustomDuration =
      !allowCustomDuration ||
      (customDurationRate.trim().length > 0 &&
        Number(customDurationRate) >= 0);

    return (
      validName &&
      validPrice &&
      validDurations &&
      validCustomDuration
    );
  }, [
    editableName,
    editablePrice,
    editableDurations,
    allowCustomDuration,
    customDurationRate,
  ]);

  // -------------------------------------------------------
  // Update package
  // -------------------------------------------------------

 const updatePackageDetails = async () => {
  if (!packageId) return;

  if (!isFormValid) {
    Alert.alert(
      "Invalid Package",
      "Please enter all required package details correctly.",
    );
    return;
  }

  setUploadingImages(false);
  setUploadProgress(0);

  try {
    const updatedData = {
      packageName: editableName.trim(),

      price: Number(editablePrice),

      description: editableDescription.trim(),

      services: editableServices.trim(),

      durations: editableDurations.map(
        (duration) => ({
          value: Number(duration.value),
          unit: duration.unit,
          price: Number(duration.price),
        }),
      ),

      allowCustomDuration,

      customDurationUnit:
        allowCustomDuration
          ? customDurationUnit
          : undefined,

      customDurationRate:
        allowCustomDuration
          ? Number(customDurationRate)
          : undefined,

      // IMPORTANT:
      // Existing images remain attached to package
      images: existingImages,
    };

    // ---------------------------------------------------
    // 1. Update package details
    // ---------------------------------------------------

    const updatedPackage =
      await updatePackage(
        packageId as string,
        updatedData,
      );

    // ---------------------------------------------------
    // 2. Upload newly selected images
    // ---------------------------------------------------

    let finalImages = [
      ...existingImages,
    ];

    if (newImageAssets.length > 0) {
      setUploadingImages(true);
      setUploadProgress(0);

      try {
        const uploadResponse =
          await uploadPackageImages(
            packageId as string,
            newImageAssets,
            (progress: number) => {
              setUploadProgress(
                Math.round(progress),
              );
            },
          );

        console.log(
          "Package image upload response:",
          uploadResponse,
        );

        // Support both response formats:
        // 1. string[]
        // 2. { urls: string[] }

        const uploadedUrls: string[] =
  Array.isArray(uploadResponse)
    ? uploadResponse
    : Array.isArray(
        (uploadResponse as any)?.urls,
      )
    ? (uploadResponse as any).urls
    : [];

        finalImages = [
          ...existingImages,
          ...uploadedUrls,
        ];

        setUploadProgress(100);
      } finally {
        setUploadingImages(false);
      }
    }

    // ---------------------------------------------------
    // 3. Update local package state
    // ---------------------------------------------------

    const finalPackage = {
      ...updatedPackage,
      images: finalImages,
    };

    setPackageDetails(
      finalPackage,
    );

    // ---------------------------------------------------
    // 4. Sync local user cache
    // ---------------------------------------------------

    const user = await readUser();

    if (!user || !user.packages) {
      throw new Error(
        "User or packages not found",
      );
    }

    const pkgIndex =
      user.packages.findIndex(
        (x: any) =>
          String(x._id) ===
          String(packageId),
      );

    if (pkgIndex === -1) {
      console.error(
        "Package not found in local user cache",
      );
    } else {
      user.packages[pkgIndex] =
        finalPackage;

      await writeUser(user);
    }

    // Clear newly selected images
    setNewImageAssets([]);

    Alert.alert(
      "Success",
      "Package updated successfully!",
      [
        {
          text: "OK",
          onPress: () => {
            router.replace({
              pathname:
                "/vendorpackages",
              params: {
                packageId:
                  packageId,
              },
            });
          },
        },
      ],
    );
  } catch (error: any) {
    console.error(
      "Update error:",
      error?.response?.data ||
        error?.message ||
        error,
    );

    Alert.alert(
      "Error",
      error?.response?.data?.message ||
        "Failed to update package.",
    );
  } finally {
    setUploadingImages(false);
  }
};

  // -------------------------------------------------------
  // Delete package
  // -------------------------------------------------------

  const confirmDelete = async () => {
    if (!packageId) {
      console.error(
        "Package ID is missing",
      );

      setModalVisible(false);
      return;
    }

    setDeleting(true);

    try {
      console.log(
        "Deleting Package...",
      );

      await deletePackage(
        packageId as string,
      );

      const user =
        await readUser();

      if (
        user &&
        user.packages
      ) {
        user.packages =
          user.packages.filter(
            (pkg: any) =>
              String(pkg._id) !==
              String(packageId),
          );

        await writeUser(user);
      }

      setModalVisible(false);

      router.replace(
        "/vendordashboard",
      );
    } catch (error) {
      console.error(
        "Error deleting package:",
        error,
      );

      Alert.alert(
        "Error",
        "Failed to delete package.",
      );

      setModalVisible(false);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDelete = () => {
    if (!deleting) {
      setModalVisible(false);
    }
  };

  // -------------------------------------------------------
  // Back
  // -------------------------------------------------------

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(
        "/vendordashboard",
      );
    }
  };

  // -------------------------------------------------------
  // Loading
  // -------------------------------------------------------

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color={PRIMARY}
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Loading package details...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: BG,
      }}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      keyboardVerticalOffset={20}
    >
      <View style={styles.container}>
        {/* Header */}

        <View style={styles.header}>
          <TouchableOpacity
            style={
              styles.headerIconButton
            }
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={TEXT_DARK}
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerTitleWrap
            }
          >
            <Text
              style={
                styles.headerEyebrow
              }
            >
              Editing package
            </Text>

            <Text
              style={
                styles.headerTitle
              }
              numberOfLines={1}
            >
              {editableName ||
                "Package"}
            </Text>
          </View>
        </View>

        {!packageDetails ? (
          <View
            style={styles.loadingBox}
          >
            <Text
              style={styles.sectionText}
            >
              Package not found.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.scrollContent
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            {/* -------------------------------------------
                Summary
            ------------------------------------------- */}

            <View
              style={
                styles.summaryCard
              }
            >
              <View
                style={
                  styles.summaryIconWrap
                }
              >
                <Ionicons
                  name="pricetag-outline"
                  size={22}
                  color="#FFFFFF"
                />
              </View>

              <View
                style={{ flex: 1 }}
              >
                <Text
                  style={
                    styles.summaryLabel
                  }
                >
                  Base package price
                </Text>

                <Text
                  style={
                    styles.summaryPrice
                  }
                >
                  Rs.{" "}
                  {Number(
                    editablePrice || 0,
                  ).toLocaleString()}
                  /-
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.deletePill
                }
                onPress={() =>
                  setModalVisible(true)
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name="trash-outline"
                  size={14}
                  color={DANGER}
                />

                <Text
                  style={
                    styles.deletePillText
                  }
                >
                  Delete
                </Text>
              </TouchableOpacity>
            </View>

            {/* -------------------------------------------
                Package Name
            ------------------------------------------- */}

            <View
              style={styles.card}
            >
              <View
                style={
                  styles.fieldHeader
                }
              >
                <View
                  style={
                    styles.fieldIconWrap
                  }
                >
                  <Ionicons
                    name="bookmark-outline"
                    size={16}
                    color={PRIMARY}
                  />
                </View>

                <Text
                  style={
                    styles.sectionHeader
                  }
                >
                  Package Name
                </Text>
              </View>

              <TextInput
                style={styles.input}
                value={editableName}
                onChangeText={
                  setEditableName
                }
                placeholder="Enter package name"
                placeholderTextColor={
                  TEXT_MUTED
                }
              />
            </View>

            {/* -------------------------------------------
                Base Price
            ------------------------------------------- */}

            <View
              style={styles.card}
            >
              <View
                style={
                  styles.fieldHeader
                }
              >
                <View
                  style={
                    styles.fieldIconWrap
                  }
                >
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={PRIMARY}
                  />
                </View>

                <Text
                  style={
                    styles.sectionHeader
                  }
                >
                  Base Package Price
                </Text>
              </View>

              <View
                style={
                  styles.priceInputWrap
                }
              >
                <Text
                  style={
                    styles.priceInputPrefix
                  }
                >
                  Rs.
                </Text>

                <TextInput
                  style={
                    styles.priceInput
                  }
                  value={editablePrice}
                  onChangeText={
                    setEditablePrice
                  }
                  keyboardType="numeric"
                  placeholder="80000"
                  placeholderTextColor={
                    TEXT_MUTED
                  }
                />
              </View>
            </View>

            {/* -------------------------------------------
                Description
            ------------------------------------------- */}

            <View
              style={styles.card}
            >
              <View
                style={
                  styles.fieldHeader
                }
              >
                <View
                  style={
                    styles.fieldIconWrap
                  }
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={PRIMARY}
                  />
                </View>

                <Text
                  style={
                    styles.sectionHeader
                  }
                >
                  Description
                </Text>
              </View>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    height:
                      descriptionInputHeight,
                  },
                ]}
                value={
                  editableDescription
                }
                onChangeText={
                  setEditableDescription
                }
                multiline
                textAlignVertical="top"
                onContentSizeChange={(
                  event,
                ) => {
                  const height =
                    event.nativeEvent
                      .contentSize
                      .height;

                  setDescriptionInputHeight(
                    Math.max(
                      120,
                      height,
                    ),
                  );
                }}
                placeholder="Describe what this package offers..."
                placeholderTextColor={
                  TEXT_MUTED
                }
              />
            </View>

            {/* -------------------------------------------
                Services
            ------------------------------------------- */}

            <View
              style={styles.card}
            >
              <View
                style={
                  styles.fieldHeader
                }
              >
                <View
                  style={
                    styles.fieldIconWrap
                  }
                >
                  <Ionicons
                    name="list-outline"
                    size={16}
                    color={PRIMARY}
                  />
                </View>

                <Text
                  style={
                    styles.sectionHeader
                  }
                >
                  What's Included
                </Text>
              </View>

              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    height:
                      servicesInputHeight,
                  },
                ]}
                value={
                  editableServices
                }
                onChangeText={
                  setEditableServices
                }
                multiline
                textAlignVertical="top"
                onContentSizeChange={(
                  event,
                ) => {
                  const height =
                    event.nativeEvent
                      .contentSize
                      .height;

                  setServicesInputHeight(
                    Math.max(
                      140,
                      height,
                    ),
                  );
                }}
                placeholder="Describe what's included in this package"
                placeholderTextColor={
                  TEXT_MUTED
                }
              />
            </View>

            {/* -------------------------------------------
                Fixed Durations
            ------------------------------------------- */}

            <View
              style={styles.card}
            >
              <View
                style={
                  styles.sectionHeaderRow
                }
              >
                <View
                  style={
                    styles.sectionHeaderTextWrap
                  }
                >
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Fixed Duration Options
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Edit predefined duration
                    options and their prices.
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.addDurationButton
                  }
                  onPress={
                    addDuration
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={
                      styles.addDurationText
                    }
                  >
                    + Add
                  </Text>
                </TouchableOpacity>
              </View>

              {editableDurations.length ===
              0 ? (
                <View
                  style={
                    styles.emptyDurationBox
                  }
                >
                  <Text
                    style={
                      styles.emptyDurationTitle
                    }
                  >
                    No fixed durations
                  </Text>

                  <Text
                    style={
                      styles.emptyDurationText
                    }
                  >
                    Add options like 4 Hours,
                    8 Hours, 1 Day or 2 Days.
                  </Text>
                </View>
              ) : (
                editableDurations.map(
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
                            removeDuration(
                              index,
                            )
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
                            style={
                              styles.smallInput
                            }
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
                            placeholderTextColor={
                              TEXT_MUTED
                            }
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
                                    activeOpacity={
                                      0.8
                                    }
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
                        style={
                          styles.durationPriceWrapper
                        }
                      >
                        <Text
                          style={
                            styles.smallLabel
                          }
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
                            placeholderTextColor={
                              TEXT_MUTED
                            }
                          />
                        </View>
                      </View>
                    </View>
                  ),
                )
              )}
            </View>

            {/* -------------------------------------------
                Custom Duration
            ------------------------------------------- */}

            <View
              style={styles.card}
            >
              <View
                style={
                  styles.sectionHeaderRow
                }
              >
                <View
                  style={
                    styles.sectionHeaderTextWrap
                  }
                >
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Custom Duration
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Allow customers to select a
                    custom duration.
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
                  <Text
                    style={
                      styles.smallLabel
                    }
                  >
                    Custom Duration Unit
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
                            {formatUnit(
                              unit,
                            )}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text
                    style={[
                      styles.smallLabel,
                      {
                        marginTop: 15,
                      },
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
                      value={
                        customDurationRate
                      }
                      onChangeText={
                        setCustomDurationRate
                      }
                      keyboardType="numeric"
                      placeholder="20000"
                      placeholderTextColor={
                        TEXT_MUTED
                      }
                    />

                    <Text
                      style={
                        styles.rateSuffix
                      }
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

{/* -------------------------------------------
    Package Images
------------------------------------------- */}

<View style={styles.card}>
  <View style={styles.sectionHeaderRow}>
    <View style={styles.sectionHeaderTextWrap}>
      <Text style={styles.sectionTitle}>
        Package Images
      </Text>

      <Text style={styles.sectionSubtitle}>
        Add up to 10 images for this package.
      </Text>
    </View>

    <TouchableOpacity
      style={styles.addDurationButton}
      onPress={pickPackageImages}
      disabled={
        uploadingImages ||
        loading
      }
      activeOpacity={0.8}
    >
      <Text style={styles.addDurationText}>
        + Gallery
      </Text>
    </TouchableOpacity>
  </View>

  {/* Existing Images */}

  {existingImages.length > 0 && (
    <View style={styles.imageSection}>
      <Text style={styles.imageSectionTitle}>
        Existing Images
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          styles.imageHorizontalRow
        }
      >
        {existingImages.map(
          (image, index) => (
            <View
              key={`existing-${index}`}
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
                  styles.existingBadge
                }
              >
                <Text
                  style={
                    styles.existingBadgeText
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

  {/* New Images */}

  {newImageAssets.length > 0 && (
    <View style={styles.imageSection}>
      <Text style={styles.imageSectionTitle}>
        New Images
      </Text>

      <View style={styles.imageGrid}>
        {newImageAssets.map(
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
                  removeNewImage(index)
                }
                disabled={
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

  {/* Empty State */}

  {existingImages.length === 0 &&
    newImageAssets.length === 0 && (
      <View
        style={
          styles.emptyImageBox
        }
      >
        <Ionicons
          name="images-outline"
          size={28}
          color={PRIMARY_LIGHT}
        />

        <Text
          style={
            styles.emptyImageTitle
          }
        >
          No package images
        </Text>

        <Text
          style={
            styles.emptyImageSubtitle
          }
        >
          Tap Gallery to select images.
        </Text>
      </View>
    )}

  {/* Image Counter */}

  {(existingImages.length +
    newImageAssets.length) > 0 && (
    <Text
      style={
        styles.imageCountText
      }
    >
      {existingImages.length +
        newImageAssets.length}
      /10 images
    </Text>
  )}

  {/* Upload Progress */}

  {uploadingImages && (
    <View
      style={
        styles.uploadProgressBox
      }
    >
      <View
        style={
          styles.uploadProgressHeader
        }
      >
        <Text
          style={
            styles.uploadProgressText
          }
        >
          Uploading images...
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
        style={styles.uploadingRow}
      >
        <ActivityIndicator
          size="small"
          color={PRIMARY}
        />

        <Text
          style={
            styles.uploadingSmallText
          }
        >
          Please wait...
        </Text>
      </View>
    </View>
  )}
</View>
            {/* -------------------------------------------
                Live Preview
            ------------------------------------------- */}

            <View
              style={
                styles.previewCard
              }
            >
              <Text
                style={styles.previewTag}
              >
                PREVIEW
              </Text>

              <View
                style={
                  styles.previewRow
                }
              >
                <Text
                  style={
                    styles.previewName
                  }
                  numberOfLines={1}
                >
                  {editableName ||
                    "Package Name"}
                </Text>

                <Text
                  style={
                    styles.previewPrice
                  }
                >
                  Rs.{" "}
                  {Number(
                    editablePrice || 0,
                  ).toLocaleString()}
                </Text>
              </View>

              {editableDescription.trim()
                .length > 0 && (
                <Text
                  style={
                    styles.previewDescription
                  }
                >
                  {editableDescription}
                </Text>
              )}

              {editableServices.trim()
                .length > 0 && (
                <Text
                  style={
                    styles.previewServices
                  }
                >
                  {editableServices}
                </Text>
              )}

              {editableDurations.length >
                0 && (
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

                  {editableDurations.map(
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

            <View
              style={{
                height: keyboardVisible
                  ? 20
                  : 120,
              }}
            />
          </ScrollView>
        )}

        {/* Save button */}

        {!keyboardVisible &&
          !loading &&
          packageDetails && (
            <TouchableOpacity
              style={[
                styles.saveButton,
                {
                  bottom:
                    insets.bottom + 12,
                },
              ]}
              onPress={
                updatePackageDetails
              }
              activeOpacity={0.85}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color="#FFF"
              />

              <Text
                style={
                  styles.saveButtonText
                }
              >
                Save Changes
              </Text>
            </TouchableOpacity>
          )}

        {/* Delete Modal */}

        <Modal
          visible={isModalVisible}
          transparent
          animationType="fade"
          onRequestClose={
            cancelDelete
          }
        >
          <View
            style={
              styles.modalContainer
            }
          >
            <View
              style={
                styles.modalContent
              }
            >
              <View
                style={
                  styles.modalIconWrap
                }
              >
                <Ionicons
                  name="trash-outline"
                  size={26}
                  color={DANGER}
                />
              </View>

              <Text
                style={styles.modalTitle}
              >
                Delete Package?
              </Text>

              <Text
                style={
                  styles.modalMessage
                }
              >
                Are you sure you want to
                delete this package? This
                action cannot be undone.
              </Text>

              <View
                style={
                  styles.modalButtons
                }
              >
                <TouchableOpacity
                  style={
                    styles.cancelButton
                  }
                  onPress={
                    cancelDelete
                  }
                  disabled={deleting}
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={
                    styles.confirmButton
                  }
                  onPress={
                    confirmDelete
                  }
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <Text
                      style={
                        styles.confirmButtonText
                      }
                    >
                      Delete
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: 55,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: BORDER,
  },

  headerTitleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 38,
  },

  headerEyebrow: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
    marginBottom: 2,
  },

  headerTitle: {
    color: TEXT_DARK,
    fontSize: 18,
    fontWeight: "800",
  },

  scrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 220,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: TEXT_MUTED,
  },

  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },

  sectionText: {
    color: TEXT_DARK,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },

  summaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor:
      "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  summaryLabel: {
    fontSize: 11,
    color:
      "rgba(255,255,255,0.75)",
    fontWeight: "600",
  },

  summaryPrice: {
    fontSize: 19,
    color: "#FFFFFF",
    fontWeight: "800",
    marginTop: 2,
  },

  deletePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },

  deletePillText: {
    color: DANGER,
    fontSize: 12,
    fontWeight: "700",
  },

  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 1,
  },

  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  fieldIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: PRIMARY_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeader: {
    color: TEXT_DARK,
    fontSize: 14,
    fontWeight: "700",
  },

  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: BG,
    color: TEXT_DARK,
  },

  textArea: {
    lineHeight: 20,
  },

  priceInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    backgroundColor: BG,
    paddingHorizontal: 14,
  },

  priceInputPrefix: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
    marginRight: 6,
  },

  priceInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: TEXT_DARK,
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
    color: TEXT_DARK,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginTop: 4,
  },

  addDurationButton: {
    backgroundColor: PRIMARY_SOFT,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 18,
  },

  addDurationText: {
    color: PRIMARY,
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
    color: TEXT_DARK,
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
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
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
    color: PRIMARY,
    marginRight: 7,
  },

  priceInputSmall: {
    flex: 1,
    height: 44,
    color: TEXT_DARK,
    fontSize: 14,
    paddingVertical: 0,
  },

  rateSuffix: {
    fontSize: 12,
    fontWeight: "700",
    color: TEXT_MUTED,
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
    backgroundColor: PRIMARY_SOFT,
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
    backgroundColor: PRIMARY,
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
    color: PRIMARY,
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
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
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
    color: TEXT_DARK,
    flex: 1,
    marginRight: 8,
  },

  previewPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: PRIMARY,
  },

  previewDescription: {
    fontSize: 12.5,
    color: "#71616C",
    marginTop: 8,
    lineHeight: 18,
  },

  previewServices: {
    fontSize: 12.5,
    color: TEXT_MUTED,
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
    color: PRIMARY,
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
    color: PRIMARY,
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
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: PRIMARY,
    padding: 15,
    borderRadius: 14,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 5,
  },

  saveButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800",
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor:
      "rgba(34,26,32,0.55)",
  },

  modalContent: {
    width: "84%",
    backgroundColor: CARD,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
  },

  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FBEAEA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
    color: TEXT_DARK,
  },

  modalMessage: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 22,
    color: TEXT_MUTED,
    lineHeight: 19,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: PRIMARY_SOFT,
    alignItems: "center",
  },

  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: DANGER,
    alignItems: "center",
  },

  cancelButtonText: {
    color: PRIMARY,
    fontWeight: "700",
    fontSize: 14,
  },

  confirmButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  imageSection: {
  marginTop: 4,
  marginBottom: 10,
},

imageSectionTitle: {
  fontSize: 12,
  fontWeight: "800",
  color: "#5F4A58",
  marginBottom: 8,
},

imageHorizontalRow: {
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
},

imageRemoveButton: {
  position: "absolute",
  top: 5,
  right: 5,
  width: 25,
  height: 25,
  borderRadius: 13,
  backgroundColor: "rgba(0,0,0,0.7)",
  alignItems: "center",
  justifyContent: "center",
},

imageRemoveText: {
  color: "#FFFFFF",
  fontSize: 20,
  fontWeight: "700",
  lineHeight: 21,
},

existingBadge: {
  position: "absolute",
  left: 5,
  bottom: 5,
  backgroundColor:
    "rgba(34,26,32,0.72)",
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderRadius: 7,
},

existingBadgeText: {
  color: "#FFFFFF",
  fontSize: 8.5,
  fontWeight: "700",
},

emptyImageBox: {
  borderWidth: 1,
  borderStyle: "dashed",
  borderColor: "#E8D4E1",
  borderRadius: 15,
  paddingVertical: 28,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#FCF8FB",
},

emptyImageTitle: {
  marginTop: 8,
  fontSize: 13,
  fontWeight: "800",
  color: "#55434F",
},

emptyImageSubtitle: {
  marginTop: 4,
  fontSize: 11.5,
  color: TEXT_MUTED,
},

imageCountText: {
  marginTop: 8,
  fontSize: 11,
  color: TEXT_MUTED,
  fontWeight: "600",
},

uploadProgressBox: {
  marginTop: 12,
  padding: 12,
  borderRadius: 14,
  backgroundColor: "#F9F3F8",
},

uploadProgressHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
},

uploadProgressText: {
  fontSize: 11.5,
  fontWeight: "700",
  color: PRIMARY,
},

uploadProgressPercent: {
  fontSize: 12,
  fontWeight: "800",
  color: PRIMARY,
},

progressBackground: {
  height: 7,
  borderRadius: 4,
  backgroundColor: "#E6DCE3",
  overflow: "hidden",
},

progressFill: {
  height: "100%",
  backgroundColor: PRIMARY,
  borderRadius: 4,
},

uploadingRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 7,
  marginTop: 8,
},

uploadingSmallText: {
  fontSize: 11,
  color: TEXT_MUTED,
},
});

export default PackageScreen;
