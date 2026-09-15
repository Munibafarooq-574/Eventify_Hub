// fyp-mobile/components/vendorprofileimages/VendorProfileImages.tsx

import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ FIX: use expo-image instead of react-native's Image.
// expo-image decodes/downsamples on the native side according to the
// target render size, instead of loading the full original resolution
// into the shared Fresco bitmap pool. This is what was causing:
// "Pool hard cap violation? Hard cap = ... Used size = ... Free size = 0"
import { Image as ExpoImage } from "expo-image";

import * as ImagePicker from "expo-image-picker";

import { uploadMultipleImages } from "@/services/uploadMultipleImages";
import { getSubscriptionAccessState } from "@/services/getSubscriptionAccessState";
import type { SubscriptionAccessState } from "@/types/subscription.types";

const {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
} = Dimensions.get("window");

const PRIMARY = "#780C60";
const API_BASE_URL = "https://eventify-hub.onrender.com";

// Animated wrapper so we can keep pinch/pan zoom animations working with expo-image
const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

/* =========================================================
   Helper: skip/replace unsupported formats (e.g. HEIC)
========================================================= */
const isLikelyUnsupportedFormat = (uri: string) =>
  /\.heic$/i.test(uri) || /\.heif$/i.test(uri);

/* =========================================================
   Zoomable Image
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
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 6,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 6,
      }),
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
          translateX.setValue(
            lastTranslateX.current + gestureState.dx,
          );
          translateY.setValue(
            lastTranslateY.current + gestureState.dy,
          );
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
    <View
      style={styles.zoomableContainer}
      {...panResponder.panHandlers}
    >
      <AnimatedExpoImage
        source={{ uri: encodeURI(uri) }}
        style={[
          styles.zoomableImage,
          {
            transform: [
              { translateX },
              { translateY },
              { scale },
            ],
          },
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
   Main Screen
========================================================= */

