// fyp-mobile/components/imagesuploaded/ImagesUploadedIndex.tsx

import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  uploadMultipleImages,
  UploadMediaAsset,
} from "@/services/uploadMultipleImages";
import { getSubscriptionAccessState } from "@/services/getSubscriptionAccessState";
import { getSecureData } from "@/store";
import type { SubscriptionAccessState } from "@/types/subscription.types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get("window");

const API_BASE_URL = "https://eventify-hub.onrender.com";

const PRIMARY = "#780C60";
const PRIMARY_SOFT = "#F3E4EF";
const BG = "#FDF5FB";
const TEXT_DARK = "#3D1633";
const TEXT_MUTED = "#8A7A85";
const BORDER = "#F0DCEB";

const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

const isLikelyUnsupportedFormat = (uri: string) =>
  /\.heic$/i.test(uri) || /\.heif$/i.test(uri);

/* =========================================================
   Zoomable Image (full screen viewer)
========================================================= */

const ZoomableImage: React.FC<{ uri: string }> = ({ uri }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);
  const lastDistance = useRef<number | null>(null);
  const lastTap = useRef<number>(0);

  const getDistance = (touches: any[]) => {
    const [a, b] = touches;
    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const resetZoom = () => {
    lastScale.current = 1;
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;

    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 6 }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 6 }),
    ]).start();
  };

  const zoomIn = () => {
    lastScale.current = 2.5;
    Animated.spring(scale, {
      toValue: 2.5,
      useNativeDriver: true,
      friction: 6,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lastDistance.current = null;
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches;

        if (touches.length === 2) {
          const distance = getDistance(touches);

          if (lastDistance.current != null) {
            const delta = distance / lastDistance.current;
            let newScale = lastScale.current * delta;
            newScale = Math.max(1, Math.min(newScale, 4));
            scale.setValue(newScale);
          }

          lastDistance.current = distance;
        } else if (touches.length === 1 && lastScale.current > 1) {
          translateX.setValue(lastTranslateX.current + gestureState.dx);
          translateY.setValue(lastTranslateY.current + gestureState.dy);
        }
      },
      onPanResponderRelease: (evt) => {
        if (evt.nativeEvent.touches.length === 0) {
          scale.stopAnimation((value) => {
            const clamped = Math.max(1, Math.min(value, 4));
            lastScale.current = clamped;

            if (clamped === 1) {
              resetZoom();
            } else {
              Animated.spring(scale, {
                toValue: clamped,
                useNativeDriver: true,
                friction: 6,
              }).start();
            }
          });

          translateX.stopAnimation((value) => {
            lastTranslateX.current = value;
          });

          translateY.stopAnimation((value) => {
            lastTranslateY.current = value;
          });
        }

        lastDistance.current = null;

        const now = Date.now();
        if (now - lastTap.current < 280) {
          if (lastScale.current > 1) {
            resetZoom();
          } else {
            zoomIn();
          }
        }
        lastTap.current = now;
      },
    }),
  ).current;

  return (
    <View style={styles.zoomableContainer} {...panResponder.panHandlers}>
      <AnimatedExpoImage
        source={{ uri: encodeURI(uri) }}
        style={[
          styles.zoomableImage,
          { transform: [{ translateX }, { translateY }, { scale }] },
        ]}
        contentFit="contain"
        cachePolicy="memory-disk"
        priority="high"
        recyclingKey={uri}
        transition={150}
      />
    </View>
  );
};

/* =========================================================
   Main Screen: Manage Portfolio
========================================================= */

