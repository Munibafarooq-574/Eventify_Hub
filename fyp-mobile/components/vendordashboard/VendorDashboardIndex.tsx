import getOrderStatsMonthly from "@/services/getOrderStatsMonthly";
import getVendorOrderStats from "@/services/getVendorOrderStats";
import getVendorAnalytics from "@/services/getVendorAnalytics";
import { VendorBadgeChips } from "../VendorFeature/VendorBadgeChips";
import { getSubscriptionAccessState } from "@/services/getSubscriptionAccessState";
import { getVendorPackagesList } from "@/services/getVendorPackagesList";
import {
    SubscriptionAccessState,
    SubscriptionPlan,
    SubscriptionStatus,
} from "@/types/subscription.types";
import { VendorAnalytics } from "@/types/vendorAnalytics";
import {
  getSecureData,
  getUserData,
} from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";

const screenWidth = Dimensions.get("window").width;

// Rotating accent colors used for package cards / avatars so the
// screen doesn't look flat when there are 2, 3 or 4 packages.
const PACKAGE_ACCENTS = [
    { bg: "#F3E1FB", tint: "#7D0C72", icon: "cube-outline" as const },
    { bg: "#FFE9D6", tint: "#E07A1F", icon: "layers-outline" as const },
    { bg: "#FFF3C4", tint: "#B8860B", icon: "diamond-outline" as const },
    { bg: "#DCF7E3", tint: "#1E8E5A", icon: "sparkles-outline" as const },
];

const MONTH_NAMES = [
    "", "Jan", "Feb", "Mar", "Apr", "May",
    "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
];

//type OrderStats = { totalOrders: number; processing: number; completed: number; cancelled: number };
type OrderStats = { totalOrders: number; pending: number; processing: number; completed: number; cancelled: number };

function formatPKR(amount: number): string {
    if (!amount) return "Rs. 0";
    return `Rs. ${Math.round(amount).toLocaleString("en-PK")}`;
}

