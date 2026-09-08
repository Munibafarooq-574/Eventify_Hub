// fyp-mobile/components/vendorpackages/VendorPackagesIndex.tsx
import deletePackage from "@/services/deletePackage";

import {
  getSecureData,
  saveSecureData,
  getUserData,
  saveUserData,
} from "@/store";

import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "expo-router/react-navigation";
import { router } from "expo-router";

import React, { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PackageDuration {
  value: number;
  unit: "HOURS" | "DAYS";
  price: number;
}

interface PackageDetails {
  _id: string;
  packageName: string;
  description?: string;
  price?: number;
  services?: string;

  durations?: PackageDuration[];

  allowCustomDuration?: boolean;
  customDurationUnit?: "HOURS" | "DAYS";
  customDurationRate?: number;

  images?: string[];
}

const PackageScreen = () => {
  const [isModalVisible, setModalVisible] = useState(false);
  const [packageDetails, setPackageDetails] =
    useState<PackageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const route = useRoute();

  const params = route.params as
    | {
        packageId?: string;
      }
    | undefined;

  const packageId = params?.packageId;

  useEffect(() => {
    console.log("packageId", packageId);

    if (packageId) {
      fetchPackageDetails(packageId);
    } else {
      setLoading(false);
    }
  }, [packageId]);

  // ---------------------------------------------------------
  // Read user from SecureStore / AsyncStorage
  // ---------------------------------------------------------

  const readUser = async (): Promise<any | null> => {
    try {
      const userRaw = await getSecureData("user");

      if (userRaw) {
        return JSON.parse(userRaw);
      }
    } catch (err) {
      console.error(
        "Failed to parse user from getSecureData:",
        err
      );
    }

    try {
      const userObj = await getUserData();

      if (userObj) {
        return userObj;
      }
    } catch (err) {
      console.error(
        "Failed to read user from getUserData:",
        err
      );
    }

    return null;
  };

  // ---------------------------------------------------------
  // Write updated user back to storage
  // ---------------------------------------------------------

  const writeUser = async (user: any) => {
    try {
      const userRaw = await getSecureData("user");

      if (userRaw) {
        await saveSecureData(
          "user",
          JSON.stringify(user)
        );
      } else {
        await saveUserData(user);
      }
    } catch (error) {
      console.error("Failed to save updated user:", error);
    }
  };

  // ---------------------------------------------------------
  // Fetch package details from locally stored user
  // ---------------------------------------------------------

  const fetchPackageDetails = async (id: string) => {
    setLoading(true);

    try {
      const user = await readUser();

      if (!user) {
        console.error("User not found in any storage");
        setPackageDetails(null);
        return;
      }

      if (!user.packages || !Array.isArray(user.packages)) {
        console.error("User has no packages array");
        setPackageDetails(null);
        return;
      }

      const packageObj = user.packages.find(
        (x: any) => x._id === id
      );

      if (!packageObj) {
        console.error(
          "Package not found for id:",
          id
        );
      }

      setPackageDetails(packageObj || null);
    } catch (error) {
      console.error(
        "Error fetching package details:",
        error
      );

      setPackageDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log(
      "packageDetails updated:",
      packageDetails
    );
  }, [packageDetails]);

  // ---------------------------------------------------------
  // Delete package
  // ---------------------------------------------------------

  const confirmDelete = async () => {
    if (!packageId) {
      console.error("Package ID is missing");
      setModalVisible(false);
      return;
    }

    setModalVisible(false);
    setDeleting(true);

    console.log("Deleting Package...");

    try {
      await deletePackage(packageId);

      const user = await readUser();

      if (!user || !user.packages) {
        console.error(
          "User or packages not found"
        );

        setDeleting(false);
        return;
      }

      user.packages = user.packages.filter(
        (pkg: any) => pkg._id !== packageId
      );

      await writeUser(user);

      router.replace("/vendordashboard");
    } catch (error) {
      console.error(
        "Error deleting package:",
        error
      );

      setDeleting(false);
    }
  };

  // ---------------------------------------------------------
  // Cancel delete
  // ---------------------------------------------------------

  const cancelDelete = () => {
    if (!deleting) {
      setModalVisible(false);
    }
  };

  // ---------------------------------------------------------
  // Back
  // ---------------------------------------------------------

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/vendordashboard");
    }
  };

  // ---------------------------------------------------------
  // Format duration unit
  // ---------------------------------------------------------

  const formatUnit = (
    unit?: "HOURS" | "DAYS"
  ) => {
    if (unit === "HOURS") {
      return "Hour";
    }

    if (unit === "DAYS") {
      return "Day";
    }

    return "";
  };

  // ---------------------------------------------------------
  // Format duration text
  // ---------------------------------------------------------

  const formatDuration = (
    duration: PackageDuration
  ) => {
    const unit = formatUnit(duration.unit);

    return `${duration.value} ${
      duration.value === 1
        ? unit
        : `${unit}s`
    }`;
  };

  // ---------------------------------------------------------
  // No package ID
  // ---------------------------------------------------------

  if (!packageId) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="cube-outline"
          size={48}
          color="#780C60"
        />

        <Text style={styles.emptyTitle}>
          No Package Selected
        </Text>

        <Text style={styles.emptyText}>
          Please select a package to view its details.
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------
  // Main screen
  // ---------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* ---------------------------------------------------
          Header
      --------------------------------------------------- */}

      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.headerIconButton}
          activeOpacity={0.75}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color="#780C60"
          />
        </TouchableOpacity>

        <Text
          style={styles.headerTitle}
          numberOfLines={1}
        >
          {packageDetails
            ? packageDetails.packageName
            : "Package"}
        </Text>

        <View style={styles.headerSpacer} />
      </View>

      {/* ---------------------------------------------------
          Action Buttons
      --------------------------------------------------- */}

      {!loading && packageDetails && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() =>
              setModalVisible(true)
            }
            activeOpacity={0.85}
            disabled={deleting}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color="#fff"
            />

            <Text style={styles.deleteText}>
              Delete
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() =>
              router.replace({
                pathname: "/editpackage",
                params: {
                  packageId:
                    packageDetails._id,
                },
              })
            }
            activeOpacity={0.85}
            disabled={deleting}
          >
            <Ionicons
              name="pencil-outline"
              size={16}
              color="#780C60"
            />

            <Text style={styles.editText}>
              Edit
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ---------------------------------------------------
          Content
      --------------------------------------------------- */}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color="#780C60"
            />

            <Text style={styles.sectionText}>
              Loading package details...
            </Text>
          </View>
        ) : packageDetails ? (
          <View style={styles.card}>
            {/* ---------------------------------------------
                Package Price Hero
            --------------------------------------------- */}

            <View style={styles.priceHero}>
              <Text style={styles.priceHeroLabel}>
                Base Package Price
              </Text>

              <Text style={styles.priceHeroValue}>
                Rs.{" "}
                {packageDetails.price !==
                undefined
                  ? packageDetails.price.toLocaleString()
                  : "N/A"}
              </Text>
            </View>

            {/* ---------------------------------------------
                Package Images
            --------------------------------------------- */}

            {packageDetails.images &&
              packageDetails.images.length >
                0 && (
                <>
                  <View style={styles.sectionBlock}>
                    <View
                      style={
                        styles.sectionTitleRow
                      }
                    >
                      <View
                        style={
                          styles.infoIconCircle
                        }
                      >
                        <Ionicons
                          name="images-outline"
                          size={17}
                          color="#780C60"
                        />
                      </View>

                      <Text
                        style={
                          styles.sectionTitle
                        }
                      >
                        Package Images
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={
                        false
                      }
                      contentContainerStyle={
                        styles.imageList
                      }
                    >
                      {packageDetails.images.map(
                        (
                          image: string,
                          index: number
                        ) => (
                          <View
                            key={`${image}-${index}`}
                            style={
                              styles.imageWrapper
                            }
                          >
                            <Image
                              source={{
                                uri: image,
                              }}
                              style={
                                styles.packageImage
                              }
                              resizeMode="cover"
                            />
                          </View>
                        )
                      )}
                    </ScrollView>
                  </View>

                  <View
                    style={styles.divider}
                  />
                </>
              )}

            {/* ---------------------------------------------
                Package Name
            --------------------------------------------- */}

            <View style={styles.infoRow}>
              <View
                style={styles.infoIconCircle}
              >
                <Ionicons
                  name="pricetag-outline"
                  size={16}
                  color="#780C60"
                />
              </View>

              <View
                style={styles.infoTextWrapper}
              >
                <Text
                  style={styles.sectionHeader}
                >
                  Package Name
                </Text>

                <Text
                  style={styles.sectionText}
                >
                  {packageDetails.packageName ||
                    "N/A"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ---------------------------------------------
                Description
            --------------------------------------------- */}

            <View style={styles.infoRow}>
              <View
                style={styles.infoIconCircle}
              >
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#780C60"
                />
              </View>

              <View
                style={styles.infoTextWrapper}
              >
                <Text
                  style={styles.sectionHeader}
                >
                  Description
                </Text>

                <Text
                  style={styles.sectionText}
                >
                  {packageDetails.description?.trim()
                    ? packageDetails.description
                    : "No description provided."}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ---------------------------------------------
                Services
            --------------------------------------------- */}

            <View style={styles.infoRow}>
              <View
                style={styles.infoIconCircle}
              >
                <Ionicons
                  name="list-outline"
                  size={16}
                  color="#780C60"
                />
              </View>

              <View
                style={styles.infoTextWrapper}
              >
                <Text
                  style={styles.sectionHeader}
                >
                  Services
                </Text>

                <Text
                  style={styles.sectionText}
                >
                  {packageDetails.services ||
                    "N/A"}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* ---------------------------------------------
                Fixed Duration Options
            --------------------------------------------- */}

            <View style={styles.durationSection}>
              <View
                style={styles.sectionTitleRow}
              >
                <View
                  style={styles.infoIconCircle}
                >
                  <Ionicons
                    name="time-outline"
                    size={17}
                    color="#780C60"
                  />
                </View>

                <Text
                  style={styles.sectionTitle}
                >
                  Fixed Duration Options
                </Text>
              </View>

              {packageDetails.durations &&
              packageDetails.durations.length >
                0 ? (
                <View
                  style={styles.durationList}
                >
                  {packageDetails.durations.map(
                    (
                      duration: PackageDuration,
                      index: number
                    ) => (
                      <View
                        key={`duration-${index}`}
                        style={
                          styles.durationCard
                        }
                      >
                        <View
                          style={
                            styles.durationIcon
                          }
                        >
                          <Ionicons
                            name={
                              duration.unit ===
                              "HOURS"
                                ? "time-outline"
                                : "calendar-outline"
                            }
                            size={18}
                            color="#780C60"
                          />
                        </View>

                        <View
                          style={
                            styles.durationInfo
                          }
                        >
                          <Text
                            style={
                              styles.durationValue
                            }
                          >
                            {formatDuration(
                              duration
                            )}
                          </Text>

                          <Text
                            style={
                              styles.durationLabel
                            }
                          >
                            Fixed duration
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.durationPrice
                          }
                        >
                          Rs.{" "}
                          {Number(
                            duration.price || 0
                          ).toLocaleString()}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              ) : (
                <View
                  style={styles.noDataBox}
                >
                  <Text
                    style={styles.noDataText}
                  >
                    No fixed duration options
                    added.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.divider} />

            {/* ---------------------------------------------
                Custom Duration
            --------------------------------------------- */}

            <View style={styles.durationSection}>
              <View
                style={styles.sectionTitleRow}
              >
                <View
                  style={styles.infoIconCircle}
                >
                  <Ionicons
                    name="options-outline"
                    size={17}
                    color="#780C60"
                  />
                </View>

                <Text
                  style={styles.sectionTitle}
                >
                  Custom Duration
                </Text>
              </View>

              {packageDetails.allowCustomDuration ? (
                <View
                  style={
                    styles.customDurationCard
                  }
                >
                  <View
                    style={
                      styles.customEnabledRow
                    }
                  >
                    <View
                      style={
                        styles.customEnabledIcon
                      }
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#2E9D63"
                      />
                    </View>

                    <View
                      style={
                        styles.customEnabledText
                      }
                    >
                      <Text
                        style={
                          styles.customEnabledTitle
                        }
                      >
                        Custom Duration Allowed
                      </Text>

                      <Text
                        style={
                          styles.customEnabledSubtitle
                        }
                      >
                        Customers can request a
                        custom event duration.
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.customDetailsRow
                    }
                  >
                    <View
                      style={
                        styles.customDetailItem
                      }
                    >
                      <Text
                        style={
                          styles.customDetailLabel
                        }
                      >
                        Unit
                      </Text>

                      <Text
                        style={
                          styles.customDetailValue
                        }
                      >
                        {formatUnit(
                          packageDetails.customDurationUnit
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.customDetailDivider
                      }
                    />

                    <View
                      style={
                        styles.customDetailItem
                      }
                    >
                      <Text
                        style={
                          styles.customDetailLabel
                        }
                      >
                        Rate
                      </Text>

                      <Text
                        style={
                          styles.customRateValue
                        }
                      >
                        Rs.{" "}
                        {Number(
                          packageDetails.customDurationRate ||
                            0
                        ).toLocaleString()}
                        /
                        {packageDetails.customDurationUnit ===
                        "DAYS"
                          ? "day"
                          : "hour"}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View
                  style={
                    styles.customDisabledCard
                  }
                >
                  <Ionicons
                    name="close-circle-outline"
                    size={22}
                    color="#9A8993"
                  />

                  <View
                    style={
                      styles.customDisabledText
                    }
                  >
                    <Text
                      style={
                        styles.customDisabledTitle
                      }
                    >
                      Custom Duration Disabled
                    </Text>

                    <Text
                      style={
                        styles.customDisabledSubtitle
                      }
                    >
                      Only the fixed duration options
                      above are available.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.loadingBox}>
            <Ionicons
              name="cube-outline"
              size={42}
              color="#780C60"
            />

            <Text
              style={[
                styles.sectionText,
                { marginTop: 10 },
              ]}
            >
              Package not found.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ---------------------------------------------------
          Delete Confirmation Modal
      --------------------------------------------------- */}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View
              style={styles.modalIconCircle}
            >
              <Ionicons
                name="trash-outline"
                size={26}
                color="#D9534F"
              />
            </View>

            <Text style={styles.modalTitle}>
              Confirm Delete
            </Text>

            <Text
              style={styles.modalMessage}
            >
              Are you sure you want to delete this
              package? This action cannot be undone.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelDelete}
                activeOpacity={0.8}
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
                style={styles.confirmButton}
                onPress={confirmDelete}
                activeOpacity={0.85}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
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
  );
};

