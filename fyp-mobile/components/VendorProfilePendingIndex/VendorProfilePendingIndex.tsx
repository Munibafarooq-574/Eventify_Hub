// fyp-mobile/components/vendorprofilepending/VendorProfilePendingIndex.tsx

import { getSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  AppState,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type ApprovalStatus =
  | "INCOMPLETE"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

type ApprovalResponse = {
  status: ApprovalStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
};

type StoredUser = {
  _id?: string;
  id?: string;
};

const API_BASE_URL =
  "https://eventify-hub.onrender.com";

export default function VendorProfilePendingIndex() {
  const [
    approvalData,
    setApprovalData,
  ] = useState<ApprovalResponse>({
    status: "PENDING_REVIEW",
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

 

const getUserId = async () => {
  const user =
    await getSecureData("user");

  if (!user) {
    return null;
  }

  try {
    const parsedUser: StoredUser =
      typeof user === "string"
        ? JSON.parse(user)
        : (user as StoredUser);

    return (
      parsedUser._id ||
      parsedUser.id ||
      null
    );
  } catch {
    return null;
  }
};

  const loadApprovalStatus =
    useCallback(
      async (
        showLoader = true,
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          setError(null);

          const userId =
            await getUserId();

          if (!userId) {
            setError(
              "Unable to find vendor account.",
            );

            return;
          }
const token =
  await getSecureData("token");

if (!token) {
  setError(
    "Your session has expired. Please log in again.",
  );

  return;
}

const response =
  await fetch(
    `${API_BASE_URL}/vendor/approval-status/${encodeURIComponent(
      userId,
    )}`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

          let data: any = null;

          try {
            data =
              await response.json();
          } catch {
            data = null;
          }

          if (!response.ok) {
            throw new Error(
              data?.message ||
                "Unable to check profile status.",
            );
          }

          const nextStatus:
            ApprovalStatus =
            data?.status ||
            "INCOMPLETE";

          setApprovalData({
            status:
              nextStatus,

            submittedAt:
              data?.submittedAt ??
              null,

            reviewedAt:
              data?.reviewedAt ??
              null,

            rejectionReason:
              data?.rejectionReason ??
              null,
          });
        } catch (err) {
          console.error(
            "Vendor approval status error:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to check profile status.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    loadApprovalStatus();
  }, [loadApprovalStatus]);

  useEffect(() => {
  const subscription =
    AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          loadApprovalStatus(false);
        }
      },
    );

  return () => {
    subscription.remove();
  };
}, [loadApprovalStatus]);

  const handleRefresh =
    async () => {
      setRefreshing(true);

      await loadApprovalStatus(
        false,
      );
    };

  const handleDashboard =
    () => {
      router.replace(
        "/vendordashboard",
      );
    };

  const handleEditProfile =
    () => {
      router.replace(
        "/vendorcontactdetails",
      );
    };

  const handleGoToLogin =
    () => {
      router.replace(
        "/login",
      );
    };

  if (loading) {
    return (
      <View
        style={
          styles.loadingContainer
        }
      >
        <ActivityIndicator
          size="large"
          color="#7D0C72"
        />

        <Text
          style={
            styles.loadingText
          }
        >
          Checking profile
          status...
        </Text>
      </View>
    );
  }

  const isPending =
    approvalData.status ===
    "PENDING_REVIEW";

  const isApproved =
    approvalData.status ===
    "APPROVED";

  const isRejected =
    approvalData.status ===
    "REJECTED";

  const isIncomplete =
    approvalData.status ===
    "INCOMPLETE";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={
        styles.contentContainer
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={
            handleRefresh
          }
          tintColor="#7D0C72"
        />
      }
    >
      <View
        style={styles.card}
      >
        {isPending && (
          <>
            <View
              style={[
                styles.iconCircle,
                styles.pendingIcon,
              ]}
            >
              <Ionicons
                name="time-outline"
                size={42}
                color="#A16207"
              />
            </View>

            <Text
              style={styles.title}
            >
              Profile Under Review
            </Text>

            <Text
              style={
                styles.description
              }
            >
              Your vendor profile
              has been submitted
              successfully. Our admin
              team is reviewing your
              business information.
            </Text>

            <View
              style={[
                styles.statusBox,
                styles.pendingBox,
              ]}
            >
              <Text
                style={
                  styles.statusLabel
                }
              >
                Current Status
              </Text>

              <Text
                style={[
                  styles.statusValue,
                  styles.pendingText,
                ]}
              >
                Pending Review
              </Text>
            </View>

            <Text
              style={
                styles.smallText
              }
            >
              You'll receive an email
              once your profile is
              approved or rejected.
            </Text>
          </>
        )}

        {isApproved && (
          <>
            <View
              style={[
                styles.iconCircle,
                styles.approvedIcon,
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={44}
                color="#047857"
              />
            </View>

            <Text
              style={styles.title}
            >
              Profile Approved 🎉
            </Text>

            <Text
              style={
                styles.description
              }
            >
              Your vendor account is
              now active. You can
              access your dashboard
              and start offering your
              services.
            </Text>

            <View
              style={[
                styles.statusBox,
                styles.approvedBox,
              ]}
            >
              <Text
                style={
                  styles.statusLabel
                }
              >
                Current Status
              </Text>

              <Text
                style={[
                  styles.statusValue,
                  styles.approvedText,
                ]}
              >
                Approved
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.primaryButton
              }
              activeOpacity={0.85}
              onPress={
                handleDashboard
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Continue to Dashboard
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </>
        )}

        {isRejected && (
          <>
            <View
              style={[
                styles.iconCircle,
                styles.rejectedIcon,
              ]}
            >
              <Ionicons
                name="close-circle-outline"
                size={44}
                color="#BE123C"
              />
            </View>

            <Text
              style={styles.title}
            >
              Profile Needs Changes
            </Text>

            <Text
              style={
                styles.description
              }
            >
              Your vendor profile
              needs some changes
              before it can be
              approved.
            </Text>

            <View
              style={[
                styles.statusBox,
                styles.rejectedBox,
              ]}
            >
              <Text
                style={
                  styles.statusLabel
                }
              >
                Current Status
              </Text>

              <Text
                style={[
                  styles.statusValue,
                  styles.rejectedText,
                ]}
              >
                Rejected
              </Text>
            </View>

            <View
              style={
                styles.reasonCard
              }
            >
              <Text
                style={
                  styles.reasonLabel
                }
              >
                Rejection Reason
              </Text>

              <Text
                style={
                  styles.reasonText
                }
              >
                {approvalData.rejectionReason ||
                  "Please review your profile information and submit it again."}
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.primaryButton
              }
              activeOpacity={0.85}
              onPress={
                handleEditProfile
              }
            >
              <Ionicons
                name="create-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Edit Profile &
                Resubmit
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isIncomplete && (
          <>
            <View
              style={[
                styles.iconCircle,
                styles.incompleteIcon,
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={42}
                color="#475569"
              />
            </View>

            <Text
              style={styles.title}
            >
              Complete Your Profile
            </Text>

            <Text
              style={
                styles.description
              }
            >
              Complete your vendor
              profile before
              submitting it for
              admin review.
            </Text>

            <TouchableOpacity
              style={
                styles.primaryButton
              }
              onPress={
                handleEditProfile
              }
            >
              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Complete Profile
              </Text>
            </TouchableOpacity>
          </>
        )}

        {error && (
          <View
            style={
              styles.errorBox
            }
          >
            <Ionicons
              name="alert-circle-outline"
              size={20}
              color="#BE123C"
            />

            <Text
              style={
                styles.errorText
              }
            >
              {error}
            </Text>
          </View>
        )}

        {!isApproved && (
          <TouchableOpacity
            style={
              styles.refreshButton
            }
            activeOpacity={0.8}
            onPress={() =>
              loadApprovalStatus()
            }
          >
            <Ionicons
              name="refresh"
              size={18}
              color="#7D0C72"
            />

            <Text
              style={
                styles.refreshButtonText
              }
            >
              Refresh Status
            </Text>
          </TouchableOpacity>
        )}

        {!isApproved && (
          <TouchableOpacity
            style={
              styles.loginButton
            }
            activeOpacity={0.8}
            onPress={
              handleGoToLogin
            }
          >
            <Ionicons
              name="log-in-outline"
              size={18}
              color="#7D0C72"
            />

            <Text
              style={
                styles.loginButtonText
              }
            >
              Login
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        "#F8F7FB",
    },

    contentContainer: {
      flexGrow: 1,
      justifyContent:
        "center",
      paddingHorizontal: 22,
      paddingVertical: 40,
    },

    loadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#F8F7FB",
      padding: 24,
    },

    loadingText: {
      marginTop: 14,
      fontSize: 14,
      color: "#64748B",
    },

    card: {
      width: "100%",
      maxWidth: 520,
      alignSelf: "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 24,
      paddingHorizontal: 24,
      paddingVertical: 32,

      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: {
        width: 0,
        height: 7,
      },

      elevation: 4,
    },

    iconCircle: {
      width: 82,
      height: 82,
      borderRadius: 41,
      alignItems: "center",
      justifyContent:
        "center",
      alignSelf: "center",
      marginBottom: 22,
    },

    pendingIcon: {
      backgroundColor:
        "#FEF3C7",
    },

    approvedIcon: {
      backgroundColor:
        "#D1FAE5",
    },

    rejectedIcon: {
      backgroundColor:
        "#FFE4E6",
    },

    incompleteIcon: {
      backgroundColor:
        "#F1F5F9",
    },

    title: {
      fontSize: 24,
      fontWeight: "800",
      textAlign: "center",
      color: "#111827",
    },

    description: {
      marginTop: 12,
      fontSize: 15,
      lineHeight: 23,
      textAlign: "center",
      color: "#64748B",
    },

    statusBox: {
      marginTop: 26,
      borderRadius: 16,
      padding: 18,
      alignItems: "center",
      borderWidth: 1,
    },

    pendingBox: {
      backgroundColor:
        "#FFFBEB",
      borderColor: "#FDE68A",
    },

    approvedBox: {
      backgroundColor:
        "#ECFDF5",
      borderColor: "#A7F3D0",
    },

    rejectedBox: {
      backgroundColor:
        "#FFF1F2",
      borderColor: "#FECDD3",
    },

    statusLabel: {
      fontSize: 12,
      fontWeight: "700",
      textTransform:
        "uppercase",
      letterSpacing: 0.7,
      color: "#64748B",
    },

    statusValue: {
      marginTop: 7,
      fontSize: 17,
      fontWeight: "800",
    },

    pendingText: {
      color: "#A16207",
    },

    approvedText: {
      color: "#047857",
    },

    rejectedText: {
      color: "#BE123C",
    },

    smallText: {
      marginTop: 18,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      color: "#64748B",
    },

    reasonCard: {
      marginTop: 18,
      padding: 17,
      backgroundColor:
        "#FFF7F7",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#FECDD3",
    },

    reasonLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: "#BE123C",
      textTransform:
        "uppercase",
      letterSpacing: 0.6,
    },

    reasonText: {
      marginTop: 8,
      fontSize: 14,
      lineHeight: 21,
      color: "#881337",
    },

    primaryButton: {
      minHeight: 52,
      marginTop: 26,
      borderRadius: 15,
      backgroundColor:
        "#7D0C72",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 9,
      paddingHorizontal: 18,
    },

    primaryButtonText: {
      fontSize: 15,
      fontWeight: "800",
      color: "#FFFFFF",
    },

    refreshButton: {
      minHeight: 50,
      marginTop: 14,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: "#7D0C72",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
      paddingHorizontal: 18,
      backgroundColor:
        "#FFFFFF",
    },

    refreshButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#7D0C72",
    },

    loginButton: {
      minHeight: 50,
      marginTop: 14,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: "#7D0C72",
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8,
      paddingHorizontal: 18,
      backgroundColor:
        "#F8F7FB",
    },

    loginButtonText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#7D0C72",
    },

    errorBox: {
      marginTop: 18,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 9,
      padding: 14,
      borderRadius: 12,
      backgroundColor:
        "#FFF1F2",
      borderWidth: 1,
      borderColor: "#FECDD3",
    },

    errorText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 19,
      color: "#BE123C",
    },
  });