const PhotosScreen: React.FC = () => {
  const { vendorId } = useLocalSearchParams<{
    vendorId?: string;
  }>();

  const [images, setImages] = useState<string[]>([]);

  const [loadedImages, setLoadedImages] =
    useState<Set<string>>(
      () => new Set(),
    );
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [uploading, setUploading] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // Multi-select delete state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(
    () => new Set(),
  );
  const [deletingSelected, setDeletingSelected] = useState(false);

  const [subscriptionAccess, setSubscriptionAccess] =
    useState<SubscriptionAccessState | null>(null);
  const [loadingSubscription, setLoadingSubscription] =
    useState(true);
  const [subscriptionLoadError, setSubscriptionLoadError] =
    useState(false);

  /* =====================================================
     Portfolio Limits
  ===================================================== */

  const maxPortfolioImages =
    subscriptionAccess?.limits?.maxPortfolioImages ?? 0;

  const remainingPortfolioSlots = Math.max(
    0,
    maxPortfolioImages - images.length,
  );

  const portfolioLimitReached =
    !loadingSubscription &&
    !subscriptionLoadError &&
    subscriptionAccess !== null &&
    remainingPortfolioSlots <= 0;

  /* =====================================================
     Fetch Vendor Images
  ===================================================== */

  const fetchImages = useCallback(async () => {
    if (!vendorId) {
      setImages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await axios.get(
        `${API_BASE_URL}/vendor?userId=${String(vendorId)}`,
      );

      const receivedImages = Array.isArray(response.data?.images)
        ? response.data.images
        : [];

      const normalizedImages = receivedImages
        .map((image: any) => {
          if (typeof image === "string") {
            return image.trim();
          }

          if (image?.url) {
            return String(image.url).trim();
          }

          if (image?.imageUrl) {
            return String(image.imageUrl).trim();
          }

          if (image?.Location) {
            return String(image.Location).trim();
          }

          if (image?.location) {
            return String(image.location).trim();
          }

          return "";
        })
        .filter(
          (url: string) =>
            (url.startsWith("http://") ||
              url.startsWith("https://")) &&
            // ✅ FIX: skip HEIC/HEIF — not reliably decodable on Android RN.
            // Convert these to JPEG server-side on upload instead of
            // trying to render them here.
            !isLikelyUnsupportedFormat(url),
        );

      setImages(normalizedImages);
    } catch (error) {
      console.error("Error fetching images:", error);
      Alert.alert("Error", "Could not load vendor photos.");
    } finally {
      setLoading(false);
    }
  }, [vendorId]);

  /* =====================================================
     Fetch Subscription Access
  ===================================================== */

  const fetchSubscriptionAccess = useCallback(async () => {
    if (!vendorId) {
      setSubscriptionAccess(null);
      setSubscriptionLoadError(true);
      setLoadingSubscription(false);
      return;
    }

    try {
      setLoadingSubscription(true);
      setSubscriptionLoadError(false);

      const access = await getSubscriptionAccessState(
        String(vendorId),
      );

      setSubscriptionAccess(access);
    } catch (error) {
      console.error(
        "Error fetching subscription access:",
        error,
      );
      setSubscriptionAccess(null);
      setSubscriptionLoadError(true);
    } finally {
      setLoadingSubscription(false);
    }
  }, [vendorId]);

  useEffect(() => {
    if (!vendorId) {
      setLoading(false);
      setLoadingSubscription(false);
      return;
    }

    fetchImages();
    fetchSubscriptionAccess();
  }, [vendorId, fetchImages, fetchSubscriptionAccess]);

  const retrySubscription = async () => {
    await fetchSubscriptionAccess();
  };

  /* =====================================================
     Viewer
  ===================================================== */

  const openViewer = (index: number) => {
    setSelectedIndex(index);
    setModalVisible(true);
  };

  const showPrev = () => {
    setSelectedIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1,
    );
  };

  const showNext = () => {
    setSelectedIndex((prev) =>
      prev === images.length - 1 ? 0 : prev + 1,
    );
  };

  /* =====================================================
     Add Portfolio Photos - multi image in one picker
  ===================================================== */

  const addVendorPhotos = async () => {
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
          "Please allow gallery access to add photos.",
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
          `You can add only ${remainingPortfolioSlots} more image${
            remainingPortfolioSlots === 1 ? "" : "s"
          } with your current subscription.`,
        );
        return;
      }

      const assets = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name:
          asset.fileName ||
          `vendor-image-${Date.now()}-${index}.jpg`,
        type: asset.mimeType || "image/jpeg",
      }));

      setUploading(true);

      await uploadMultipleImages(String(vendorId), assets);

      await fetchImages();

      Alert.alert(
        "Success",
        `${assets.length} photo${assets.length === 1 ? "" : "s"} added successfully.`,
      );
    } catch (error: any) {
      console.error(
        "Error adding vendor photos:",
        error?.response?.data || error,
      );

      const serverMessage =
        typeof error?.response?.data?.message === "string"
          ? error.response.data.message
          : null;

      Alert.alert(
        "Error",
        serverMessage || "Failed to add photos.",
      );
    } finally {
      setUploading(false);
    }
  };

  /* =====================================================
     Single Delete
  ===================================================== */

  const deleteVendorPhoto = (index: number) => {
    const imageUrl = images[index];

    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this image?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
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
                data: {
                  userId: String(vendorId),
                  imageUrl,
                },
              });

              await fetchImages();

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
     Multi Select + Batch Delete
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
        {
          text: "Cancel",
          style: "cancel",
        },
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
                    data: {
                      userId: String(vendorId),
                      imageUrl,
                    },
                  }),
                ),
              );

              const deletedCount = results.filter(
                (result) => result.status === "fulfilled",
              ).length;

              const failedCount = count - deletedCount;

              await fetchImages();
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
              await fetchImages();
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
        <Text style={styles.loadingText}>Loading photos...</Text>
      </View>
    );
  }

  /* =====================================================
     Screen
  ===================================================== */

  return (
    <View style={styles.container}>
      <FlatList
        data={images}
        keyExtractor={(item, index) => `${item}-${index}`}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.screenScrollContent}
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
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={PRIMARY}
                />
              </TouchableOpacity>

              <Text style={styles.title}>Portfolio</Text>

              <View style={styles.headerRight}>
                {images.length > 0 && !selectionMode && (
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

                {!selectionMode && (
                  <TouchableOpacity
                    onPress={addVendorPhotos}
                    disabled={
                      uploading ||
                      loadingSubscription ||
                      portfolioLimitReached
                    }
                    style={[
                      styles.addPhotoButton,
                      (uploading ||
                        loadingSubscription ||
                        portfolioLimitReached) &&
                        styles.addPhotoButtonDisabled,
                    ]}
                    activeOpacity={0.8}
                  >
                    {uploading || loadingSubscription ? (
                      <ActivityIndicator
                        size="small"
                        color={PRIMARY}
                      />
                    ) : (
                      <Ionicons
                        name="add"
                        size={18}
                        color={
                          portfolioLimitReached
                            ? "#A993A4"
                            : PRIMARY
                        }
                      />
                    )}

                    <Text
                      style={[
                        styles.addPhotoText,
                        portfolioLimitReached &&
                          styles.addPhotoTextDisabled,
                      ]}
                    >
                      {uploading
                        ? "Adding..."
                        : portfolioLimitReached
                          ? "Limit"
                          : "Add"}
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
            {selectionMode && (
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
                  disabled={
                    selectedImages.size === 0 || deletingSelected
                  }
                  activeOpacity={0.85}
                >
                  {deletingSelected ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
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

            {/* Subscription / Usage Status */}
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
                  <Text style={styles.usageTitle}>
                    Portfolio Images
                  </Text>

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
                      {images.length} of {maxPortfolioImages} images used
                    </Text>
                  )}
                </View>

                {!loadingSubscription &&
                  !subscriptionLoadError && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {images.length}/{maxPortfolioImages}
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
                              (images.length / maxPortfolioImages) * 100,
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
                  <Ionicons
                    name="refresh"
                    size={15}
                    color={PRIMARY}
                  />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Limit Reached / Expired */}
            {!loadingSubscription &&
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
                        if (!vendorId) {
                          Alert.alert("Error", "Vendor ID is missing.");
                          return;
                        }

                        router.push({
                          pathname: "/subscriptionscreen",
                          params: {
                            vendorId: String(vendorId),
                          },
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
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons
                name="image-outline"
                size={30}
                color={PRIMARY}
              />
            </View>

            <Text style={styles.emptyTitle}>No photos yet</Text>

            <Text style={styles.emptyText}>
              Add portfolio photos to showcase your work to clients.
            </Text>

            {!portfolioLimitReached &&
              !loadingSubscription &&
              !subscriptionLoadError && (
                <TouchableOpacity
                  style={styles.emptyAddButton}
                  onPress={addVendorPhotos}
                  disabled={uploading}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.emptyAddButtonText}>
                    Add Portfolio Photos
                  </Text>
                </TouchableOpacity>
              )}
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
                onLongPress={() => toggleImageSelection(item)}
              >
                <View style={styles.imageLoaderWrapper}>
                  {!loadedImages.has(item) && (
                    <View style={styles.imageLoadingOverlay}>
                      <ActivityIndicator
                        size="small"
                        color={PRIMARY}
                      />
                    </View>
                  )}

                  {/*
                    ✅ FIX: expo-image for grid thumbnails.
                    - contentFit="cover" replaces resizeMode="cover"
                    - cachePolicy="memory-disk" avoids re-decoding on every
                      re-render/scroll
                    - recyclingKey ensures FlatList item recycling doesn't
                      show a stale image while the new one loads
                    - priority="low" so off-screen thumbnails don't compete
                      with the currently visible ones for decode bandwidth
                    This is what actually fixes the "Pool hard cap
                    violation" — the native pool is no longer asked to
                    decode 50+ multi-MB originals at once.
                  */}
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
                      console.error(
                        "[PORTFOLIO IMAGE ERROR]",
                        item,
                        event,
                      );

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

              {!selectionMode && (
                <TouchableOpacity
                  style={styles.photoDeleteButton}
                  onPress={() => deleteVendorPhoto(index)}
                  disabled={deletingIndex === index}
                  activeOpacity={0.8}
                >
                  {deletingIndex === index ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
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

      {/* Full Screen Viewer */}
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
              <Ionicons
                name="close"
                size={24}
                color="#FFFFFF"
              />
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
            <View
              style={styles.modalNavRow}
              pointerEvents="box-none"
            >
              <TouchableOpacity
                onPress={showPrev}
                style={styles.modalNavButton}
                activeOpacity={0.75}
              >
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color="#FFFFFF"
                />
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

          <Text style={styles.modalHint}>
            Pinch or double-tap to zoom
          </Text>
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
    backgroundColor: "#FDF5FB",
  },

  screenScroll: {
    flex: 1,
  },

  screenScrollContent: {
    paddingTop: 70,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FDF5FB",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: "#8A7A85",
    fontWeight: "600",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  headerRight: {
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 19,
    fontWeight: "800",
    color: "#3D1633",
  },

  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3D9EC",
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 3,
  },

  addPhotoButtonDisabled: {
    opacity: 0.5,
  },

  addPhotoText: {
    fontSize: 11,
    fontWeight: "800",
    color: PRIMARY,
  },

  addPhotoTextDisabled: {
    color: "#A993A4",
  },

  selectHeaderButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EBCFE3",
    borderRadius: 18,
    paddingHorizontal: 9,
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

  selectionToolbar: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#F0DCEB",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectionCountText: {
    color: "#3D1633",
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

  usageCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: "#F0DCEB",
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
    color: "#3D1633",
  },

  usageSubtitle: {
    marginTop: 3,
    fontSize: 11.5,
    color: "#8A7A85",
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
    color: "#8A7A85",
    fontWeight: "600",
  },

  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E4EF",
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

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
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
    color: "#3D1633",
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 13.5,
    color: "#8A7A85",
    textAlign: "center",
    lineHeight: 19,
  },

  emptyAddButton: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PRIMARY,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 6,
  },

  emptyAddButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  grid: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },

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

export default PhotosScreen;