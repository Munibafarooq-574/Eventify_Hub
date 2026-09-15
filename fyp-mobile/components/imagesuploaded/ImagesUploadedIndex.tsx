// fyp-mobile/components/imagesuploaded/ImagesUploadedIndex.tsx

import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useNavigation } from "expo-router/react-navigation";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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

const API_BASE_URL =
  "https://eventify-hub.onrender.com";

const PRIMARY = "#780C60";

const ImageUploadScreen: React.FC = () => {
  const navigation = useNavigation();

  const [selectedImage, setSelectedImage] =
    useState<string | null>(null);

  const [images, setImages] =
    useState<UploadMediaAsset[]>([]);

  const [uploading, setUploading] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [vendorId, setVendorId] =
    useState<string | null>(null);

  const [
    existingPortfolioCount,
    setExistingPortfolioCount,
  ] = useState(0);

  const [
    subscriptionAccess,
    setSubscriptionAccess,
  ] =
    useState<SubscriptionAccessState | null>(
      null,
    );

  const [
    loadingSubscription,
    setLoadingSubscription,
  ] = useState(true);

  const [
    subscriptionLoadError,
    setSubscriptionLoadError,
  ] = useState(false);

  /* =====================================================
     Subscription Limits
  ===================================================== */

  const maxPortfolioImages =
    subscriptionAccess?.limits
      ?.maxPortfolioImages ?? 0;

  const totalPortfolioUsage =
    existingPortfolioCount +
    images.length;

  const remainingPortfolioSlots =
    Math.max(
      0,
      maxPortfolioImages -
        totalPortfolioUsage,
    );

  const portfolioLimitReached =
    !loadingSubscription &&
    !subscriptionLoadError &&
    subscriptionAccess !== null &&
    remainingPortfolioSlots <= 0;

  /* =====================================================
     Initial Load
  ===================================================== */

  useEffect(() => {
    const loadScreenData = async () => {
      try {
        setLoading(true);
        setLoadingSubscription(true);
        setSubscriptionLoadError(false);

        const userRaw =
          await getSecureData("user");

        if (!userRaw) {
          setVendorId(null);
          setSubscriptionAccess(null);
          setSubscriptionLoadError(true);

          Alert.alert(
            "Error",
            "Vendor data not found. Please log in again.",
          );

          return;
        }

        const userData =
          JSON.parse(userRaw);

        const id: string | undefined =
          userData?._id;

        if (!id) {
          setVendorId(null);
          setSubscriptionAccess(null);
          setSubscriptionLoadError(true);

          Alert.alert(
            "Error",
            "Vendor ID not found. Please log in again.",
          );

          return;
        }

        setVendorId(id);

        const [access, vendorResponse] =
          await Promise.all([
            getSubscriptionAccessState(id),

            axios.get(
              `${API_BASE_URL}/vendor?userId=${id}`,
            ),
          ]);

        setSubscriptionAccess(access);

        const existingImages =
          Array.isArray(
            vendorResponse.data?.images,
          )
            ? vendorResponse.data.images
            : [];

        setExistingPortfolioCount(
          existingImages.length,
        );
      } catch (error) {
        console.error(
          "Error loading image upload screen:",
          error,
        );

        setSubscriptionAccess(null);
        setSubscriptionLoadError(true);

        Alert.alert(
          "Error",
          "Could not load your portfolio limits. Please check your connection and try again.",
        );
      } finally {
        setLoading(false);
        setLoadingSubscription(false);
      }
    };

    loadScreenData();
  }, []);

  /* =====================================================
     Retry Subscription + Portfolio Data
  ===================================================== */

  const retrySubscription =
    async () => {
      if (!vendorId) {
        Alert.alert(
          "Error",
          "Vendor ID not found.",
        );

        return;
      }

      try {
        setLoadingSubscription(true);
        setSubscriptionLoadError(false);

        const [access, vendorResponse] =
          await Promise.all([
            getSubscriptionAccessState(
              vendorId,
            ),

            axios.get(
              `${API_BASE_URL}/vendor?userId=${vendorId}`,
            ),
          ]);

        setSubscriptionAccess(access);

        const existingImages =
          Array.isArray(
            vendorResponse.data?.images,
          )
            ? vendorResponse.data.images
            : [];

        setExistingPortfolioCount(
          existingImages.length,
        );
      } catch (error) {
        console.error(
          "Retry subscription error:",
          error,
        );

        setSubscriptionAccess(null);
        setSubscriptionLoadError(true);
      } finally {
        setLoadingSubscription(false);
      }
    };

  /* =====================================================
     Pick Images
  ===================================================== */

  const handleFileUpload = async () => {
    try {
      if (!vendorId) {
        Alert.alert(
          "Error",
          "Vendor ID is missing.",
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

      if (
        subscriptionLoadError ||
        !subscriptionAccess
      ) {
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

      if (
        remainingPortfolioSlots <= 0
      ) {
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

      const result =
  await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],

    // Allow selecting many portfolio images in one gallery session
    allowsMultipleSelection: true,

    // Subscription-aware batch limit
    selectionLimit: remainingPortfolioSlots,

    // Better multi-selection behavior on Android/Samsung
    legacy: Platform.OS === "android",

    allowsEditing: false,

    quality: 0.8,
  });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      if (
        result.assets.length >
        remainingPortfolioSlots
      ) {
        Alert.alert(
          "Portfolio Limit Reached",
          `You can select only ${remainingPortfolioSlots} more image${
            remainingPortfolioSlots ===
            1
              ? ""
              : "s"
          }.`,
        );

        return;
      }

      const selectedMedia: UploadMediaAsset[] =
        result.assets.map(
          (asset, index) => ({
            uri: asset.uri,

            name:
              asset.fileName ||
              `portfolio-${Date.now()}-${index}.jpg`,

            type:
              asset.mimeType ||
              "image/jpeg",
          }),
        );

      setImages((prevImages) => [
        ...prevImages,
        ...selectedMedia,
      ]);
    } catch (error) {
      console.error(
        "Error picking images:",
        error,
      );

      Alert.alert(
        "Error",
        "An error occurred while selecting photos.",
      );
    }
  };

  /* =====================================================
     Delete Selected Image
  ===================================================== */

  const handleDeleteImage = (
    index: number,
  ) => {
    setImages((prevImages) =>
      prevImages.filter(
        (_, i) => i !== index,
      ),
    );
  };

  /* =====================================================
     Save Portfolio Images
  ===================================================== */

  const handleSaveAndContinue =
    async () => {
      if (!vendorId) {
        Alert.alert(
          "Error",
          "Vendor ID is missing.",
        );

        return;
      }

      if (images.length === 0) {
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

      if (
        subscriptionLoadError ||
        !subscriptionAccess
      ) {
        Alert.alert(
          "Subscription Unavailable",
          "We could not verify your subscription limits. Please check your connection and try again.",
        );

        return;
      }

      if (
        existingPortfolioCount +
          images.length >
        maxPortfolioImages
      ) {
        Alert.alert(
          "Portfolio Limit Reached",
          `Your current subscription allows up to ${maxPortfolioImages} portfolio images.`,
        );

        return;
      }

      try {
        setUploading(true);

        await uploadMultipleImages(
          vendorId,
          images,
        );

        Alert.alert(
          "Success",
          "Portfolio images uploaded successfully.",
          [
            {
              text: "OK",
              onPress: () =>
                router.replace(
                  "/vendordashboard",
                ),
            },
          ],
        );
      } catch (error: any) {
        console.error(
          "Failed to upload images:",
          error?.response?.status,
          error?.response?.data ||
            error?.message ||
            error,
        );

        Alert.alert(
          "Upload Error",
          error?.response?.data
            ?.message
            ? String(
                error.response.data
                  .message,
              )
            : "Failed to upload images. Please check your internet connection and try again.",
        );
      } finally {
        setUploading(false);
      }
    };

  /* =====================================================
     Loading
  ===================================================== */

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
          style={styles.loadingText}
        >
          Loading portfolio...
        </Text>
      </View>
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.scrollContent
        }
      >
        {/* Header */}

        <View
          style={
            styles.headerContainer
          }
        >
          <Text
            style={styles.header}
          >
            Upload Portfolio
          </Text>

          <Text
            style={styles.subHeader}
          >
            Showcase your services
            with high-quality photos
            and attract more clients.
          </Text>

          {/* Subscription usage */}

          <View
            style={
              styles.limitBadge
            }
          >
            {loadingSubscription ? (
              <Text
                style={
                  styles.coverText
                }
              >
                Loading your
                portfolio limit...
              </Text>
            ) : subscriptionLoadError ? (
              <Text
                style={
                  styles.errorText
                }
              >
                Subscription limit
                unavailable
              </Text>
            ) : (
              <Text
                style={
                  styles.coverText
                }
              >
                {totalPortfolioUsage}/
                {maxPortfolioImages}{" "}
                portfolio images used
              </Text>
            )}
          </View>

          {!loadingSubscription &&
            !subscriptionLoadError &&
            maxPortfolioImages >
              0 && (
              <Text
                style={
                  styles.remainingText
                }
              >
                {remainingPortfolioSlots >
                0
                  ? `${remainingPortfolioSlots} image${
                      remainingPortfolioSlots ===
                      1
                        ? ""
                        : "s"
                    } remaining`
                  : "Portfolio image limit reached"}
              </Text>
            )}

          {subscriptionLoadError && (
            <TouchableOpacity
              style={
                styles.retryButton
              }
              onPress={
                retrySubscription
              }
              activeOpacity={0.8}
            >
              <Text
                style={
                  styles.retryButtonText
                }
              >
                Retry
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Limit warning */}

        {!loadingSubscription &&
          !subscriptionLoadError &&
          portfolioLimitReached && (
            <View
              style={
                styles.limitWarningCard
              }
            >
              <Text
                style={
                  styles.limitWarningTitle
                }
              >
                {maxPortfolioImages >
                0
                  ? "Portfolio Limit Reached"
                  : "Portfolio Upload Unavailable"}
              </Text>

              <Text
                style={
                  styles.limitWarningText
                }
              >
                {maxPortfolioImages >
                0
                  ? `Your current subscription allows up to ${maxPortfolioImages} portfolio images. Existing images will remain available.`
                  : "Your current subscription does not allow new portfolio uploads. Existing images will remain available."}
              </Text>

              <TouchableOpacity
                style={
                  styles.upgradeButton
                }
                onPress={() => {
                  if (!vendorId) {
                    return;
                  }

                  router.push({
                    pathname:
                      "/subscriptionscreen",

                    params: {
                      vendorId,
                    },
                  });
                }}
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.upgradeButtonText
                  }
                >
                  View Subscription
                  Plans
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Upload Box */}

        <TouchableOpacity
          style={[
            styles.uploadCard,

            (uploading ||
              loadingSubscription ||
              portfolioLimitReached ||
              subscriptionLoadError) &&
              styles.uploadCardDisabled,
          ]}
          onPress={handleFileUpload}
          disabled={
            uploading ||
            loadingSubscription ||
            portfolioLimitReached ||
            subscriptionLoadError
          }
          activeOpacity={0.8}
        >
          <View
            style={
              styles.iconCircle
            }
          >
            <Text
              style={styles.icon}
            >
              📷
            </Text>
          </View>

          <Text
            style={
              styles.uploadTitle
            }
          >
            Add Portfolio Images
          </Text>

          <Text
            style={
              styles.uploadText
            }
          >
            {loadingSubscription
              ? "Loading your subscription limits..."
              : subscriptionLoadError
              ? "Subscription limits could not be verified."
              : portfolioLimitReached
              ? "Your current portfolio limit has been reached."
              : `You can add ${remainingPortfolioSlots} more image${
                  remainingPortfolioSlots ===
                  1
                    ? ""
                    : "s"
                }.`}
            {"\n"}
            High-quality photos help
            clients understand your
            work.
          </Text>

          {!portfolioLimitReached &&
            !subscriptionLoadError &&
            !loadingSubscription && (
              <TouchableOpacity
                style={
                  styles.chooseFileButton
                }
                onPress={
                  handleFileUpload
                }
                disabled={
                  uploading
                }
              >
                <Text
                  style={
                    styles.chooseFileButtonText
                  }
                >
                  Choose Photos
                </Text>
              </TouchableOpacity>
            )}
        </TouchableOpacity>

        {/* Selected Images */}

        {images.length > 0 && (
          <View
            style={
              styles.photosWrapper
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Selected Photos (
              {images.length})
            </Text>

            {!subscriptionLoadError && (
              <Text
                style={
                  styles.sectionSubtitle
                }
              >
                Total after upload:{" "}
                {totalPortfolioUsage}/
                {maxPortfolioImages}
              </Text>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
            >
              {images.map(
                (
                  media,
                  index,
                ) => (
                  <View
                    key={`${media.uri}-${index}`}
                    style={
                      styles.imageContainer
                    }
                  >
                    <TouchableOpacity
                      onPress={() =>
                        setSelectedImage(
                          media.uri,
                        )
                      }
                    >
                      <Image
                        source={{
                          uri: media.uri,
                        }}
                        style={
                          styles.photo
                        }
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={
                        styles.deleteButton
                      }
                      onPress={() =>
                        handleDeleteImage(
                          index,
                        )
                      }
                      disabled={
                        uploading
                      }
                    >
                      <Text
                        style={
                          styles.deleteButtonText
                        }
                      >
                        ×
                      </Text>
                    </TouchableOpacity>

                    {index === 0 &&
                      existingPortfolioCount ===
                        0 && (
                        <View
                          style={
                            styles.coverBadge
                          }
                        >
                          <Text
                            style={
                              styles.coverBadgeText
                            }
                          >
                            Cover
                          </Text>
                        </View>
                      )}
                  </View>
                ),
              )}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Footer */}

      <View
        style={styles.footer}
      >
        <TouchableOpacity
          onPress={() =>
            navigation.goBack()
          }
          style={
            styles.buttonBack
          }
          disabled={uploading}
        >
          <Text
            style={styles.backText}
          >
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,

            (uploading ||
              images.length === 0 ||
              loadingSubscription ||
              subscriptionLoadError ||
              existingPortfolioCount +
                images.length >
                maxPortfolioImages) &&
              styles.disabledButton,
          ]}
          disabled={
            uploading ||
            images.length === 0 ||
            loadingSubscription ||
            subscriptionLoadError ||
            existingPortfolioCount +
              images.length >
              maxPortfolioImages
          }
          onPress={
            handleSaveAndContinue
          }
        >
          {uploading ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={
                styles.saveButtonText
              }
            >
              Save & Continue
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Image Modal */}

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setSelectedImage(null)
        }
      >
        <View
          style={
            styles.modalBackground
          }
        >
          <View
            style={
              styles.modalContent
            }
          >
            {selectedImage && (
              <Image
                source={{
                  uri: selectedImage,
                }}
                style={
                  styles.enlargedImage
                }
                resizeMode="contain"
              />
            )}

            <TouchableOpacity
              onPress={() =>
                setSelectedImage(
                  null,
                )
              }
              style={
                styles.closeButton
              }
            >
              <Text
                style={
                  styles.closeButtonText
                }
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      "#FDF5FA",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 65,
    paddingBottom: 130,
  },

  loadingContainer: {
    flex: 1,
    justifyContent:
      "center",
    alignItems: "center",
    backgroundColor:
      "#FDF5FA",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#777",
  },

  headerContainer: {
    alignItems: "center",
    marginBottom: 25,
  },

  header: {
    fontSize: 30,
    fontWeight: "800",
    color: PRIMARY,
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

  limitBadge: {
    marginTop: 15,
    backgroundColor:
      "#F9E7F3",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },

  coverText: {
    fontSize: 13,
    color: PRIMARY,
    fontWeight: "700",
  },

  errorText: {
    fontSize: 13,
    color: "#B15F3B",
    fontWeight: "700",
  },

  remainingText: {
    fontSize: 11.5,
    color: "#86737F",
    fontWeight: "600",
    marginTop: 7,
  },

  retryButton: {
    marginTop: 12,
    backgroundColor:
      "#F3E4EF",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 18,
  },

  retryButtonText: {
    color: PRIMARY,
    fontWeight: "800",
    fontSize: 12,
  },

  limitWarningCard: {
    backgroundColor:
      "#FFF7F0",
    borderWidth: 1,
    borderColor: "#F1D7BE",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },

  limitWarningTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8A4B16",
  },

  limitWarningText: {
    fontSize: 12,
    color: "#765F4A",
    lineHeight: 18,
    marginTop: 6,
  },

  upgradeButton: {
    marginTop: 12,
    backgroundColor:
      PRIMARY,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },

  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "800",
  },

  uploadCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingVertical: 30,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D9A5CF",
    borderStyle: "dashed",
    elevation: 4,
  },

  uploadCardDisabled: {
    opacity: 0.55,
  },

  iconCircle: {
    height: 75,
    width: 75,
    borderRadius: 40,
    backgroundColor:
      "#F8E1F1",
    justifyContent:
      "center",
    alignItems: "center",
    marginBottom: 15,
  },

  icon: {
    fontSize: 38,
  },

  uploadTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2B1025",
  },

  uploadText: {
    marginTop: 8,
    textAlign: "center",
    color: "#777",
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  chooseFileButton: {
    marginTop: 20,
    backgroundColor:
      PRIMARY,
    paddingHorizontal: 35,
    paddingVertical: 13,
    borderRadius: 30,
  },

  chooseFileButtonText: {
    color: "#fff",
    fontWeight: "700",
  },

  photosWrapper: {
    marginTop: 25,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
    color: "#2B1025",
  },

  sectionSubtitle: {
    fontSize: 11.5,
    color: "#8A7A85",
    marginBottom: 12,
  },

  imageContainer: {
    marginRight: 12,
    position: "relative",
  },

  photo: {
    width: 105,
    height: 105,
    borderRadius: 18,
  },

  deleteButton: {
    position: "absolute",
    right: 5,
    top: 5,
    height: 28,
    width: 28,
    borderRadius: 15,
    backgroundColor:
      PRIMARY,
    justifyContent:
      "center",
    alignItems: "center",
  },

  deleteButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },

  coverBadge: {
    position: "absolute",
    bottom: 5,
    left: 5,
    backgroundColor:
      PRIMARY,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  coverBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  footer: {
    flexDirection: "row",
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
  },

  buttonBack: {
    flex: 1,
    height: 55,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: PRIMARY,
    justifyContent:
      "center",
    alignItems: "center",
    marginRight: 10,
    backgroundColor: "#fff",
  },

  backText: {
    color: PRIMARY,
    fontWeight: "700",
    fontSize: 16,
  },

  saveButton: {
    flex: 1,
    height: 55,
    borderRadius: 15,
    backgroundColor:
      PRIMARY,
    justifyContent:
      "center",
    alignItems: "center",
    marginLeft: 10,
  },

  disabledButton: {
    opacity: 0.5,
  },

  saveButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  modalBackground: {
    flex: 1,
    backgroundColor:
      "rgba(0,0,0,0.75)",
    justifyContent:
      "center",
    alignItems: "center",
  },

  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
  },

  enlargedImage: {
    width: "100%",
    height: 350,
  },

  closeButton: {
    backgroundColor:
      PRIMARY,
    padding: 12,
    borderRadius: 15,
    alignItems: "center",
  },

  closeButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default ImageUploadScreen;