
// fyp-mobile/components/packages/Packagesindex.tsx

import { PackageDto } from "@/dto/CreatePackage.dto";
import postAddPackages from "@/services/postAddPackages";
import { uploadPackageImages } from "@/services/uploadPackageImages";
import { getUserData } from "@/store";

import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";

import React, { useState } from "react";

import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type DurationUnit = "HOURS" | "DAYS";

type PackageImageAsset = {
  uri: string;
  name: string;
  type: string;
};

type PackageForm = PackageDto & {
  imageAssets: PackageImageAsset[];
};

const PackagesScreen: React.FC = () => {
  const [packages, setPackages] = useState<PackageForm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Upload progress for each package
  const [uploadProgress, setUploadProgress] = useState<
    Record<number, number>
  >({});

  // ---------------------------------------------------------
  // Add new package
  // ---------------------------------------------------------

  const addPackage = () => {
    if (packages.length >= 10) {
      Alert.alert(
        "Package Limit",
        "You can create up to 10 packages.",
      );
      return;
    }

    setPackages([
      ...packages,
      {
        packageName: "",
        price: 0,
        description: "",
        services: "",
        durations: [],
        allowCustomDuration: false,
        customDurationUnit: "HOURS",
        customDurationRate: 0,
        images: [],
        imageAssets: [],
      },
    ]);
  };

  // ---------------------------------------------------------
  // Pick images from gallery
  // ---------------------------------------------------------

  const pickPackageImages = async (packageIndex: number) => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow gallery access to select package images.",
        );
        return;
      }

      const currentImages =
        packages[packageIndex]?.imageAssets || [];

      const remainingSlots = 10 - currentImages.length;

      if (remainingSlots <= 0) {
        Alert.alert(
          "Image Limit",
          "You can add up to 10 images per package.",
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

      if (result.canceled) {
        return;
      }

      const selectedImages: PackageImageAsset[] =
        result.assets.map((asset, assetIndex) => ({
          uri: asset.uri,
          name:
            asset.fileName ||
            `package-${Date.now()}-${assetIndex}.jpg`,
          type: asset.mimeType || "image/jpeg",
        }));

      setPackages((prev) =>
        prev.map((pkg, index) => {
          if (index !== packageIndex) {
            return pkg;
          }

          const existingAssets = pkg.imageAssets || [];

          return {
            ...pkg,
            imageAssets: [
              ...existingAssets,
              ...selectedImages,
            ],
          };
        }),
      );
    } catch (error) {
      console.error(
        "Error selecting package images:",
        error,
      );

      Alert.alert(
        "Error",
        "Unable to select images. Please try again.",
      );
    }
  };

  // ---------------------------------------------------------
  // Remove selected package image
  // ---------------------------------------------------------

  const removeImage = (
    packageIndex: number,
    imageIndex: number,
  ) => {
    setPackages((prev) =>
      prev.map((pkg, index) => {
        if (index !== packageIndex) {
          return pkg;
        }

        const updatedAssets = [
          ...(pkg.imageAssets || []),
        ];

        updatedAssets.splice(imageIndex, 1);

        return {
          ...pkg,
          imageAssets: updatedAssets,
        };
      }),
    );
  };

  // ---------------------------------------------------------
  // Remove package
  // ---------------------------------------------------------

  const removePackage = (index: number) => {
    const updatedPackages = [...packages];

    updatedPackages.splice(index, 1);

    setPackages(updatedPackages);

    setUploadProgress((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  // ---------------------------------------------------------
  // Update package field
  // ---------------------------------------------------------

  const updatePackage = (
    index: number,
    field: keyof PackageDto,
    value: any,
  ) => {
    const updatedPackages = [...packages];

    updatedPackages[index] = {
      ...updatedPackages[index],
      [field]: value,
    };

    setPackages(updatedPackages);
  };

  // ---------------------------------------------------------
  // Add fixed duration
  // ---------------------------------------------------------

  const addDuration = (packageIndex: number) => {
    const updatedPackages = [...packages];

    const currentDurations =
      updatedPackages[packageIndex].durations || [];

    updatedPackages[packageIndex] = {
      ...updatedPackages[packageIndex],

      durations: [
        ...currentDurations,
        {
          value: 1,
          unit: "HOURS",
          price: 0,
        },
      ],
    };

    setPackages(updatedPackages);
  };

  // ---------------------------------------------------------
  // Remove fixed duration
  // ---------------------------------------------------------

  const removeDuration = (
    packageIndex: number,
    durationIndex: number,
  ) => {
    const updatedPackages = [...packages];

    const currentDurations =
      updatedPackages[packageIndex].durations || [];

    updatedPackages[packageIndex] = {
      ...updatedPackages[packageIndex],

      durations: currentDurations.filter(
        (_, index) => index !== durationIndex,
      ),
    };

    setPackages(updatedPackages);
  };

  // ---------------------------------------------------------
  // Update fixed duration
  // ---------------------------------------------------------

  const updateDuration = (
    packageIndex: number,
    durationIndex: number,
    field: "value" | "unit" | "price",
    value: any,
  ) => {
    const updatedPackages = [...packages];

    const currentDurations = [
      ...(updatedPackages[packageIndex].durations || []),
    ];

    currentDurations[durationIndex] = {
      ...currentDurations[durationIndex],

      [field]:
        field === "value" || field === "price"
          ? Number(value) || 0
          : value,
    };

    updatedPackages[packageIndex] = {
      ...updatedPackages[packageIndex],
      durations: currentDurations,
    };

    setPackages(updatedPackages);
  };

  // ---------------------------------------------------------
  // Custom duration toggle
  // ---------------------------------------------------------

  const toggleCustomDuration = (index: number) => {
    const currentValue =
      packages[index].allowCustomDuration ?? false;

    updatePackage(
      index,
      "allowCustomDuration",
      !currentValue,
    );
  };

  // ---------------------------------------------------------
  // Validation
  // ---------------------------------------------------------

  const validatePackages = () => {
    if (packages.length === 0) {
      Alert.alert(
        "No Packages",
        "Please create at least one package.",
      );

      return false;
    }

    for (
      let index = 0;
      index < packages.length;
      index++
    ) {
      const pkg = packages[index];

      if (!pkg.packageName.trim()) {
        Alert.alert(
          "Package Name Required",
          `Please enter a name for Package ${index + 1}.`,
        );

        return false;
      }

      if (!pkg.services.trim()) {
        Alert.alert(
          "Services Required",
          `Please enter services for Package ${index + 1}.`,
        );

        return false;
      }

      const durations = pkg.durations || [];

      for (
        let durationIndex = 0;
        durationIndex < durations.length;
        durationIndex++
      ) {
        const duration = durations[durationIndex];

        if (duration.value <= 0) {
          Alert.alert(
            "Invalid Duration",
            `Package ${index + 1}, duration ${
              durationIndex + 1
            } must be greater than 0.`,
          );

          return false;
        }

        if (duration.price < 0) {
          Alert.alert(
            "Invalid Price",
            `Package ${index + 1}, duration ${
              durationIndex + 1
            } has an invalid price.`,
          );

          return false;
        }
      }

      if (pkg.allowCustomDuration) {
        if (
          !pkg.customDurationRate ||
          pkg.customDurationRate <= 0
        ) {
          Alert.alert(
            "Custom Rate Required",
            `Please enter a valid custom duration rate for Package ${
              index + 1
            }.`,
          );

          return false;
        }
      }
    }

    return true;
  };

  // ---------------------------------------------------------
  // Get newly created package IDs
  // ---------------------------------------------------------

  const getCreatedPackageIds = (
    response: any,
    packageCount: number,
  ): string[] => {
    /*
      Backend currently returns the complete User object.

      Since addPackages() appends new packages at the end,
      the last N packages belong to this submission.
    */

    const returnedPackages =
      response?.packages ||
      response?.user?.packages ||
      [];

    if (!Array.isArray(returnedPackages)) {
      return [];
    }

    const createdPackages =
      returnedPackages.slice(-packageCount);

    return createdPackages
      .map((pkg: any) => pkg?._id?.toString())
      .filter(Boolean);
  };

  // ---------------------------------------------------------
  // Submit
  // ---------------------------------------------------------

  const onSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    if (!validatePackages()) {
      return;
    }

    try {
      setIsSubmitting(true);

    const user = await getUserData();

if (!user?._id) {
  Alert.alert(
    "Error",
    "User information not found. Please login again.",
  );

  return;
}

      // -----------------------------------------------------
      // Clean package data
      //
      // IMPORTANT:
      // imageAssets are local device files.
      // They must NOT be sent inside package creation DTO.
      // Images will be uploaded after package creation.
      // -----------------------------------------------------

      const cleanedPackages: PackageDto[] =
        packages.map((pkg) => ({
          packageName: pkg.packageName.trim(),

          price: pkg.price ?? 0,

          description:
            pkg.description?.trim() || "",

          services: pkg.services.trim(),

          durations: (pkg.durations || []).map(
            (duration) => ({
              value: Number(duration.value),

              unit: duration.unit,

              price: Number(duration.price),
            }),
          ),

          allowCustomDuration:
            pkg.allowCustomDuration ?? false,

          customDurationUnit:
            pkg.allowCustomDuration
              ? pkg.customDurationUnit
              : undefined,

          customDurationRate:
            pkg.allowCustomDuration
              ? Number(pkg.customDurationRate || 0)
              : undefined,

          // Do NOT send local gallery URIs
          images: [],
        }));

      console.log(
        "Creating packages:",
        cleanedPackages,
      );

      // -----------------------------------------------------
      // 1. Create packages
      // -----------------------------------------------------

      const response = await postAddPackages(
        user._id,
        {
          packages: cleanedPackages,
        },
      );

      console.log(
        "Package creation response:",
        response,
      );

      // -----------------------------------------------------
      // 2. Get newly created package IDs
      // -----------------------------------------------------

      const createdPackageIds =
        getCreatedPackageIds(
          response,
          packages.length,
        );

      console.log(
        "Created package IDs:",
        createdPackageIds,
      );

      if (
        createdPackageIds.length !==
        packages.length
      ) {
        console.warn(
          "Could not resolve all newly created package IDs.",
        );

        /*
          Packages were already created successfully.
          We do not show total failure here.

          But if images were selected and IDs are missing,
          we cannot safely associate images with packages.
        */

        const hasImages = packages.some(
          (pkg) =>
            (pkg.imageAssets || []).length > 0,
        );

        if (hasImages) {
          Alert.alert(
            "Packages Created",
            "Packages were created, but package images could not be linked. Please check the backend response.",
            [
              {
                text: "Continue",
                onPress: () =>
                  router.push("/imagesuploaded"),
              },
            ],
          );

          return;
        }
      }

      // -----------------------------------------------------
      // 3. Upload images package-by-package
      // -----------------------------------------------------

      for (
        let packageIndex = 0;
        packageIndex < packages.length;
        packageIndex++
      ) {
        const pkg = packages[packageIndex];

        const assets = pkg.imageAssets || [];

        // No images for this package
        if (assets.length === 0) {
          continue;
        }

        const packageId =
          createdPackageIds[packageIndex];

        if (!packageId) {
          console.warn(
            `No package ID found for package ${
              packageIndex + 1
            }`,
          );

          continue;
        }

        setUploadProgress((prev) => ({
          ...prev,
          [packageIndex]: 0,
        }));

        console.log(
          `Uploading images for package ${
            packageIndex + 1
          }...`,
        );

        await uploadPackageImages(
          packageId,
          assets,
          (progress) => {
            setUploadProgress((prev) => ({
              ...prev,
              [packageIndex]: progress,
            }));
          },
        );

        setUploadProgress((prev) => ({
          ...prev,
          [packageIndex]: 100,
        }));
      }

      // -----------------------------------------------------
      // 4. Success
      // -----------------------------------------------------

      Alert.alert(
        "Success",
        "Your packages and package images have been created successfully.",
        [
          {
            text: "Continue",
            onPress: () =>
              router.push("/imagesuploaded"),
          },
        ],
      );
    } catch (error: any) {
      console.error(
        "Error creating packages:",
        error?.response?.data ||
          error?.message ||
          error,
      );

      Alert.alert(
        "Error",
        "Failed to create packages or upload package images. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ------------------------------------------------ */}
      {/* Header */}
      {/* ------------------------------------------------ */}

      <View style={styles.headerContainer}>
        <Text style={styles.header}>
          Create Packages
        </Text>

        <Text style={styles.subHeader}>
          Create customized packages and showcase
          your services beautifully to customers.
        </Text>

        <View style={styles.limitBadge}>
          <Text style={styles.packageLimit}>
            ✨ You can create up to 10 packages
          </Text>
        </View>
      </View>

      {/* ------------------------------------------------ */}
      {/* Package List */}
      {/* ------------------------------------------------ */}

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={{
          paddingBottom: 25,
        }}
      >
        {packages.map((pkg, index) => (
          <View
            key={index}
            style={styles.packageContainer}
          >
            <Text style={styles.packageTitle}>
              Package {index + 1}
            </Text>

            {/* ------------------------------------------ */}
            {/* Package Name */}
            {/* ------------------------------------------ */}

            <Text style={styles.label}>
              Package Name
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Gold Wedding Package"
              placeholderTextColor="#999"
              value={pkg.packageName}
              onChangeText={(text) =>
                updatePackage(
                  index,
                  "packageName",
                  text,
                )
              }
            />

            {/* ------------------------------------------ */}
            {/* Description */}
            {/* ------------------------------------------ */}

            <Text style={styles.label}>
              Description
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
              placeholder="Describe your package..."
              placeholderTextColor="#999"
              multiline
              value={pkg.description || ""}
              onChangeText={(text) =>
                updatePackage(
                  index,
                  "description",
                  text,
                )
              }
            />

            {/* ------------------------------------------ */}
            {/* Base Price */}
            {/* ------------------------------------------ */}

            <Text style={styles.label}>
              Base Price
            </Text>

            <TextInput
              style={styles.input}
              placeholder="PKR"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={String(pkg.price ?? 0)}
              onChangeText={(text) =>
                updatePackage(
                  index,
                  "price",
                  Number(text) || 0,
                )
              }
            />

            <Text style={styles.helperText}>
              Optional old/base price. Fixed duration
              prices are used for the selected duration.
            </Text>

            {/* ------------------------------------------ */}
            {/* Services */}
            {/* ------------------------------------------ */}

            <Text style={styles.label}>
              Services Included
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.servicesInput,
              ]}
              placeholder="Photography, Videography, Drone, Album..."
              placeholderTextColor="#999"
              multiline
              value={pkg.services}
              onChangeText={(text) =>
                updatePackage(
                  index,
                  "services",
                  text,
                )
              }
            />

            {/* ------------------------------------------ */}
            {/* Fixed Durations */}
            {/* ------------------------------------------ */}

            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  Fixed Duration Options
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Add different durations with
                  their own prices.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.smallAddButton}
                onPress={() =>
                  addDuration(index)
                }
              >
                <Text
                  style={
                    styles.smallAddButtonText
                  }
                >
                  + Add
                </Text>
              </TouchableOpacity>
            </View>

            {(pkg.durations || []).map(
              (duration, durationIndex) => (
                <View
                  key={durationIndex}
                  style={styles.durationCard}
                >
                  <Text
                    style={styles.durationTitle}
                  >
                    Duration{" "}
                    {durationIndex + 1}
                  </Text>

                  <View
                    style={styles.durationRow}
                  >
                    {/* Duration Value */}

                    <View
                      style={
                        styles.durationValueWrapper
                      }
                    >
                      <Text
                        style={styles.smallLabel}
                      >
                        Duration
                      </Text>

                      <TextInput
                        style={styles.smallInput}
                        keyboardType="numeric"
                        placeholder="4"
                        placeholderTextColor="#999"
                        value={String(
                          duration.value,
                        )}
                        onChangeText={(text) =>
                          updateDuration(
                            index,
                            durationIndex,
                            "value",
                            text,
                          )
                        }
                      />
                    </View>

                    {/* Unit */}

                    <View
                      style={
                        styles.unitWrapper
                      }
                    >
                      <Text
                        style={styles.smallLabel}
                      >
                        Unit
                      </Text>

                      <View
                        style={styles.unitRow}
                      >
                        <TouchableOpacity
                          style={[
                            styles.unitButton,
                            duration.unit ===
                              "HOURS" &&
                              styles.unitButtonActive,
                          ]}
                          onPress={() =>
                            updateDuration(
                              index,
                              durationIndex,
                              "unit",
                              "HOURS" as DurationUnit,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.unitButtonText,
                              duration.unit ===
                                "HOURS" &&
                                styles.unitButtonTextActive,
                            ]}
                          >
                            Hours
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.unitButton,
                            duration.unit ===
                              "DAYS" &&
                              styles.unitButtonActive,
                          ]}
                          onPress={() =>
                            updateDuration(
                              index,
                              durationIndex,
                              "unit",
                              "DAYS" as DurationUnit,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.unitButtonText,
                              duration.unit ===
                                "DAYS" &&
                                styles.unitButtonTextActive,
                            ]}
                          >
                            Days
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Price */}

                  <Text
                    style={styles.smallLabel}
                  >
                    Price
                  </Text>

                  <TextInput
                    style={styles.smallInput}
                    keyboardType="numeric"
                    placeholder="80000"
                    placeholderTextColor="#999"
                    value={String(
                      duration.price,
                    )}
                    onChangeText={(text) =>
                      updateDuration(
                        index,
                        durationIndex,
                        "price",
                        text,
                      )
                    }
                  />

                  <TouchableOpacity
                    style={
                      styles.removeDurationButton
                    }
                    onPress={() =>
                      removeDuration(
                        index,
                        durationIndex,
                      )
                    }
                  >
                    <Text
                      style={
                        styles.removeDurationText
                      }
                    >
                      Remove Duration
                    </Text>
                  </TouchableOpacity>
                </View>
              ),
            )}

            {(pkg.durations || []).length ===
              0 && (
              <View
                style={
                  styles.emptyDurationBox
                }
              >
                <Text
                  style={
                    styles.emptyDurationText
                  }
                >
                  No fixed duration added yet.
                </Text>
              </View>
            )}

            {/* ------------------------------------------ */}
            {/* Custom Duration */}
            {/* ------------------------------------------ */}

            <View
              style={
                styles.customDurationContainer
              }
            >
              <View
                style={
                  styles.customDurationHeader
                }
              >
                <View
                  style={
                    styles.customDurationTextWrapper
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
                    Allow customers to choose
                    their own duration.
                  </Text>
                </View>

                <Switch
                  value={
                    pkg.allowCustomDuration ??
                    false
                  }
                  onValueChange={() =>
                    toggleCustomDuration(
                      index,
                    )
                  }
                  trackColor={{
                    false: "#D8D8D8",
                    true: "#E6B5DA",
                  }}
                  thumbColor={
                    pkg.allowCustomDuration
                      ? "#780C60"
                      : "#F4F3F4"
                  }
                />
              </View>

              {pkg.allowCustomDuration && (
                <View
                  style={
                    styles.customDurationBody
                  }
                >
                  <Text
                    style={styles.smallLabel}
                  >
                    Custom Unit
                  </Text>

                  <View
                    style={styles.unitRow}
                  >
                    <TouchableOpacity
                      style={[
                        styles.unitButton,
                        pkg.customDurationUnit ===
                          "HOURS" &&
                          styles.unitButtonActive,
                      ]}
                      onPress={() =>
                        updatePackage(
                          index,
                          "customDurationUnit",
                          "HOURS",
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.unitButtonText,
                          pkg.customDurationUnit ===
                            "HOURS" &&
                            styles.unitButtonTextActive,
                        ]}
                      >
                        Hours
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.unitButton,
                        pkg.customDurationUnit ===
                          "DAYS" &&
                          styles.unitButtonActive,
                      ]}
                      onPress={() =>
                        updatePackage(
                          index,
                          "customDurationUnit",
                          "DAYS",
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.unitButtonText,
                          pkg.customDurationUnit ===
                            "DAYS" &&
                            styles.unitButtonTextActive,
                        ]}
                      >
                        Days
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={styles.smallLabel}
                  >
                    Rate per{" "}
                    {pkg.customDurationUnit ===
                    "DAYS"
                      ? "Day"
                      : "Hour"}
                  </Text>

                  <TextInput
                    style={styles.smallInput}
                    placeholder="20000"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={String(
                      pkg.customDurationRate ||
                        0,
                    )}
                    onChangeText={(text) =>
                      updatePackage(
                        index,
                        "customDurationRate",
                        Number(text) || 0,
                      )
                    }
                  />

                  <Text
                    style={
                      styles.calculationHint
                    }
                  >
                    Example: 6{" "}
                    {pkg.customDurationUnit ===
                    "DAYS"
                      ? "days"
                      : "hours"}{" "}
                    × PKR{" "}
                    {Number(
                      pkg.customDurationRate ||
                        0,
                    ).toLocaleString()}{" "}
                    = calculated package price
                  </Text>
                </View>
              )}
            </View>

            {/* ------------------------------------------ */}
            {/* Package Images */}
            {/* ------------------------------------------ */}

            <View style={styles.sectionHeader}>
              <View>
                <Text
                  style={styles.sectionTitle}
                >
                  Package Images
                </Text>

                <Text
                  style={styles.sectionSubtitle}
                >
                  Select up to 10 images from your
                  gallery for this package.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.smallAddButton}
                onPress={() =>
                  pickPackageImages(index)
                }
                disabled={isSubmitting}
              >
                <Text
                  style={
                    styles.smallAddButtonText
                  }
                >
                  + Gallery
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image Preview Grid */}

            {(pkg.imageAssets || []).length >
              0 ? (
              <View style={styles.imageGrid}>
                {(pkg.imageAssets || []).map(
                  (image, imageIndex) => (
                    <View
                      key={`${image.uri}-${imageIndex}`}
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
                          removeImage(
                            index,
                            imageIndex,
                          )
                        }
                        disabled={
                          isSubmitting
                        }
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
                  ),
                )}
              </View>
            ) : (
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
                  No package images selected yet.
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

            {/* Image Count */}

            {(pkg.imageAssets || []).length >
              0 && (
              <Text style={styles.imageCountText}>
                {pkg.imageAssets.length}/10 images
                selected
              </Text>
            )}

            {/* ------------------------------------------ */}
            {/* Upload Progress */}
            {/* ------------------------------------------ */}

            {uploadProgress[index] !==
              undefined && (
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
                    {uploadProgress[index]}%
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
                        width: `${uploadProgress[index]}%`,
                      },
                    ]}
                  />
                </View>

                {uploadProgress[index] <
                  100 && (
                  <View
                    style={
                      styles.uploadingRow
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color="#780C60"
                    />

                    <Text
                      style={
                        styles.uploadingText
                      }
                    >
                      Please wait...
                    </Text>
                  </View>
                )}

                {uploadProgress[index] ===
                  100 && (
                  <Text
                    style={
                      styles.uploadCompleteText
                    }
                  >
                    ✓ Images uploaded successfully
                  </Text>
                )}
              </View>
            )}

            {/* ------------------------------------------ */}
            {/* Remove Package */}
            {/* ------------------------------------------ */}

            <TouchableOpacity
              onPress={() =>
                removePackage(index)
              }
              style={styles.deleteButton}
              disabled={isSubmitting}
            >
              <Text style={styles.deleteText}>
                Remove Package
              </Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* -------------------------------------------- */}
        {/* Add Package */}
        {/* -------------------------------------------- */}

        <View
          style={styles.addButtonContainer}
        >
          <View style={styles.line} />

          <TouchableOpacity
            style={styles.addButton}
            onPress={addPackage}
            disabled={isSubmitting}
          >
            <Text
              style={styles.addButtonText}
            >
              + Create New Package
            </Text>
          </TouchableOpacity>

          <View style={styles.line} />
        </View>
      </ScrollView>

      {/* ------------------------------------------------ */}
      {/* Footer */}
      {/* ------------------------------------------------ */}

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={isSubmitting}
        >
          <Text
            style={styles.backButtonText}
          >
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            isSubmitting &&
              styles.saveButtonDisabled,
          ]}
          onPress={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View
              style={styles.savingRow}
            >
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.saveButtonText
                }
              >
                Saving...
              </Text>
            </View>
          ) : (
            <Text
              style={styles.saveButtonText}
            >
              Save & Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =========================================================
// Styles
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF6FA",
    paddingHorizontal: 20,
    paddingTop: 65,
    paddingBottom: 25,
  },

  headerContainer: {
    alignItems: "center",
    marginBottom: 25,
  },

  header: {
    fontSize: 30,
    fontWeight: "800",
    color: "#780C60",
    marginBottom: 10,
    textAlign: "center",
  },

  subHeader: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 10,
  },

  packageLimit: {
    fontSize: 14,
    color: "#780C60",
    fontWeight: "600",
  },

  limitBadge: {
    marginTop: 15,
    backgroundColor: "#F9E7F3",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },

  scrollContainer: {
    flex: 1,
  },

  packageContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#F1D5E8",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 5,
  },

  packageTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#780C60",
    marginBottom: 15,
  },

  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    marginBottom: 7,
    marginTop: 10,
  },

  input: {
    backgroundColor: "#FAF7FA",
    borderWidth: 1,
    borderColor: "#E6D3E2",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    color: "#333",
  },

  descriptionInput: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: 14,
  },

  servicesInput: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: 14,
  },

  helperText: {
    fontSize: 11,
    color: "#888",
    marginTop: 5,
    lineHeight: 17,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#780C60",
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#888",
    marginTop: 3,
    maxWidth: 230,
    lineHeight: 16,
  },

  smallAddButton: {
    backgroundColor: "#F9E7F3",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  smallAddButtonText: {
    color: "#780C60",
    fontSize: 12,
    fontWeight: "800",
  },

  durationCard: {
    backgroundColor: "#FCF8FC",
    borderWidth: 1,
    borderColor: "#EBD7E7",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },

  durationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#780C60",
    marginBottom: 10,
  },

  durationRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },

  durationValueWrapper: {
    flex: 0.8,
  },

  unitWrapper: {
    flex: 1.5,
  },

  smallLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
    marginBottom: 6,
  },

  smallInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6D3E2",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: "#333",
  },

  unitRow: {
    flexDirection: "row",
    gap: 7,
  },

  unitButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0CBDC",
    backgroundColor: "#FFFFFF",
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: "center",
  },

  unitButtonActive: {
    backgroundColor: "#780C60",
    borderColor: "#780C60",
  },

  unitButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#666",
  },

  unitButtonTextActive: {
    color: "#FFFFFF",
  },

  removeDurationButton: {
    alignSelf: "flex-end",
    marginTop: 10,
  },

  removeDurationText: {
    color: "#D64545",
    fontSize: 11,
    fontWeight: "700",
  },

  emptyDurationBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DFC8DB",
    borderRadius: 14,
    padding: 15,
    alignItems: "center",
  },

  emptyDurationText: {
    fontSize: 12,
    color: "#999",
  },

  customDurationContainer: {
    marginTop: 15,
    backgroundColor: "#FFF9FD",
    borderWidth: 1,
    borderColor: "#EBD7E7",
    borderRadius: 17,
    padding: 14,
  },

  customDurationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  customDurationTextWrapper: {
    flex: 1,
  },

  customDurationBody: {
    marginTop: 15,
  },

  calculationHint: {
    fontSize: 11,
    color: "#780C60",
    marginTop: 8,
    lineHeight: 16,
  },

  // =======================================================
  // Package Images
  // =======================================================

  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 5,
  },

  imagePreviewContainer: {
    width: 92,
    height: 92,
    borderRadius: 14,
    overflow: "visible",
    position: "relative",
    marginBottom: 4,
  },

  imagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    backgroundColor: "#F5EDF3",
  },

  imageRemoveButton: {
    position: "absolute",
    right: -7,
    top: -7,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0D5E5",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },

    elevation: 3,
  },

  imageRemoveText: {
    color: "#D64545",
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 21,
  },

  emptyImageBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#DFC8DB",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    marginTop: 5,
  },

  emptyImageIcon: {
    fontSize: 30,
    marginBottom: 7,
  },

  emptyImageText: {
    fontSize: 12,
    color: "#777",
    fontWeight: "600",
  },

  emptyImageSubText: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },

  imageCountText: {
    fontSize: 11,
    color: "#780C60",
    fontWeight: "700",
    marginTop: 8,
  },

  // =======================================================
  // Upload Progress
  // =======================================================

  uploadProgressContainer: {
    marginTop: 14,
    backgroundColor: "#FFF9FD",
    borderWidth: 1,
    borderColor: "#EBD7E7",
    borderRadius: 14,
    padding: 12,
  },

  uploadProgressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  uploadProgressLabel: {
    fontSize: 11,
    color: "#666",
    fontWeight: "700",
  },

  uploadProgressPercent: {
    fontSize: 12,
    color: "#780C60",
    fontWeight: "800",
  },

  progressBackground: {
    height: 8,
    backgroundColor: "#EBDCE7",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#780C60",
    borderRadius: 10,
  },

  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 7,
  },

  uploadingText: {
    fontSize: 11,
    color: "#888",
  },

  uploadCompleteText: {
    fontSize: 11,
    color: "#2E7D32",
    fontWeight: "700",
    marginTop: 8,
  },

  // =======================================================
  // Package Delete
  // =======================================================

  deleteButton: {
    alignSelf: "flex-end",
    marginTop: 18,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFF0F4",
  },

  deleteText: {
    color: "#D64545",
    fontSize: 13,
    fontWeight: "700",
  },

  // =======================================================
  // Add Package
  // =======================================================

  addButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E6C9DC",
  },

  addButton: {
    backgroundColor: "#780C60",
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 30,
    marginHorizontal: 12,

    shadowColor: "#780C60",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 5,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // =======================================================
  // Footer
  // =======================================================

  footer: {
    flexDirection: "row",
    marginTop: 15,
  },

  backButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#780C60",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  backButtonText: {
    color: "#780C60",
    fontSize: 16,
    fontWeight: "700",
  },

  saveButton: {
    flex: 1,
    backgroundColor: "#780C60",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,

    shadowColor: "#780C60",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 6,
  },

  saveButtonDisabled: {
    opacity: 0.7,
  },

  savingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default PackagesScreen;