// =========================================================
// Styles
// =========================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF5FB",
    paddingTop: 70,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#780C60",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 3,
  },

  headerSpacer: {
    width: 40,
  },

  headerTitle: {
    color: "#3D1633",
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },

  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginVertical: 16,
    paddingHorizontal: 20,
  },

  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D9534F",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 30,
    marginRight: 10,

    shadowColor: "#D9534F",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 4,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3D9EC",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#E9C1DE",
  },

  deleteText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 6,
  },

  editText: {
    color: "#780C60",
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 6,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1D5E8",

    shadowColor: "#780C60",
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 5,
  },

  priceHero: {
    backgroundColor: "#780C60",
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 18,

    shadowColor: "#780C60",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 6,
  },

  priceHeroLabel: {
    color: "#EAC8DE",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  priceHeroValue: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "800",
  },

  sectionBlock: {
    marginBottom: 2,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#3D1633",
    fontSize: 16,
    fontWeight: "800",
    flex: 1,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },

  infoIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F9E7F3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },

  infoTextWrapper: {
    flex: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "#F3E4EE",
    marginVertical: 14,
  },

  sectionHeader: {
    color: "#8A7A85",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 4,
  },

  sectionText: {
    color: "#2E2130",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "500",
  },

  imageList: {
    paddingVertical: 2,
    paddingRight: 10,
  },

  imageWrapper: {
    width: 150,
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#F7EEF4",
    borderWidth: 1,
    borderColor: "#F1D5E8",
  },

  packageImage: {
    width: "100%",
    height: "100%",
  },

  durationSection: {
    marginTop: 2,
  },

  durationList: {
    gap: 10,
  },

  durationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FCF7FA",
    borderWidth: 1,
    borderColor: "#F0DDE9",
    borderRadius: 16,
    padding: 13,
  },

  durationIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3D9EC",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  durationInfo: {
    flex: 1,
  },

  durationValue: {
    color: "#3D1633",
    fontSize: 15,
    fontWeight: "800",
  },

  durationLabel: {
    color: "#9A8993",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },

  durationPrice: {
    color: "#780C60",
    fontSize: 15,
    fontWeight: "800",
    marginLeft: 8,
  },

  noDataBox: {
    backgroundColor: "#FCF8FA",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1E1EA",
  },

  noDataText: {
    color: "#8A7A85",
    fontSize: 13,
    fontWeight: "500",
  },

  customDurationCard: {
    backgroundColor: "#F8FBF9",
    borderWidth: 1,
    borderColor: "#D9EBDD",
    borderRadius: 17,
    padding: 15,
  },

  customEnabledRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  customEnabledIcon: {
    marginRight: 11,
  },

  customEnabledText: {
    flex: 1,
  },

  customEnabledTitle: {
    color: "#276B47",
    fontSize: 14,
    fontWeight: "800",
  },

  customEnabledSubtitle: {
    color: "#668172",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 2,
  },

  customDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#DDEBE0",
  },

  customDetailItem: {
    flex: 1,
  },

  customDetailDivider: {
    width: 1,
    height: 35,
    backgroundColor: "#DDEBE0",
    marginHorizontal: 12,
  },

  customDetailLabel: {
    color: "#8A7A85",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },

  customDetailValue: {
    color: "#2E2130",
    fontSize: 14,
    fontWeight: "800",
  },

  customRateValue: {
    color: "#780C60",
    fontSize: 14,
    fontWeight: "800",
  },

  customDisabledCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F5F7",
    borderWidth: 1,
    borderColor: "#E9E1E5",
    borderRadius: 17,
    padding: 15,
  },

  customDisabledText: {
    flex: 1,
    marginLeft: 11,
  },

  customDisabledTitle: {
    color: "#655761",
    fontSize: 14,
    fontWeight: "800",
  },

  customDisabledSubtitle: {
    color: "#9A8993",
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 2,
  },

  loadingBox: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1D5E8",
  },

  emptyContainer: {
    flex: 1,
    backgroundColor: "#FDF5FB",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },

  emptyTitle: {
    color: "#3D1633",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 12,
  },

  emptyText: {
    color: "#8A7A85",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
  },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(61, 22, 51, 0.5)",
  },

  modalContent: {
    width: "82%",
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 22,
    alignItems: "center",
  },

  modalIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FBEAEA",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3D1633",
    marginBottom: 8,
  },

  modalMessage: {
    fontSize: 13.5,
    color: "#7A6874",
    textAlign: "center",
    marginBottom: 22,
    lineHeight: 19,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  cancelButton: {
    flex: 1,
    marginRight: 10,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#F2EEF1",
    alignItems: "center",
  },

  confirmButton: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#D9534F",
    alignItems: "center",

    shadowColor: "#D9534F",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 4,
  },

  cancelButtonText: {
    color: "#3D1633",
    fontWeight: "700",
  },

  confirmButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
});

export default PackageScreen;