const ManagePortfolioScreen: React.FC = () => {
    const { vendorId: routeVendorId, readOnly: readOnlyParam } =
    useLocalSearchParams<{
      vendorId?: string;
      readOnly?: string;
    }>();

  const isReadOnly = readOnlyParam === "true";

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Existing (already uploaded) images
  const [images, setImages] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(
    () => new Set(),
  );

  // Newly picked images (not uploaded yet)
  const [stagedImages, setStagedImages] = useState<UploadMediaAsset[]>([]);
  const [uploading, setUploading] = useState(false);

  // Viewer
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Delete state
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(
    () => new Set(),
  );
  const [deletingSelected, setDeletingSelected] = useState(false);

  // Subscription
  const [subscriptionAccess, setSubscriptionAccess] =
    useState<SubscriptionAccessState | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [subscriptionLoadError, setSubscriptionLoadError] = useState(false);

  /* =====================================================
     Limits
  ===================================================== */

  const maxPortfolioImages =
    subscriptionAccess?.limits?.maxPortfolioImages ?? 0;

  const totalPortfolioUsage = images.length + stagedImages.length;

  const remainingPortfolioSlots = Math.max(
    0,
    maxPortfolioImages - totalPortfolioUsage,
  );

  const portfolioLimitReached =
    !loadingSubscription &&
    !subscriptionLoadError &&
    subscriptionAccess !== null &&
    remainingPortfolioSlots <= 0;

  /* =====================================================
     Fetch existing images
  ===================================================== */

  const fetchImages = useCallback(async (id: string) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/vendor?userId=${id}`,
      );

      const received = Array.isArray(response.data?.images)
        ? response.data.images
        : [];

      const normalized = received
        .map((image: any) => {
          if (typeof image === "string") return image.trim();
          if (image?.url) return String(image.url).trim();
          if (image?.imageUrl) return String(image.imageUrl).trim();
          if (image?.Location) return String(image.Location).trim();
          if (image?.location) return String(image.location).trim();
          return "";
        })
        .filter(
          (url: string) =>
            (url.startsWith("http://") || url.startsWith("https://")) &&
            !isLikelyUnsupportedFormat(url),
        );

      setImages(normalized);
    } catch (error) {
      console.error("Error fetching images:", error);
      Alert.alert("Error", "Could not load vendor photos.");
    }
  }, []);

  const fetchSubscriptionAccess = useCallback(async (id: string) => {
    try {
      setLoadingSubscription(true);
      setSubscriptionLoadError(false);

      const access = await getSubscriptionAccessState(id);
      setSubscriptionAccess(access);
    } catch (error) {
      console.error("Error fetching subscription access:", error);
      setSubscriptionAccess(null);
      setSubscriptionLoadError(true);
    } finally {
      setLoadingSubscription(false);
    }
  }, []);

  /* =====================================================
     Initial load
  ===================================================== */

  useEffect(() => {
    const loadScreenData = async () => {
      try {
        setLoading(true);

        let id: string | undefined =
          typeof routeVendorId === "string" && routeVendorId
            ? routeVendorId
            : undefined;

        if (!id) {
          const userRaw = await getSecureData("user");

          if (userRaw) {
            const userData = JSON.parse(userRaw);
            id = userData?._id;
          }
        }

        if (!id) {
          setSubscriptionAccess(null);
          setSubscriptionLoadError(true);
          setLoadingSubscription(false);

          Alert.alert(
            "Error",
            "Vendor ID not found. Please log in again.",
          );
          return;
        }

         setVendorId(id);

        if (isReadOnly) {
          setLoadingSubscription(false);
          await fetchImages(id);
        } else {
          await Promise.all([
            fetchImages(id),
            fetchSubscriptionAccess(id),
          ]);
        }
      } catch (error) {
        console.error("Error loading portfolio screen:", error);
        setSubscriptionAccess(null);
        setSubscriptionLoadError(true);
        setLoadingSubscription(false);

        Alert.alert(
          "Error",
          "Could not load your portfolio. Please check your connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    loadScreenData();
  }, [routeVendorId, isReadOnly, fetchImages, fetchSubscriptionAccess]);

  const retrySubscription = async () => {
    if (!vendorId) {
      Alert.alert("Error", "Vendor ID not found.");
      return;
    }

    await Promise.all([
      fetchImages(vendorId),
      fetchSubscriptionAccess(vendorId),
    ]);
  };

  /* =====================================================
     Pick images (staged, uploaded on Save)
  ===================================================== */

  const handleChoosePhotos = async () => {
    try {
      if (!vendorId) {
        Alert.alert("Error", "Vendor ID is missing.");
        return;
      }

      if (loadingSubscription) {
        Alert.alert(
          "Please Wait",
          "Your subscription limits are still loading.",
        );
        return;
      }

      if (subscriptionLoadError || !subscriptionAccess) {
        Alert.alert(
          "Subscription Unavailable",
          "We could not verify your subscription limits. Please check your connection and try again.",
        );
        return;
      }

      if (maxPortfolioImages <= 0) {
        Alert.alert(
          "Upload Unavailable",
          "Your current subscription does not allow new portfolio image uploads. Please renew or upgrade your subscription.",
        );
        return;
      }

      if (remainingPortfolioSlots <= 0) {
        Alert.alert(
          "Portfolio Limit Reached",
          `Your current subscription allows up to ${maxPortfolioImages} portfolio images.`,
        );
        return;
      }

      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please allow gallery access to select portfolio images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: remainingPortfolioSlots,
        legacy: Platform.OS === "android",
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      if (result.assets.length > remainingPortfolioSlots) {
        Alert.alert(
          "Portfolio Limit Reached",
          `You can select only ${remainingPortfolioSlots} more image${
            remainingPortfolioSlots === 1 ? "" : "s"
          }.`,
        );
        return;
      }

      const selectedMedia: UploadMediaAsset[] = result.assets.map(
        (asset, index) => ({
          uri: asset.uri,
          name:
            asset.fileName || `portfolio-${Date.now()}-${index}.jpg`,
          type: asset.mimeType || "image/jpeg",
        }),
      );

      setStagedImages((prev) => [...prev, ...selectedMedia]);
    } catch (error) {
      console.error("Error picking images:", error);
      Alert.alert("Error", "An error occurred while selecting photos.");
    }
  };

  const removeStagedImage = (index: number) => {
    setStagedImages((prev) => prev.filter((_, i) => i !== index));
  };

  /* =====================================================
     Save staged images
  ===================================================== */

  const handleSaveStaged = async () => {
    if (!vendorId) {
      Alert.alert("Error", "Vendor ID is missing.");
      return;
    }

    if (stagedImages.length === 0) {
      Alert.alert(
        "No Images Selected",
        "Please select at least one portfolio image.",
      );
      return;
    }

    if (loadingSubscription) {
      Alert.alert(
        "Please Wait",
        "Your subscription limits are still loading.",
      );
      return;
    }

    if (subscriptionLoadError || !subscriptionAccess) {
      Alert.alert(
        "Subscription Unavailable",
        "We could not verify your subscription limits. Please check your connection and try again.",
      );
      return;
    }

    if (images.length + stagedImages.length > maxPortfolioImages) {
      Alert.alert(
        "Portfolio Limit Reached",
        `Your current subscription allows up to ${maxPortfolioImages} portfolio images.`,
      );
      return;
    }

    try {
      setUploading(true);

      const count = stagedImages.length;

      await uploadMultipleImages(vendorId, stagedImages);

      setStagedImages([]);
      await fetchImages(vendorId);

      Alert.alert(
        "Success",
        `${count} photo${count === 1 ? "" : "s"} uploaded successfully.`,
      );
    } catch (error: any) {
      console.error(
        "Failed to upload images:",
        error?.response?.status,
        error?.response?.data || error?.message || error,
      );

      Alert.alert(
        "Upload Error",
        error?.response?.data?.message
          ? String(error.response.data.message)
          : "Failed to upload images. Please check your internet connection and try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  /* =====================================================
     Viewer
  ===================================================== */

  const openViewer = (index: number) => {
    setSelectedIndex(index);
    setModalVisible(true);
  };

  const showPrev = () =>
    setSelectedIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1,
    );

  const showNext = () =>
    setSelectedIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1,
    );

  /* =====================================================
     Single delete
  ===================================================== */

  const deleteVendorPhoto = (index: number) => {
    const imageUrl = images[index];

    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this image?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (!vendorId) {
                Alert.alert("Error", "Vendor ID is missing.");
                return;
              }

              setDeletingIndex(index);

              await axios.delete(`${API_BASE_URL}/vendor/image`, {
                data: { userId: vendorId, imageUrl },
              });

              await fetchImages(vendorId);

              if (modalVisible) {
                setModalVisible(false);
              }

              setSelectedIndex(0);
            } catch (error: any) {
              console.error(
                "Delete photo error:",
                error?.response?.data || error,
              );

              const serverMessage =
                typeof error?.response?.data?.message === "string"
                  ? error.response.data.message
                  : null;

              Alert.alert(
                "Error",
                serverMessage || "Failed to delete photo.",
              );
            } finally {
              setDeletingIndex(null);
            }
          },
        },
      ],
    );
  };

  /* =====================================================
     Multi select + batch delete
  ===================================================== */

  const startSelectionMode = () => {
    setSelectionMode(true);
    setSelectedImages(new Set());
  };

  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedImages(new Set());
  };

  const toggleImageSelection = (imageUrl: string) => {
    setSelectionMode(true);

    setSelectedImages((previous) => {
      const next = new Set(previous);

      if (next.has(imageUrl)) {
        next.delete(imageUrl);
      } else {
        next.add(imageUrl);
      }

      return next;
    });
  };

  const selectAllImages = () => {
    if (selectedImages.size === images.length) {
      setSelectedImages(new Set());
      return;
    }

    setSelectedImages(new Set(images));
  };

  const confirmDeleteSelected = () => {
    const selectedUrls = Array.from(selectedImages);
    const count = selectedUrls.length;

    if (count === 0) {
      Alert.alert(
        "No Images Selected",
        "Please select at least one image to delete.",
      );
      return;
    }

    Alert.alert(
      "Delete Images",
      `Are you sure you want to delete ${count} image${
        count === 1 ? "" : "s"
      }?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Delete ${count}`,
          style: "destructive",
          onPress: async () => {
            if (!vendorId) {
              Alert.alert("Error", "Vendor ID is missing.");
              return;
            }

            try {
              setDeletingSelected(true);

              const results = await Promise.allSettled(
                selectedUrls.map((imageUrl) =>
                  axios.delete(`${API_BASE_URL}/vendor/image`, {
                    data: { userId: vendorId, imageUrl },
                  }),
                ),
              );

              const deletedCount = results.filter(
                (r) => r.status === "fulfilled",
              ).length;

              const failedCount = count - deletedCount;

              await fetchImages(vendorId);
              cancelSelectionMode();

              if (failedCount === 0) {
                Alert.alert(
                  "Deleted",
                  `${deletedCount} image${
                    deletedCount === 1 ? "" : "s"
                  } deleted successfully.`,
                );
              } else {
                Alert.alert(
                  "Partially Deleted",
                  `${deletedCount} image${
                    deletedCount === 1 ? "" : "s"
                  } deleted. ${failedCount} could not be deleted.`,
                );
              }
            } catch (error) {
              console.error("Batch delete error:", error);
              await fetchImages(vendorId);
              Alert.alert(
                "Error",
                "Could not complete image deletion. Please try again.",
              );
            } finally {
              setDeletingSelected(false);
            }
          },
        },
      ],
    );
  };

  /* =====================================================
     Loading
  ===================================================== */

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading portfolio...</Text>
      </View>
    );
  }

  const uploadDisabled =
    uploading ||
    loadingSubscription ||
    subscriptionLoadError ||
    portfolioLimitReached;

  /* =====================================================
     UI
  ===================================================== */

  return (
    <View style={styles.container}>
      <FlatList
        data={images}
        keyExtractor={(item, index) => `${item}-${index}`}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.screenScrollContent,
          stagedImages.length > 0 && { paddingBottom: 130 },
        ]}
        columnWrapperStyle={images.length > 1 ? styles.gridRow : undefined}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={80}
        windowSize={3}
        removeClippedSubviews={Platform.OS === "android"}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
                activeOpacity={0.75}
                disabled={uploading}
              >
                <Ionicons name="arrow-back" size={22} color={PRIMARY} />
              </TouchableOpacity>

                  <Text style={styles.title}>
                {isReadOnly ? "Photos" : "Manage Portfolio"}
              </Text>

              <View style={styles.headerRight}>
                                {!isReadOnly && !selectionMode && images.length > 0 && (
                  <TouchableOpacity
                    onPress={startSelectionMode}
                    style={styles.selectHeaderButton}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={16}
                      color={PRIMARY}
                    />
                    <Text style={styles.selectHeaderButtonText}>
                      Select
                    </Text>
                  </TouchableOpacity>
                )}

                {selectionMode && (
                  <TouchableOpacity
                    onPress={cancelSelectionMode}
                    style={styles.cancelSelectButton}
                    disabled={deletingSelected}
                  >
                    <Text style={styles.cancelSelectButtonText}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

             {/* Selection toolbar */}
            {!isReadOnly && selectionMode && (
              <View style={styles.selectionToolbar}>
                <View>
                  <Text style={styles.selectionCountText}>
                    {selectedImages.size} selected
                  </Text>
                  <TouchableOpacity
                    onPress={selectAllImages}
                    disabled={deletingSelected}
                  >
                    <Text style={styles.selectAllText}>
                      {selectedImages.size === images.length
                        ? "Clear all"
                        : "Select all"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.deleteSelectedButton,
                    selectedImages.size === 0 &&
                      styles.deleteSelectedButtonDisabled,
                  ]}
                  onPress={confirmDeleteSelected}
                  disabled={selectedImages.size === 0 || deletingSelected}
                  activeOpacity={0.85}
                >
                  {deletingSelected ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#FFFFFF"
                    />
                  )}
                  <Text style={styles.deleteSelectedButtonText}>
                    Delete
                    {selectedImages.size > 0
                      ? ` (${selectedImages.size})`
                      : ""}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

             {/* Usage card */}
            {!isReadOnly && (
            <View style={styles.usageCard}>
              <View style={styles.usageTopRow}>
                <View style={styles.usageIconCircle}>
                  <Ionicons
                    name="images-outline"
                    size={18}
                    color={PRIMARY}
                  />
                </View>

                <View style={styles.usageTextWrap}>
                  <Text style={styles.usageTitle}>Portfolio Images</Text>

                  {loadingSubscription ? (
                    <Text style={styles.usageSubtitle}>
                      Loading your subscription limit...
                    </Text>
                  ) : subscriptionLoadError ? (
                    <Text style={styles.usageErrorText}>
                      Could not verify subscription limits.
                    </Text>
                  ) : (
                    <Text style={styles.usageSubtitle}>
                      {totalPortfolioUsage} of {maxPortfolioImages} images
                      used
                    </Text>
                  )}
                </View>

                {!loadingSubscription && !subscriptionLoadError && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {totalPortfolioUsage}/{maxPortfolioImages}
                    </Text>
                  </View>
                )}
              </View>

              {!loadingSubscription &&
                !subscriptionLoadError &&
                maxPortfolioImages > 0 && (
                  <>
                    <View style={styles.usageProgressBackground}>
                      <View
                        style={[
                          styles.usageProgressFill,
                          {
                            width: `${Math.min(
                              100,
                              (totalPortfolioUsage / maxPortfolioImages) *
                                100,
                            )}%`,
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.remainingText}>
                      {remainingPortfolioSlots > 0
                        ? `${remainingPortfolioSlots} image${
                            remainingPortfolioSlots === 1 ? "" : "s"
                          } remaining`
                        : "Portfolio image limit reached"}
                    </Text>
                  </>
                )}

              {subscriptionLoadError && (
                <TouchableOpacity
                  onPress={retrySubscription}
                  style={styles.retryButton}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={15} color={PRIMARY} />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>

            )}

            {/* Limit card */}
            {!isReadOnly &&
              !loadingSubscription &&
              !subscriptionLoadError &&
              portfolioLimitReached && (
                <View style={styles.limitCard}>
                  <View style={styles.limitCardIcon}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#8A4B16"
                    />
                  </View>

                  <View style={styles.limitCardContent}>
                    <Text style={styles.limitCardTitle}>
                      {maxPortfolioImages > 0
                        ? "Portfolio Limit Reached"
                        : "Portfolio Upload Unavailable"}
                    </Text>

                    <Text style={styles.limitCardText}>
                      {maxPortfolioImages > 0
                        ? `Your current subscription allows up to ${maxPortfolioImages} portfolio images. Existing photos will remain available.`
                        : "Your current subscription does not allow new portfolio image uploads. Existing photos will remain available."}
                    </Text>

                    <TouchableOpacity
                      style={styles.upgradeButton}
                      onPress={() => {
                        if (!vendorId) return;

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
                </View>
              )}

              {/* Upload box (Choose Photos) */}
            {!isReadOnly && !selectionMode && (
              <TouchableOpacity
                style={[
                  styles.uploadCard,
                  uploadDisabled && styles.uploadCardDisabled,
                ]}
                onPress={handleChoosePhotos}
                disabled={uploadDisabled}
                activeOpacity={0.85}
              >
                <View style={styles.uploadIconCircle}>
                  <Ionicons
                    name="cloud-upload-outline"
                    size={26}
                    color={PRIMARY}
                  />
                </View>

                <View style={styles.uploadTextWrap}>
                  <Text style={styles.uploadTitle}>
                    Add Portfolio Images
                  </Text>

                  <Text style={styles.uploadText}>
                    {loadingSubscription
                      ? "Loading your subscription limits..."
                      : subscriptionLoadError
                        ? "Subscription limits could not be verified."
                        : portfolioLimitReached
                          ? "Your current portfolio limit has been reached."
                          : `You can add ${remainingPortfolioSlots} more image${
                              remainingPortfolioSlots === 1 ? "" : "s"
                            }.`}
                  </Text>
                </View>

                {!uploadDisabled && (
                  <View style={styles.chooseFileButton}>
                    <Text style={styles.chooseFileButtonText}>
                      Choose Photos
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Staged (not uploaded yet) */}
              {!isReadOnly && stagedImages.length > 0 && !selectionMode && (
              <View style={styles.stagedWrapper}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    Ready to upload ({stagedImages.length})
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Total after upload: {totalPortfolioUsage}/
                    {maxPortfolioImages}
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.stagedRow}
                >
                  {stagedImages.map((media, index) => (
                    <View
                      key={`${media.uri}-${index}`}
                      style={styles.stagedItem}
                    >
                      <ExpoImage
                        source={{ uri: media.uri }}
                        style={styles.stagedPhoto}
                        contentFit="cover"
                      />

                      <TouchableOpacity
                        style={styles.stagedRemoveButton}
                        onPress={() => removeStagedImage(index)}
                        disabled={uploading}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name="close"
                          size={14}
                          color="#FFFFFF"
                        />
                      </TouchableOpacity>

                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>New</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Existing images title */}
                        {images.length > 0 && (
              <View style={styles.portfolioHeaderWrap}>
                <View style={styles.portfolioTitleRow}>
                  <View style={styles.portfolioLine} />

                  <View style={styles.portfolioPill}>
                    <Ionicons
                      name="images-outline"
                      size={16}
                      color={PRIMARY}
                    />
                    <Text style={styles.portfolioPillText}>Portfolio</Text>
                    <View style={styles.portfolioCountBadge}>
                      <Text style={styles.portfolioCountText}>
                        {images.length}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.portfolioLine} />
                </View>

                {!isReadOnly && !selectionMode && (
                  <Text style={styles.portfolioHint}>
                    Long press to select
                  </Text>
                )}
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="image-outline" size={30} color={PRIMARY} />
            </View>

            <Text style={styles.emptyTitle}>No photos yet</Text>

                        <Text style={styles.emptyText}>
              {isReadOnly
                ? "This vendor has not added any photos yet."
                : "Add portfolio photos to showcase your work to clients."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const isSelected = selectedImages.has(item);

          return (
            <View style={styles.imageContainer}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  if (selectionMode) {
                    toggleImageSelection(item);
                  } else {
                    openViewer(index);
                  }
                }}
                                onLongPress={
                  isReadOnly ? undefined : () => toggleImageSelection(item)
                }
              >
                <View style={styles.imageLoaderWrapper}>
                  {!loadedImages.has(item) && (
                    <View style={styles.imageLoadingOverlay}>
                      <ActivityIndicator size="small" color={PRIMARY} />
                    </View>
                  )}

                  <ExpoImage
                    source={{ uri: encodeURI(item) }}
                    style={styles.image}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    priority="low"
                    recyclingKey={item}
                    transition={100}
                    onLoad={() => {
                      setLoadedImages((previous) => {
                        const next = new Set(previous);
                        next.add(item);
                        return next;
                      });
                    }}
                    onError={(event) => {
                      console.error("[PORTFOLIO IMAGE ERROR]", item, event);

                      setLoadedImages((previous) => {
                        const next = new Set(previous);
                        next.add(item);
                        return next;
                      });
                    }}
                  />
                </View>

                {selectionMode && (
                  <View
                    style={[
                      styles.selectionOverlay,
                      isSelected && styles.selectionOverlaySelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.selectionCheck,
                        isSelected && styles.selectionCheckSelected,
                      ]}
                    >
                      {isSelected && (
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color="#FFFFFF"
                        />
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>

                {!isReadOnly && !selectionMode && (
                <TouchableOpacity
                  style={styles.photoDeleteButton}
                  onPress={() => deleteVendorPhoto(index)}
                  disabled={deletingIndex === index}
                  activeOpacity={0.8}
                >
                  {deletingIndex === index ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color="#FFFFFF"
                    />
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />

      {/* Sticky upload footer (only when new photos are staged) */}
          {!isReadOnly && stagedImages.length > 0 && !selectionMode && (
        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => setStagedImages([])}
            style={styles.buttonBack}
            disabled={uploading}
            activeOpacity={0.85}
          >
            <Text style={styles.backText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, uploading && styles.disabledButton]}
            disabled={uploading}
            onPress={handleSaveStaged}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>
                Upload {stagedImages.length} Photo
                {stagedImages.length === 1 ? "" : "s"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Full screen viewer */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.modalCloseButton}
              activeOpacity={0.75}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.modalCounter}>
              {images.length > 0
                ? `${selectedIndex + 1} / ${images.length}`
                : ""}
            </Text>

            <View style={styles.modalCloseButtonPlaceholder} />
          </View>

          {images.length > 0 && (
            <ZoomableImage
              key={selectedIndex}
              uri={images[selectedIndex]}
            />
          )}

          {images.length > 1 && (
            <View style={styles.modalNavRow} pointerEvents="box-none">
              <TouchableOpacity
                onPress={showPrev}
                style={styles.modalNavButton}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={showNext}
                style={styles.modalNavButton}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.modalHint}>Pinch or double-tap to zoom</Text>
        </View>
      </Modal>
    </View>
  );
};

/* =========================================================
   Styles
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  screenScrollContent: {
    paddingTop: 70,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BG,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: TEXT_MUTED,
    fontWeight: "600",
  },

  /* Header */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },

    /* Portfolio header (centered) */

  portfolioHeaderWrap: {
    alignItems: "center",
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 16,
  },

  portfolioTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },

  portfolioLine: {
    flex: 1,
    height: 1.5,
    borderRadius: 2,
    backgroundColor: "#E8C9DF",
  },

  portfolioPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBCFE3",
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 10,
    shadowColor: PRIMARY,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  portfolioPillText: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },

  portfolioCountBadge: {
    backgroundColor: PRIMARY,
    borderRadius: 11,
    minWidth: 24,
    height: 22,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  portfolioCountText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },

  portfolioHint: {
    marginTop: 8,
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
  },

  headerRight: {
    minWidth: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 7,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  selectHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBCFE3",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 4,
  },

  selectHeaderButtonText: {
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "800",
  },

  cancelSelectButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBCFE3",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  cancelSelectButtonText: {
    color: PRIMARY,
    fontSize: 11.5,
    fontWeight: "800",
  },

  /* Selection toolbar */

  selectionToolbar: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectionCountText: {
    color: TEXT_DARK,
    fontSize: 13,
    fontWeight: "800",
  },

  selectAllText: {
    marginTop: 4,
    color: PRIMARY,
    fontSize: 11,
    fontWeight: "700",
  },

  deleteSelectedButton: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#B3261E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  deleteSelectedButtonDisabled: {
    opacity: 0.45,
  },

  deleteSelectedButtonText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },

  /* Usage card */

  usageCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: PRIMARY,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  usageTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  usageIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F6E4F1",
    alignItems: "center",
    justifyContent: "center",
  },

  usageTextWrap: {
    flex: 1,
    marginLeft: 10,
  },

  usageTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  usageSubtitle: {
    marginTop: 3,
    fontSize: 11.5,
    color: TEXT_MUTED,
  },

  usageErrorText: {
    marginTop: 3,
    fontSize: 11.5,
    color: "#B15F3B",
    fontWeight: "600",
  },

  countBadge: {
    backgroundColor: "#F3D9EC",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 48,
    alignItems: "center",
  },

  countBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: PRIMARY,
  },

  usageProgressBackground: {
    marginTop: 13,
    height: 7,
    borderRadius: 10,
    backgroundColor: "#F0E6ED",
    overflow: "hidden",
  },

  usageProgressFill: {
    height: "100%",
    borderRadius: 10,
    backgroundColor: PRIMARY,
  },

  remainingText: {
    marginTop: 7,
    fontSize: 10.5,
    color: TEXT_MUTED,
    fontWeight: "600",
  },

  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY_SOFT,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 5,
  },

  retryButtonText: {
    color: PRIMARY,
    fontWeight: "800",
    fontSize: 11.5,
  },

  /* Limit card */

  limitCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#FFF7F0",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0D5BC",
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  limitCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8E4D1",
    alignItems: "center",
    justifyContent: "center",
  },

  limitCardContent: {
    flex: 1,
    marginLeft: 11,
  },

  limitCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8A4B16",
  },

  limitCardText: {
    marginTop: 5,
    fontSize: 11.5,
    lineHeight: 17,
    color: "#765F4A",
  },

  upgradeButton: {
    marginTop: 11,
    alignSelf: "flex-start",
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },

  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },

  /* Upload box */

  uploadCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#D9A5CF",
    borderStyle: "dashed",
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },

  uploadCardDisabled: {
    opacity: 0.55,
  },

  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F8E1F1",
    alignItems: "center",
    justifyContent: "center",
  },

  uploadTextWrap: {
    flex: 1,
    minWidth: 140,
  },

  uploadTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  uploadText: {
    marginTop: 3,
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
  },

  chooseFileButton: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
  },

  chooseFileButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* Staged */

  stagedWrapper: {
    marginHorizontal: 16,
    marginBottom: 18,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  existingTitle: {
    marginHorizontal: 16,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: TEXT_DARK,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: "600",
  },

  stagedRow: {
    paddingRight: 8,
  },

  stagedItem: {
    marginRight: 10,
    position: "relative",
  },

  stagedPhoto: {
    width: 100,
    height: 100,
    borderRadius: 16,
    backgroundColor: "#F4EAF1",
  },

  stagedRemoveButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
  },

  newBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  /* Empty */

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 40,
  },

  emptyIconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#F3D9EC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: TEXT_DARK,
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 13.5,
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 19,
  },

  /* Grid */

  gridRow: {
    paddingHorizontal: 10,
  },

  imageContainer: {
    flex: 1,
    maxWidth: "50%",
    padding: 8,
    position: "relative",
  },

  imageLoaderWrapper: {
    width: "100%",
    height: 150,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#F4EAF1",
  },

  imageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4EAF1",
    zIndex: 1,
  },

  image: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    backgroundColor: "#F4EAF1",
  },

  photoDeleteButton: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
    elevation: 5,
  },

  selectionOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "rgba(0,0,0,0.08)",
  },

  selectionOverlaySelected: {
    borderColor: PRIMARY,
    backgroundColor: "rgba(120,12,96,0.18)",
  },

  selectionCheck: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  selectionCheckSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },

  /* Footer */

  footer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },

  buttonBack: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#FFFFFF",
  },

  backText: {
    color: PRIMARY,
    fontWeight: "700",
    fontSize: 15,
  },

  saveButton: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  disabledButton: {
    opacity: 0.6,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },

  /* Viewer */

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(15, 5, 12, 0.96)",
    justifyContent: "center",
  },

  modalHeader: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },

  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseButtonPlaceholder: {
    width: 38,
    height: 38,
  },

  modalCounter: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  modalNavRow: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    marginTop: -22,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },

  modalNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  modalHint: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },

  zoomableContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },

  zoomableImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
  },
});

export default ManagePortfolioScreen;