const DashboardScreen = () => {
    const insets = useSafeAreaInsets();

    const [username, setUsername] = useState<string>("");
    const [vendorId, setVendorId] = useState<string | null>(null);
        const [orderStats, setOrderStats] = useState<OrderStats>({
        totalOrders: 0,
        pending: 0,
        processing: 0,
        completed: 0,
        cancelled: 0,
    });
    const [orderCountArray, setOrderCountArray] = useState<number[]>([]);
    const [orderAmountArray, setOrderAmountArray] = useState<number[]>([]);
    const [monthNameArray, setMonthNameArray] = useState<string[]>([]);
    const [avatar, setAvatar] = useState<string>("");
    const [packages, setPackages] = useState<any[]>([]);
    const [hasNotifications, setHasNotifications] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);

    const [checkingApproval, setCheckingApproval] =
    useState<boolean>(true);
  
    const [initialLoading, setInitialLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // ---- Analytics state ----
    const [analytics, setAnalytics] = useState<VendorAnalytics | null>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
    const [analyticsError, setAnalyticsError] = useState<boolean>(false);
    const [subscriptionAccess, setSubscriptionAccess] =
    useState<SubscriptionAccessState | null>(null);

const [subscriptionLoading, setSubscriptionLoading] =
    useState<boolean>(true);

const [subscriptionError, setSubscriptionError] =
    useState<boolean>(false);

    // Prevent duplicate alerts while focus/refresh requests are running.
    const renewalAlertInProgress = useRef(false);

    const maxPackages =
    subscriptionAccess?.limits?.maxPackages ?? 0;

const packageLimitReached =
    !subscriptionLoading &&
    !subscriptionError &&
    subscriptionAccess !== null &&
    packages.length >= maxPackages;

    useEffect(() => {
        fetchUsername();
    }, []);

   const checkVendorApproval =
  React.useCallback(async (): Promise<boolean> => {
    try {
      const user =
        await getUserData();

      if (!user?._id) {
        console.warn(
          "No user data found for vendor approval check.",
        );

        router.replace(
          "/vendorprofilepending",
        );

        return false;
      }

      const token =
        await getSecureData("token");

      if (!token) {
        console.warn(
          "Authentication token not found.",
        );

        router.replace("/login");

        return false;
      }

      const response =
        await fetch(
          `https://eventify-hub.onrender.com/vendor/approval-status/${encodeURIComponent(
            user._id,
          )}`,
          {
            method: "GET",

            headers: {
              Accept: "application/json",
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      if (!response.ok) {
        console.warn(
          "Unable to check vendor approval status:",
          response.status,
        );

        router.replace(
          "/vendorprofilepending",
        );

        return false;
      }

      const data =
        await response.json();

      if (
        data?.status !==
        "APPROVED"
      ) {
        router.replace(
          "/vendorprofilepending",
        );

        return false;
      }

      setCheckingApproval(false);

      return true;
    } catch (error) {
      console.error(
        "Vendor approval guard error:",
        error,
      );

      router.replace(
        "/vendorprofilepending",
      );

      return false;
    }
  }, []);

    const fetchData = React.useCallback(async () => {
    try {
        const user = await getUserData();

if (!user?._id) {
    console.warn("No user data found.");
    setPackages([]);
    return;
}

        if (!user?._id) {
            console.warn("User ID not found in stored user data.");
            setPackages([]);
            return;
        }

        try {
    const vendorPackages = await getVendorPackagesList(user._id);

    setPackages(
        Array.isArray(vendorPackages)
            ? vendorPackages
            : []
    );
} catch (packageError) {
    console.error(
        "Error fetching vendor packages:",
        packageError
    );

    // Fallback only if API fails
    setPackages(
        Array.isArray(user.packages)
            ? user.packages
            : []
    );
}

        const statsData = await getVendorOrderStats("Vendor", user._id);

        setOrderStats({
            totalOrders: statsData.totalOrders ?? 0,
            pending: (statsData as any).pending ?? 0,
            processing: statsData.processing ?? 0,
            completed: statsData.completed ?? 0,
            cancelled: (statsData as any).cancelled ?? 0,
        });

        const response = await getOrderStatsMonthly(user._id);

        setOrderAmountArray(
            Array.isArray(response)
                ? response.map((item: any) => item.totalAmount ?? 0)
                : []
        );

        setOrderCountArray(
            Array.isArray(response)
                ? response.map((item: any) => item.orderCount ?? 0)
                : []
        );

        setMonthNameArray(
            Array.isArray(response)
                ? response.map((item: any) => MONTH_NAMES[item.month] ?? "")
                : []
        );

    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoading(false);
    }
}, []);

   const fetchAnalytics = React.useCallback(async () => {
    try {
        const user = await getUserData();

        if (!user?._id) {
            console.warn("No user data found for analytics.");
            setAnalyticsError(true);
            return;
        }

        setAnalyticsError(false);
        setAnalyticsLoading(true);

        const data = await getVendorAnalytics(user._id);
        setAnalytics(data);
    } catch (error) {
        console.error("Error fetching vendor analytics:", error);
        setAnalyticsError(true);
    } finally {
        setAnalyticsLoading(false);
    }
}, []);

const fetchSubscriptionAccess = React.useCallback(async () => {
    try {
        const user = await getUserData();

        if (!user?._id) {
            setSubscriptionAccess(null);
            return;
        }

        setSubscriptionLoading(true);
        setSubscriptionError(false);

        const access = await getSubscriptionAccessState(user._id);

        setSubscriptionAccess(access);
    } catch (error) {
        console.error("Error fetching subscription access:", error);

        // Subscription failure must never break vendor dashboard.
        setSubscriptionError(true);
        setSubscriptionAccess(null);
    } finally {
        setSubscriptionLoading(false);
    }
}, []);

    // Runs all three fetches together (in parallel) so the page loads
    // as fast as possible instead of waiting for one after another.
    const loadAllData = React.useCallback(async () => {
        await Promise.allSettled([
            fetchData(),
            fetchAnalytics(),
            fetchSubscriptionAccess(),
        ]);
        // Whatever the outcome (success or error on any of them), stop
        // showing the full-screen loader after the first attempt.
        setInitialLoading(false);
    }, [fetchData, fetchAnalytics, fetchSubscriptionAccess]);

    // Pull-to-refresh handler
    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await Promise.allSettled([
            fetchData(),
            fetchAnalytics(),
            fetchSubscriptionAccess(),
        ]);
        setRefreshing(false);
    }, [fetchData, fetchAnalytics, fetchSubscriptionAccess]);

useFocusEffect(
  React.useCallback(() => {
    let active = true;

    const loadDashboardSafely =
      async () => {
        const approved =
          await checkVendorApproval();

        if (
          !active ||
          !approved
        ) {
          return;
        }

        await loadAllData();
      };

    loadDashboardSafely();

    return () => {
      active = false;
    };
  }, [
    checkVendorApproval,
    loadAllData,
  ]),
);

    // Show a reminder once per vendor per local calendar day. Real API data only.
    useEffect(() => {
        if (
            initialLoading ||
            checkingApproval ||
            subscriptionLoading ||
            subscriptionError ||
            !subscriptionAccess ||
            !vendorId ||
            renewalAlertInProgress.current
        ) {
            return;
        }

        const subscription = subscriptionAccess.subscription;
        const isExpired = subscription?.status === SubscriptionStatus.EXPIRED;
        const isExpiringSoon =
            subscription?.status === SubscriptionStatus.ACTIVE &&
            subscriptionAccess.isPaidPlan === true &&
            subscriptionAccess.daysRemaining >= 1 &&
            subscriptionAccess.daysRemaining <= 7 &&
            !subscriptionAccess.hasPendingPayment;

        if (!isExpired && !isExpiringSoon) return;

        renewalAlertInProgress.current = true;
        let cancelled = false;

        const showReminder = async () => {
            const today = new Date();
            const localDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            const reminderType = isExpired ? "expired" : "expiring";
            const key = `subscription-reminder-${vendorId}-${reminderType}`;

            try {
                const lastShownDay = await SecureStore.getItemAsync(key);
                if (cancelled || lastShownDay === localDay) return;

                // Mark as shown before displaying to avoid repeat alerts on refocus.
                await SecureStore.setItemAsync(key, localDay);
                if (cancelled) return;

                Alert.alert(
                    isExpired ? "Subscription Expired" : "Subscription Expiring Soon",
                    isExpired
                        ? "Your subscription has expired. View plans to restore subscription benefits."
                        : `Your subscription expires in ${subscriptionAccess.daysRemaining} day${subscriptionAccess.daysRemaining === 1 ? "" : "s"}. Review your plan to continue your access.`,
                    [
                        { text: "Not Now", style: "cancel" },
                        {
                            text: isExpired ? "View Plans" : "Renew Plan",
                            onPress: () => router.push({
                                pathname: "/subscriptionscreen",
                                params: { vendorId },
                            }),
                        },
                    ],
                );
            } catch (error) {
                console.warn("Unable to display subscription reminder:", error);
            } finally {
                renewalAlertInProgress.current = false;
            }
        };

        void showReminder();
        return () => { cancelled = true; };
    }, [
        initialLoading,
        checkingApproval,
        subscriptionLoading,
        subscriptionError,
        subscriptionAccess,
        vendorId,
    ]);

   const fetchUsername = async () => {
    try {
        const user = await getUserData();

        if (user) {
            setAvatar(user?.contactDetails?.brandLogo || "");
            setUsername(user?.name || "Guest");
            setVendorId(user?._id || null);
        } else {
            setUsername("Guest");
        }
    } catch (error) {
        console.error("Error reading user data:", error);
        setUsername("Guest");
    }
};
    const initials = username
        ? username
              .trim()
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()
        : "V";

    const hasChartData =
        monthNameArray.length > 0 &&
        orderAmountArray.length > 0 &&
        orderCountArray.length > 0;

    const currentMonthLabel = new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    if (checkingApproval) {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={["#8A0F7C", "#5E0A55"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fullScreenLoader}
            >
                <ActivityIndicator
                    size="large"
                    color="#ffffff"
                />

                <Text
                    style={styles.fullScreenLoaderText}
                >
                    Checking account status...
                </Text>
            </LinearGradient>
        </View>
    );
}

    // ---------- Full-screen loader shown only on first load ----------
    if (initialLoading) {
        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <LinearGradient
                    colors={["#8A0F7C", "#5E0A55"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fullScreenLoader}
                >
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.fullScreenLoaderText}>
                        Loading your dashboard…
                    </Text>
                </LinearGradient>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#7D0C72"
                        colors={["#7D0C72"]}
                    />
                }
            >
                {/* ---------- Header ---------- */}
                <LinearGradient
                    colors={["#8A0F7C", "#5E0A55"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: insets.top + 18 }]}
                >
                    <View style={styles.profileContainer}>
                        <View style={styles.profileDetails}>
                            <View style={styles.avatarRing}>
                                {avatar ? (
                                    <Image source={{ uri: avatar }} style={styles.avatarImage} />
                                ) : (
                                    <View style={styles.avatarFallback}>
                                        <Text style={styles.avatarInitials}>{initials}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.welcomeText}>Welcome back</Text>
                                <Text style={styles.username}>{username || "..."}</Text>
                            </View>
                        </View>

                       <View style={styles.headerActions}>

    <TouchableOpacity
        style={styles.headerActionButton}
        activeOpacity={0.7}
        onPress={() => {
            if (vendorId) {
                router.push({
                    pathname: "/vendorgrowth",
                    params: { vendorId },
                });
            } else {
                Alert.alert("Error", "Vendor ID not found.");
            }
        }}
    >
        <Ionicons
            name="rocket-outline"
            size={22}
            color="#fff"
        />
    </TouchableOpacity>

    <TouchableOpacity
        style={styles.headerActionButton}
        activeOpacity={0.7}
        onPress={() => router.push("/vendornotifications")}
    >
        <Ionicons
            name="notifications-outline"
            size={22}
            color="#fff"
        />

        {hasNotifications && (
            <View style={styles.notificationDot} />
        )}
    </TouchableOpacity>

</View>
                    </View>

                    {/* ---------- Order Overview (4 cards) ---------- */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.statsContainer}
                    >
                                                <StatBox
                            icon="receipt-outline"
                            value={orderStats.totalOrders}
                            label="Orders"
                            accent="#B489D6"
                            onPress={() =>
                                router.push({
                                    pathname: "/vendorordersummary",
                                    params: { selectedTab: "All" },
                                })
                            }
                        />
                         <StatBox
                            icon="time-outline"
                            value={orderStats.pending}
                            label="Pending"
                            accent="#F0A868"
                            onPress={() =>
                                router.push({
                                    pathname: "/vendorordersummary",
                                    params: { selectedTab: "Pending" },
                                })
                            }
                        />
                        <StatBox
                            icon="hourglass-outline"
                            value={orderStats.processing}
                            label="Processing"
                            accent="#4A84BD"
                            onPress={() =>
                                router.push({
                                    pathname: "/vendorordersummary",
                                    params: { selectedTab: "Processing" },
                                })
                            }
                        />
            
                        <StatBox
                            icon="checkmark-circle-outline"
                            value={orderStats.completed}
                            label="Completed"
                            accent="#6FCF97"
                            onPress={() =>
                                router.push({
                                    pathname: "/vendorordersummary",
                                    params: { selectedTab: "Completed" },
                                })
                            }
                        />
                        <StatBox
                            icon="close-circle-outline"
                            value={orderStats.cancelled}
                            label="Cancelled"
                            accent="#E4405F"
                            onPress={() =>
                                router.push({
                                    pathname: "/vendorordersummary",
                                    params: { selectedTab: "Cancelled" },
                                })
                            }
                        />
                    </ScrollView>
                </LinearGradient>

            {/* ---------- Subscription Status ---------- */}
            <View style={styles.subscriptionSection}>
                {subscriptionLoading ? (
                    <View style={styles.subscriptionSkeleton} />
                ) : subscriptionAccess ? (
                    <SubscriptionStatusBanner
                        access={subscriptionAccess}
                        onPress={() =>
                        router.push({
                            pathname: "/subscriptionscreen",
                            params: { vendorId },
                        })
                    }
                    />
                ) : subscriptionError ? (
                    <TouchableOpacity
                        style={styles.subscriptionLoadError}
                        activeOpacity={0.8}
                        onPress={fetchSubscriptionAccess}
                    >
                        <Ionicons
                            name="refresh-outline"
                            size={18}
                            color="#7D0C72"
                        />

                        <Text style={styles.subscriptionLoadErrorText}>
                            Unable to load subscription status. Tap to retry.
                        </Text>
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* ---------- Marketing & Campaigns ---------- */}
<View style={styles.marketingSection}>
    <TouchableOpacity
        activeOpacity={0.86}
        onPress={() => {
            if (!vendorId) {
                Alert.alert(
                    "Error",
                    "Vendor ID not found.",
                );
                return;
            }

            router.push({
                pathname: "/vendorcampaigns",
                params: { vendorId },
            });
        }}
    >
        <LinearGradient
            colors={["#7D0C72", "#640080"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.marketingCard}
        >
            {/* Decorative background */}
            <View style={styles.marketingGlowOne} />
            <View style={styles.marketingGlowTwo} />

            <View style={styles.marketingCardTop}>
                <View style={styles.marketingIconContainer}>
                    <Ionicons
                        name="megaphone-outline"
                        size={24}
                        color="#7D0C72"
                    />
                </View>

                <View style={styles.marketingBadge}>
                    <Ionicons
                        name="sparkles"
                        size={11}
                        color="#7D0C72"
                    />

                    <Text style={styles.marketingBadgeText}>
                        PROMOTE
                    </Text>
                </View>
            </View>

            <View style={styles.marketingContent}>
                <Text style={styles.marketingEyebrow}>
                    MARKETING
                </Text>

                <Text style={styles.marketingTitle}>
                    Marketing & Campaigns
                </Text>

                <Text style={styles.marketingDescription}>
                    Promote your packages, manage sponsored campaigns
                    and track their performance.
                </Text>
            </View>

            <View style={styles.marketingFooter}>
                <View style={styles.marketingFeatureRow}>
                    <View style={styles.marketingFeature}>
                        <Ionicons
                            name="cube-outline"
                            size={14}
                            color="#FFFFFF"
                        />

                        <Text style={styles.marketingFeatureText}>
                            Packages
                        </Text>
                    </View>

                    <View style={styles.marketingFeatureDivider} />

                    <View style={styles.marketingFeature}>
                        <Ionicons
                            name="stats-chart-outline"
                            size={14}
                            color="#FFFFFF"
                        />

                        <Text style={styles.marketingFeatureText}>
                            Analytics
                        </Text>
                    </View>
                </View>

                <View style={styles.marketingOpenButton}>
                    <Text style={styles.marketingOpenButtonText}>
                        Open
                    </Text>

                    <Ionicons
                        name="arrow-forward"
                        size={15}
                        color="#7D0C72"
                    />
                </View>
            </View>
        </LinearGradient>
    </TouchableOpacity>
</View>
                {/* ---------- Analytics error banner ---------- */}
                {analyticsError && (
                    <View style={styles.errorBanner}>
                        <Ionicons name="alert-circle-outline" size={16} color="#E4405F" />
                        <Text style={styles.errorBannerText}>Unable to load analytics</Text>
                        <TouchableOpacity onPress={fetchAnalytics} style={styles.retryButton}>
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}


                {/* ---------- Vendor Badges ---------- */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.statisticsHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Your Badges</Text>
                                <Text style={styles.sectionSubtitle}>
                                    Achievements you've earned
                                </Text>
                            </View>
                        </View>

                        {vendorId ? (
                            <View
                                style={{
                                    backgroundColor: "#fff",
                                    borderRadius: 16,
                                    padding: 14,
                                    ...cardShadow(0.05),
                                }}
                            >
                                <VendorBadgeChips
                                    vendorId={vendorId}
                                    showEmptyState
                                    emptyStateText="No badges earned yet — keep growing to unlock badges!"
                                />
                            </View>
                        ) : null}
                    </View>
                {/* ---------- Revenue Overview ---------- */}
                <View style={styles.sectionContainer}>
                    {analyticsLoading ? (
                        <SkeletonBlock height={130} />
                    ) : (
                        <LinearGradient
                            colors={["#7D0C72", "#8641F4"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.revenueCard}
                        >
                            <View>
                                <Text style={styles.revenueLabel}>Total Revenue</Text>
                                <Text style={styles.revenueValue}>
                                    {formatPKR(analytics?.totalRevenue || 0)}
                                </Text>
                            </View>
                            <View style={styles.revenueDivider} />
                            <View style={styles.revenueMonthRow}>
                                <View>
                                    <Text style={styles.revenueSubLabel}>This Month</Text>
                                    <Text style={styles.revenueMonthValue}>
                                        {formatPKR(analytics?.monthlyRevenue || 0)}
                                    </Text>
                                </View>
                                {analytics?.monthlyRevenueChangePct !== null &&
                                    analytics?.monthlyRevenueChangePct !== undefined && (
                                        <View style={styles.trendPill}>
                                            <Ionicons
                                                name={
                                                    analytics.monthlyRevenueChangePct >= 0
                                                        ? "trending-up"
                                                        : "trending-down"
                                                }
                                                size={13}
                                                color="#fff"
                                            />
                                            <Text style={styles.trendPillText}>
                                                {Math.abs(analytics.monthlyRevenueChangePct).toFixed(1)}%
                                            </Text>
                                        </View>
                                    )}
                            </View>
                        </LinearGradient>
                    )}
                </View>

                {/* ---------- Sales Statistics ---------- */}
                <View style={styles.sectionContainer}>
                    <View style={styles.statisticsHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Sales Statistics</Text>
                            <Text style={styles.sectionSubtitle}>Last 6 months performance</Text>
                        </View>
                        <View style={styles.legendPill}>
                            <View style={[styles.legendDot, { backgroundColor: "#8641F4" }]} />
                            <Text style={styles.legendLabel}>Revenue</Text>
                            <View style={[styles.legendDot, { backgroundColor: "#E4405F", marginLeft: 10 }]} />
                            <Text style={styles.legendLabel}>Orders</Text>
                        </View>
                    </View>

                    <View style={styles.chartCard}>
                        {hasChartData ? (
    Platform.OS === "web" ? (
        <View style={styles.emptyState}>
            <Ionicons
                name="bar-chart-outline"
                size={30}
                color="#C9AFCF"
            />
            <Text style={styles.emptyStateText}>
                Sales chart is available on Android and iOS
            </Text>
        </View>
    ) : (
        <LineChart
            data={{
                labels: monthNameArray,
                datasets: [
                    {
                        data: orderAmountArray,
                        color: () => "#8641F4",
                        strokeWidth: 3,
                    },
                    {
                        data: orderCountArray,
                        color: () => "#E4405F",
                        strokeWidth: 3,
                    },
                ],
            }}
            width={screenWidth - 64}
            height={200}
            chartConfig={chartConfig}
            withInnerLines={true}
            withOuterLines={false}
            bezier
            style={styles.chart}
        />
    )
) : (
    <View style={styles.emptyState}>
        <Ionicons
            name="bar-chart-outline"
            size={30}
            color="#C9AFCF"
        />
        <Text style={styles.emptyStateText}>
            {loading
                ? "Loading your sales data…"
                : "No sales data yet this period"}
        </Text>
    </View>
)}
                    </View>
                </View>

                {/* ---------- Quick Analytics Grid ---------- */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Business Insights</Text>
                    <Text style={styles.sectionSubtitle}>How your business is performing</Text>

                    <View style={styles.analyticsGrid}>
                        {analyticsLoading ? (
                            <>
                                <SkeletonBlock height={110} width="48%" />
                                <SkeletonBlock height={110} width="48%" />
                                <SkeletonBlock height={110} width="48%" />
                                <SkeletonBlock height={110} width="48%" />
                            </>
                        ) : (
                            <>
                                <AnalyticsCard
                                    icon="star"
                                    accent="#F4B942"
                                    title="Average Rating"
                                    value={
                                        analytics?.averageRating != null
                                            ? `${analytics.averageRating.toFixed(1)} ★`
                                            : undefined
                                    }
                                    emptyLabel="No reviews yet"
                                    subtitle={
                                        analytics?.averageRating != null
                                            ? `Based on ${analytics.totalReviews} reviews`
                                            : undefined
                                    }
                                />
                                <AnalyticsCard
                                    icon="chatbubble-ellipses"
                                    accent="#6FCF97"
                                    title="Response Time"
                                    value={
                                        analytics?.responseTimeMinutes != null
                                            ? `~${analytics.responseTimeMinutes} min`
                                            : undefined
                                    }
                                    emptyLabel="Not enough data"
                                    subtitle={
                                        analytics?.responseTimeMinutes != null
                                            ? analytics.responseTimeMinutes <= 30
                                                ? "Excellent response time"
                                                : "Keep replies quick"
                                            : undefined
                                    }
                                />
                                <AnalyticsCard
                                    icon="people"
                                    accent="#8641F4"
                                    title="Repeat Customers"
                                    value={
                                        analytics?.repeatCustomerRate != null
                                            ? `${Math.round(analytics.repeatCustomerRate)}%`
                                            : undefined
                                    }
                                    emptyLabel="No repeat customers yet"
                                    subtitle={
                                        analytics?.repeatCustomerRate != null
                                            ? `${analytics.repeatCustomers} returning customers`
                                            : undefined
                                    }
                                />
                                <AnalyticsCard
                                    icon="close-circle"
                                    accent="#E4405F"
                                    title="Cancelled Orders"
                                    value={String(analytics?.cancelledOrders ?? 0)}
                                    subtitle={
                                        analytics?.cancellationRate != null
                                            ? `${analytics.cancellationRate.toFixed(1)}% cancellation rate`
                                            : "No orders yet"
                                    }
                                />
                            </>
                        )}
                    </View>
                </View>

                {/* ---------- Popular Package ---------- */}
                <View style={styles.sectionContainer}>
                    {analyticsLoading ? (
                        <SkeletonBlock height={100} />
                    ) : analytics?.popularPackage ? (
                        <LinearGradient
                            colors={["#F3E1FB", "#E9D3FA"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.popularCard}
                        >
                            <View style={styles.popularIconWrap}>
                                <Ionicons name="trophy" size={22} color="#7D0C72" />
                            </View>
                            <View style={{ flex: 1, marginLeft: 14 }}>
                                <Text style={styles.popularEyebrow}>Most Booked</Text>
                                <Text style={styles.popularName} numberOfLines={1}>
                                    {analytics.popularPackage.name}
                                </Text>
                                <Text style={styles.popularCount}>
                                    {analytics.popularPackage.bookingCount} bookings
                                </Text>
                            </View>
                        </LinearGradient>
                    ) : (
                        <View style={styles.emptyPackages}>
                            <Ionicons name="pricetags-outline" size={26} color="#C9AFCF" />
                            <Text style={styles.emptyStateText}>No bookings yet</Text>
                        </View>
                    )}
                </View>

                {/* ---------- Monthly Revenue ---------- */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Monthly Revenue</Text>
                    <Text style={styles.sectionSubtitle}>Your revenue performance</Text>

                    {analyticsLoading ? (
                        <SkeletonBlock height={140} />
                    ) : (
                        <View style={styles.monthlyRevenueCard}>
                            <Text style={styles.monthlyRevenueMonth}>{currentMonthLabel}</Text>
                            <Text style={styles.monthlyRevenueValue}>
                                {formatPKR(analytics?.monthlyRevenue || 0)}
                            </Text>
                            {analytics?.monthlyRevenueChangePct != null && (
                                <Text
                                    style={[
                                        styles.monthlyRevenueChange,
                                        {
                                            color:
                                                analytics.monthlyRevenueChangePct >= 0 ? "#1E8E5A" : "#E4405F",
                                        },
                                    ]}
                                >
                                    {analytics.monthlyRevenueChangePct >= 0 ? "+" : ""}
                                    {analytics.monthlyRevenueChangePct.toFixed(1)}% from last month
                                </Text>
                            )}

                            {!!analytics?.monthlyRevenueTrend?.length && (
                                <View style={styles.sparklineRow}>
                                    {analytics.monthlyRevenueTrend.map((point, idx) => {
                                        const max = Math.max(
                                            ...analytics.monthlyRevenueTrend.map((p) => p.revenue),
                                            1,
                                        );
                                        const heightPct = Math.max((point.revenue / max) * 100, 6);
                                        return (
                                            <View key={idx} style={styles.sparklineBarWrap}>
                                                <View
                                                    style={[
                                                        styles.sparklineBar,
                                                        { height: `${heightPct}%` },
                                                    ]}
                                                />
                                                <Text style={styles.sparklineLabel}>
                                                    {MONTH_NAMES[point.month]}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* ---------- Customer Insights ---------- */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Customer Insights</Text>
                    <Text style={styles.sectionSubtitle}>Who's booking your services</Text>

                    {analyticsLoading ? (
                        <SkeletonBlock height={90} />
                    ) : (
                        <View style={styles.insightsRow}>
                            <InsightPill
                                icon="repeat"
                                value={analytics?.repeatCustomers ?? 0}
                                label="Repeat"
                            />
                            <InsightPill
                                icon="person-add"
                                value={analytics?.newCustomers ?? 0}
                                label="New"
                            />
                            <InsightPill
                                icon="stats-chart"
                                value={
                                    analytics?.repeatCustomerRate != null
                                        ? `${Math.round(analytics.repeatCustomerRate)}%`
                                        : "—"
                                }
                                label="Repeat Rate"
                            />
                        </View>
                    )}
                </View>

                {/* ---------- Packages ---------- */}
                <View style={styles.sectionContainer}>
                    <View style={styles.packageSectionHeader}>
                        <View style={styles.packageSectionHeaderText}>
                            <Text style={styles.sectionTitle}>
                            Current Packages
                        </Text>

                        <Text style={styles.sectionSubtitle}>
                            {subscriptionAccess
                                ? `${packages.length} / ${maxPackages} packages`
                                : `${packages.length} packages`}
                        </Text>
                        </View>

                        <TouchableOpacity
                        style={[
                            styles.addPackageButton,
                            packageLimitReached &&
                                styles.addPackageButtonDisabled,
                        ]}
                        activeOpacity={0.8}
                    disabled={subscriptionLoading}
                        onPress={() => {
                            if (packageLimitReached) {
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

                            router.push({
                                pathname: "/vpdaddnewpackage",
                            });
                        }}
                    >
                        <Ionicons
                            name={
                                packageLimitReached
                                    ? "lock-closed-outline"
                                    : "add-circle-outline"
                            }
                            size={17}
                            color={
                                packageLimitReached
                                    ? "#9F8C9B"
                                    : "#FFFFFF"
                            }
                        />

                        <Text
                            style={[
                                styles.addPackageButtonText,
                                packageLimitReached &&
                                    styles.addPackageButtonTextDisabled,
                            ]}
                        >
                            {packageLimitReached
                                ? "Limit Reached"
                                : "Add Package"}
                        </Text>
                    </TouchableOpacity>
                    </View>

                    {packages.length > 0 ? (
                        <View style={styles.packageContainer}>
                            {packages.slice(0, 6).map((pkg: any, index) => {
                                const accent = PACKAGE_ACCENTS[index % PACKAGE_ACCENTS.length];
                                return (
                                    <TouchableOpacity
                                        key={pkg._id ?? index}
                                        activeOpacity={0.8}
                                        style={[styles.packageBox, { backgroundColor: accent.bg }]}
                                        onPress={() =>
                                            router.push({
                                                pathname: "/vendorpackages",
                                                params: { packageId: pkg._id },
                                            })
                                        }
                                    >
                                        <View style={[styles.packageIconWrap, { backgroundColor: "#fff" }]}>
                                            <Ionicons name={accent.icon} size={18} color={accent.tint} />
                                        </View>
                                        <Text style={styles.packageValue} numberOfLines={1}>
                                            {pkg.packageName}
                                        </Text>
                                        <Text style={[styles.packageLabel, { color: accent.tint }]}>
                                            Package
                                        </Text>
                                        <View style={styles.detailsRow}>
                                            <Text style={[styles.detailsText, { color: accent.tint }]}>
                                                Details
                                            </Text>
                                            <Ionicons name="chevron-forward" size={12} color={accent.tint} />
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.emptyPackages}>
                            <Ionicons name="pricetags-outline" size={26} color="#C9AFCF" />
                            <Text style={styles.emptyStateText}>No active packages yet</Text>
                        </View>
                    )}

                                {packages.length > 6 && (
                <TouchableOpacity
                    style={styles.viewAllPackagesButton}
                    activeOpacity={0.8}
                    onPress={() => {
                        if (!vendorId) {
                            Alert.alert(
                                "Error",
                                "Vendor ID not found."
                            );
                            return;
                        }

                        router.push({
                            pathname: "/VPD",
                            params: {
                                id: vendorId,
                                tab: "Packages",
                            },
                        });
                    }}
                >
                    <Text style={styles.viewAllPackagesText}>
                        View All {packages.length} Packages
                    </Text>

                    <Ionicons
                        name="arrow-forward"
                        size={16}
                        color="#7D0C72"
                    />
                </TouchableOpacity>
            )}
                </View>

                {/* ---------- Vendor Profile CTA ---------- */}
                <TouchableOpacity
                    style={styles.vendorProfileButton}
                    activeOpacity={0.85}
                    onPress={() => {
                        if (vendorId) {
                            router.push({ pathname: "/VPD", params: { id: vendorId } });
                        } else {
                            Alert.alert("Error", "Vendor ID not found.");
                        }
                    }}
                >
                    <Ionicons name="storefront-outline" size={18} color="#fff" />
                    <Text style={styles.vendorProfileButtonText}>View Vendor Profile</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" />
                </TouchableOpacity>
            </ScrollView>

            <BottomNavigationFinal />
        </View>
    );
};

type SubscriptionBannerConfig = {
    title: string;
    message: string;
    buttonLabel: string;
    icon: keyof typeof Ionicons.glyphMap;
    background: readonly [string, string];
};

const formatSubscriptionDate = (value?: string | null) => {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleDateString("en-PK", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const getSubscriptionBannerConfig = (
    access: SubscriptionAccessState,
): SubscriptionBannerConfig => {
    const subscription = access.subscription;

    /*
     * Pending payment gets priority because an existing paid plan may
     * remain active while an upgrade/renewal payment is being reviewed.
     */
    if (access.hasPendingPayment && access.pendingPayment) {
        const requestedPlan =
            access.pendingPayment.plan === SubscriptionPlan.PREMIUM
                ? "Premium"
                : access.pendingPayment.plan === SubscriptionPlan.GROWTH
                  ? "Growth"
                  : "Basic";

        return {
            title: "Payment Under Review",
            message: `Your ${requestedPlan} payment has been submitted and is awaiting verification.`,
            buttonLabel: "View Subscription",
            icon: "time-outline",
            background: ["#FFF4D6", "#FFE5A3"],
        };
    }

    if (subscription.status === SubscriptionStatus.REJECTED) {
        return {
            title: "Payment Rejected",
            message:
                subscription.rejectionReason ||
                "Your subscription payment could not be verified. Review it and try again.",
            buttonLabel: "View Plans",
            icon: "alert-circle-outline",
            background: ["#FDE8EC", "#F8D4DC"],
        };
    }

    if (subscription.status === SubscriptionStatus.TRIAL) {
        const trialEnd = formatSubscriptionDate(access.trialEndDate);

        if (access.trialDaysRemaining <= 2) {
            return {
                title: "Your Free Basic Trial Is Ending Soon",
                message:
                    access.trialDaysRemaining > 0
                        ? `${access.trialDaysRemaining} day${
                              access.trialDaysRemaining === 1 ? "" : "s"
                          } remaining${trialEnd ? ` • Ends ${trialEnd}` : ""}.`
                        : "Your free Basic trial is ending today.",
                buttonLabel: "Choose Plan",
                icon: "hourglass-outline",
                background: ["#FFF1D8", "#FFE0A8"],
            };
        }

        return {
            title: "Free Basic Trial Active",
            message: `${access.trialDaysRemaining} days remaining${
                trialEnd ? ` • Ends ${trialEnd}` : ""
            }.`,
            buttonLabel: "View Subscription",
            icon: "gift-outline",
            background: ["#F4E4FA", "#EAD2F5"],
        };
    }

    if (subscription.status === SubscriptionStatus.EXPIRED) {
        return {
            title: "Subscription Expired",
            message:
                "Choose a plan to restore subscription benefits, visibility and growth features.",
            buttonLabel: "Renew Subscription",
            icon: "alert-circle-outline",
            background: ["#FDE8EC", "#F8D4DC"],
        };
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
        const validUntil = formatSubscriptionDate(subscription.endDate);

        return {
            title: "Renewal Cancelled",
            message: validUntil
                ? `Your current access remains available until ${validUntil}.`
                : "Automatic renewal is cancelled.",
            buttonLabel: "Manage Subscription",
            icon: "calendar-outline",
            background: ["#F1EDF3", "#E6DDE9"],
        };
    }

    if (subscription.status === SubscriptionStatus.PENDING_PAYMENT) {
        return {
            title: "Payment Under Review",
            message:
                "Your payment has been submitted and is awaiting admin verification.",
            buttonLabel: "View Subscription",
            icon: "time-outline",
            background: ["#FFF4D6", "#FFE5A3"],
        };
    }

    const validUntil = formatSubscriptionDate(subscription.endDate);

    if (subscription.status === SubscriptionStatus.ACTIVE) {
        if (access.effectivePlan === SubscriptionPlan.PREMIUM) {
            return {
                title: "Premium Plan Active",
                message: validUntil
                    ? `Maximum exposure benefits active • Valid until ${validUntil}.`
                    : "Maximum exposure benefits are active.",
                buttonLabel: "Manage Subscription",
                icon: "diamond-outline",
                background: ["#F0E3FF", "#DFC5FF"],
            };
        }

        if (access.effectivePlan === SubscriptionPlan.GROWTH) {
            return {
                title: "Growth Plan Active",
                message: validUntil
                    ? `Growth benefits active • Valid until ${validUntil}.`
                    : "Your Growth benefits are active.",
                buttonLabel: "Manage Subscription",
                icon: "rocket-outline",
                background: ["#E6F4FF", "#D5EAFF"],
            };
        }

        return {
            title: "Basic Plan Active",
            message: validUntil
                ? `Essential business features active • Valid until ${validUntil}.`
                : "Essential business features are active.",
            buttonLabel: "Manage Subscription",
            icon: "checkmark-circle-outline",
            background: ["#E7F7ED", "#D5F0DF"],
        };
    }

    return {
        title: "Subscription",
        message: "View your current plan and subscription details.",
        buttonLabel: "View Subscription",
        icon: "card-outline",
        background: ["#F4E4FA", "#EAD2F5"],
    };
};

const SubscriptionStatusBanner = ({
    access,
    onPress,
}: {
    access: SubscriptionAccessState;
    onPress: () => void;
}) => {
    const config = getSubscriptionBannerConfig(access);

    return (
        <LinearGradient
            colors={config.background}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.subscriptionBanner}
        >
            <View style={styles.subscriptionBannerIcon}>
                <Ionicons
                    name={config.icon}
                    size={22}
                    color="#7D0C72"
                />
            </View>

            <View style={styles.subscriptionBannerContent}>
                <Text style={styles.subscriptionBannerTitle}>
                    {config.title}
                </Text>

                <Text style={styles.subscriptionBannerMessage}>
                    {config.message}
                </Text>

                <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.subscriptionBannerButton}
                    onPress={onPress}
                >
                    <Text style={styles.subscriptionBannerButtonText}>
                        {config.buttonLabel}
                    </Text>

                    <Ionicons
                        name="arrow-forward"
                        size={14}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
};

const StatBox = ({
    icon,
    value,
    label,
    accent,
    onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    value: number;
    label: string;
    accent: string;
    onPress: () => void;
}) => (
    <TouchableOpacity style={styles.statBox} activeOpacity={0.85} onPress={onPress}>
        <View style={[styles.statIconWrap, { backgroundColor: accent }]}>
            <Ionicons name={icon} size={16} color="#fff" />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
);

const AnalyticsCard = ({
    icon,
    accent,
    title,
    value,
    emptyLabel,
    subtitle,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    title: string;
    value?: string;
    emptyLabel?: string;
    subtitle?: string;
}) => (
    <View style={styles.analyticsCard}>
        <View style={[styles.analyticsIconWrap, { backgroundColor: `${accent}22` }]}>
            <Ionicons name={icon} size={16} color={accent} />
        </View>
        <Text style={styles.analyticsTitle}>{title}</Text>
        {value ? (
            <>
                <Text style={styles.analyticsValue}>{value}</Text>
                {subtitle ? <Text style={styles.analyticsSubtitle}>{subtitle}</Text> : null}
            </>
        ) : (
            <Text style={styles.analyticsEmpty}>{emptyLabel}</Text>
        )}
    </View>
);

const InsightPill = ({
    icon,
    value,
    label,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    value: string | number;
    label: string;
}) => (
    <View style={styles.insightPill}>
        <Ionicons name={icon} size={16} color="#7D0C72" />
        <Text style={styles.insightValue}>{value}</Text>
        <Text style={styles.insightLabel}>{label}</Text>
    </View>
);

const SkeletonBlock = ({ height, width = "100%" as any }: { height: number; width?: any }) => (
    <View style={[styles.skeleton, { height, width }]} />
);

const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
    labelColor: () => "#8A7A93",
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#fff" },
    propsForBackgroundLines: { stroke: "#F0E6F3" },
    style: { borderRadius: 16 },
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#FBF4F8" },

    // Full-screen initial loader
    fullScreenLoader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    fullScreenLoaderText: {
        marginTop: 14,
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
    },

    // Header
    header: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        ...cardShadow(0.18),
    },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
},

headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
},

    profileContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 22,
    },
    profileDetails: { flexDirection: "row", alignItems: "center" },
    avatarRing: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.6)",
        padding: 2,
    },
    avatarImage: { width: "100%", height: "100%", borderRadius: 24 },
    avatarFallback: {
        width: "100%",
        height: "100%",
        borderRadius: 24,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInitials: { color: "#fff", fontWeight: "700", fontSize: 16 },
    welcomeText: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
    username: { fontSize: 19, fontWeight: "800", color: "#fff", marginTop: 2 },
    notificationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center",
        alignItems: "center",
    },
    notificationDot: {
        position: "absolute",
        top: 9,
        right: 10,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FF5D5D",
        borderWidth: 1.5,
        borderColor: "#5E0A55",
    },

    // Stats
    statsContainer: { flexDirection: "row", paddingRight: 5 },
    statBox: {
        width: 84,
        alignItems: "center",
        paddingVertical: 16,
        marginHorizontal: 5,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.12)",
    },
    statIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    statValue: { fontSize: 20, fontWeight: "800", color: "#fff" },
    statLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: "500" },

    // Error banner
    errorBanner: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FDEBEF",
        marginHorizontal: 20,
        marginTop: 16,
        padding: 12,
        borderRadius: 14,
    },
    errorBannerText: { flex: 1, marginLeft: 8, color: "#E4405F", fontWeight: "600", fontSize: 13 },
    retryButton: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#E4405F", borderRadius: 10 },
    retryButtonText: { color: "#fff", fontSize: 12, fontWeight: "700" },

    // Subscription status
subscriptionSection: {
    paddingHorizontal: 20,
    marginTop: 18,
},

subscriptionSkeleton: {
    height: 126,
    borderRadius: 20,
    backgroundColor: "#EFE1F0",
},

subscriptionBanner: {
    flexDirection: "row",
    borderRadius: 20,
    padding: 17,
    ...cardShadow(0.07),
},

subscriptionBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.75)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
},

subscriptionBannerContent: {
    flex: 1,
},

subscriptionBannerTitle: {
    color: "#2B1730",
    fontSize: 16,
    fontWeight: "800",
},

subscriptionBannerMessage: {
    color: "#6D5A72",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
},

subscriptionBannerButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#7D0C72",
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 8,
    marginTop: 12,
},

subscriptionBannerButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
},

subscriptionLoadError: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E8D7E7",
},

subscriptionLoadErrorText: {
    flex: 1,
    marginLeft: 8,
    color: "#7D0C72",
    fontSize: 12,
    fontWeight: "600",
},

// Marketing & Campaigns
marketingSection: {
    paddingHorizontal: 20,
    marginTop: 16,
},

marketingCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    padding: 18,
    minHeight: 205,
    ...cardShadow(0.16),
},

marketingGlowOne: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -65,
    right: -35,
},

marketingGlowTwo: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -55,
    left: -25,
},

marketingCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
},

marketingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
},

marketingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F8EAF8",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
},

marketingBadgeText: {
    color: "#7D0C72",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
},

marketingContent: {
    marginTop: 16,
    paddingRight: 6,
},

marketingEyebrow: {
    color: "#EFCBF0",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
},

marketingTitle: {
    color: "#FFFFFF",
    fontSize: screenWidth < 360 ? 18 : 20,
    fontWeight: "800",
    marginTop: 3,
},

marketingDescription: {
    color: "rgba(255,255,255,0.76)",
    fontSize: screenWidth < 360 ? 11 : 12,
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 390,
},

marketingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
},

marketingFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
},

marketingFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
},

marketingFeatureText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: screenWidth < 360 ? 9 : 10,
    fontWeight: "600",
},

marketingFeatureDivider: {
    width: 1,
    height: 15,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: screenWidth < 360 ? 7 : 10,
},

marketingOpenButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: screenWidth < 360 ? 10 : 13,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 8,
},

marketingOpenButtonText: {
    color: "#7D0C72",
    fontSize: 11,
    fontWeight: "800",
},
    // Sections
    sectionContainer: { paddingHorizontal: 20, marginTop: 24 },
    statisticsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 14,
    },
    sectionTitle: { fontSize: 17, fontWeight: "800", color: "#2B1730" },
    sectionSubtitle: { fontSize: 12, color: "#9A8AA0", marginTop: 2, marginBottom: 14 },

    legendPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        ...cardShadow(0.06),
    },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
    legendLabel: { fontSize: 11, color: "#5B4B60", fontWeight: "600" },

    // Chart
    chartCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: "center",
        ...cardShadow(0.06),
    },
    chart: { borderRadius: 16 },
    emptyState: { paddingVertical: 40, alignItems: "center" },
    emptyStateText: { color: "#9A8AA0", marginTop: 8, fontSize: 13, fontWeight: "500" },

    // Revenue overview
    revenueCard: {
        borderRadius: 22,
        padding: 20,
        ...cardShadow(0.18),
    },
    revenueLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "600" },
    revenueValue: { color: "#fff", fontSize: 30, fontWeight: "800", marginTop: 4 },
    revenueDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 16 },
    revenueMonthRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    revenueSubLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },
    revenueMonthValue: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 2 },
    trendPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.18)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    trendPillText: { color: "#fff", fontSize: 12, fontWeight: "700" },

    // Analytics grid
    analyticsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    analyticsCard: {
        width: "48%",
        backgroundColor: "#fff",
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        ...cardShadow(0.05),
    },
    analyticsIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 10,
    },
    analyticsTitle: { fontSize: 12, color: "#9A8AA0", fontWeight: "600" },
    analyticsValue: { fontSize: 20, fontWeight: "800", color: "#2B1730", marginTop: 4 },
    analyticsSubtitle: { fontSize: 11, color: "#9A8AA0", marginTop: 2 },
    analyticsEmpty: { fontSize: 13, color: "#B7A6BD", marginTop: 10, fontWeight: "600" },

    // Popular package
    popularCard: {
        flexDirection: "row",
        alignItems: "center",
        borderRadius: 20,
        padding: 18,
        ...cardShadow(0.06),
    },
    popularIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#fff",
        justifyContent: "center",
        alignItems: "center",
    },
    popularEyebrow: { fontSize: 11, color: "#7D0C72", fontWeight: "700", textTransform: "uppercase" },
    popularName: { fontSize: 17, fontWeight: "800", color: "#2B1730", marginTop: 2 },
    popularCount: { fontSize: 12, color: "#5B4B60", marginTop: 2, fontWeight: "600" },

    // Monthly revenue
    monthlyRevenueCard: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 18,
        ...cardShadow(0.05),
    },
    monthlyRevenueMonth: { fontSize: 12, color: "#9A8AA0", fontWeight: "600" },
    monthlyRevenueValue: { fontSize: 26, fontWeight: "800", color: "#2B1730", marginTop: 4 },
    monthlyRevenueChange: { fontSize: 12, fontWeight: "700", marginTop: 4 },
    sparklineRow: {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        height: 60,
        marginTop: 18,
    },
    sparklineBarWrap: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" },
    sparklineBar: { width: 10, borderRadius: 5, backgroundColor: "#8641F4", minHeight: 4 },
    sparklineLabel: { fontSize: 9, color: "#9A8AA0", marginTop: 4, fontWeight: "600" },

    // Customer insights
    insightsRow: { flexDirection: "row", justifyContent: "space-between" },
    insightPill: {
        flex: 1,
        backgroundColor: "#fff",
        borderRadius: 16,
        alignItems: "center",
        paddingVertical: 16,
        marginHorizontal: 4,
        ...cardShadow(0.04),
    },
    insightValue: { fontSize: 18, fontWeight: "800", color: "#2B1730", marginTop: 6 },
    insightLabel: { fontSize: 11, color: "#9A8AA0", marginTop: 2, fontWeight: "600" },

    // Skeleton
    skeleton: { backgroundColor: "#EFE1F0", borderRadius: 18 },

    // Packages
    packageSectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
        gap: 12,
    },
    packageSectionHeaderText: {
        flex: 1,
    },
    addPackageButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: "#7B2869",
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
    },
    addPackageButtonDisabled: {
    backgroundColor: "#E8DFE5",
    opacity: 0.8,
},
    addPackageButtonText: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "700",
    },
    addPackageButtonTextDisabled: {
    color: "#9F8C9B",
},
    packageContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
    viewAllPackagesButton: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#E6CFE1",
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
},

viewAllPackagesText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7D0C72",
},
    packageBox: {
        width: "48%",
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        ...cardShadow(0.04),
    },
    packageIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 8,
    },
    packageValue: { fontSize: 14, fontWeight: "800", color: "#2B1730" },
    packageLabel: { fontSize: 11, fontWeight: "600", marginTop: 1 },
    detailsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10,
        alignSelf: "flex-start",
    },
    detailsText: { fontSize: 12, fontWeight: "700", marginRight: 2 },
    emptyPackages: {
        backgroundColor: "#fff",
        borderRadius: 16,
        paddingVertical: 30,
        alignItems: "center",
        ...cardShadow(0.04),
    },

    // CTA
    vendorProfileButton: {
        flexDirection: "row",
        gap: 8,
        backgroundColor: "#7D0C72",
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 20,
        marginTop: 26,
        ...cardShadow(0.15),
    },
    vendorProfileButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

function cardShadow(opacity: number) {
    return Platform.select({
        ios: {
            shadowColor: "#3A0A34",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: opacity,
            shadowRadius: 12,
        },
        android: {
            elevation: opacity * 20,
        },
        default: {},
    }) as object;
}

export default DashboardScreen;