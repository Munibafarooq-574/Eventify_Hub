import getOrderStatsMonthly from "@/services/getOrderStatsMonthly";
import getVendorOrderStats from "@/services/getVendorOrderStats";
import { getSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    Image,
    Platform,
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

type OrderStats = { totalOrders: number; processing: number; completed: number };

const DashboardScreen = () => {
    const insets = useSafeAreaInsets();

    const [username, setUsername] = useState<string>("");
    const [vendorId, setVendorId] = useState<string | null>(null);
    const [orderStats, setOrderStats] = useState<OrderStats>({
        totalOrders: 0,
        processing: 0,
        completed: 0,
    });
    const [orderCountArray, setOrderCountArray] = useState<number[]>([]);
    const [orderAmountArray, setOrderAmountArray] = useState<number[]>([]);
    const [monthNameArray, setMonthNameArray] = useState<string[]>([]);
    const [avatar, setAvatar] = useState<string>("");
    const [packages, setPackages] = useState<any[]>([]);
    const [hasNotifications, setHasNotifications] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(true);

    const monthNames = [
        "", "Jan", "Feb", "Mar", "Apr", "May",
        "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec",
    ];

    useEffect(() => {
        fetchUsername();
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userRaw = await getSecureData("user");
                const user = JSON.parse(userRaw || "");
                if (!user) throw "user not found";

                setPackages(user.packages || []);

                const statsData = await getVendorOrderStats("Vendor", user._id);
                setOrderStats(statsData);

                const response = await getOrderStatsMonthly(user._id);
                setOrderAmountArray(response.map((item: any) => item.totalAmount));
                setOrderCountArray(response.map((item: any) => item.orderCount));
                setMonthNameArray(
                    response.map((item: any) => monthNames[item.month])
                );
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchUsername = async () => {
        const storedUser = await getSecureData("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setAvatar(user?.contactDetails?.brandLogo || "");
            setUsername(user.name);
            setVendorId(user._id);
        } else {
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

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
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

                        <TouchableOpacity
                            style={styles.notificationIcon}
                            activeOpacity={0.7}
                            onPress={() => router.push("/vendornotifications")}
                        >
                            <Ionicons name="notifications-outline" size={22} color="#fff" />
                            {hasNotifications && <View style={styles.notificationDot} />}
                        </TouchableOpacity>
                    </View>

                    {/* ---------- Stats ---------- */}
                    <View style={styles.statsContainer}>
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
                            value={orderStats.processing}
                            label="Processing"
                            accent="#F0A868"
                            onPress={() =>
                                router.push({
                                    pathname: "/vendorordersummary",
                                    params: { selectedTab: "Pending" },
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
                    </View>
                </LinearGradient>

                {/* ---------- Sales Statistics ---------- */}
                <View style={styles.sectionContainer}>
                    <View style={styles.statisticsHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Sales Statistics</Text>
                            <Text style={styles.sectionSubtitle}>Last 6 months performance</Text>
                        </View>
                        <View style={styles.legendPill}>
                            <View style={[styles.legendDot, { backgroundColor: "#8641F4" }]} />
                            <Text style={styles.legendLabel}>Amount</Text>
                            <View style={[styles.legendDot, { backgroundColor: "#E4405F", marginLeft: 10 }]} />
                            <Text style={styles.legendLabel}>Orders</Text>
                        </View>
                    </View>

                    <View style={styles.chartCard}>
                        {hasChartData ? (
                            <LineChart
                                data={{
                                    labels: monthNameArray,
                                    datasets: [
                                        { data: orderAmountArray, color: () => "#8641F4", strokeWidth: 3 },
                                        { data: orderCountArray, color: () => "#E4405F", strokeWidth: 3 },
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
                        ) : (
                            <View style={styles.emptyState}>
                                <Ionicons name="bar-chart-outline" size={30} color="#C9AFCF" />
                                <Text style={styles.emptyStateText}>
                                    {loading ? "Loading your sales data…" : "No sales data yet this period"}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* ---------- Packages ---------- */}
                <View style={styles.sectionContainer}>
                    <View style={styles.statisticsHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>Current Packages</Text>
                            <Text style={styles.sectionSubtitle}>Your active subscription plans</Text>
                        </View>
                    </View>

                    {packages.length > 0 ? (
                        <View style={styles.packageContainer}>
                            {packages.map((pkg: any, index) => {
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

    // Header
    header: {
        paddingHorizontal: 20,
        paddingBottom: 24,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        ...cardShadow(0.18),
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
    statsContainer: { flexDirection: "row", justifyContent: "space-between" },
    statBox: {
        flex: 1,
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

    // Sections
    sectionContainer: { paddingHorizontal: 20, marginTop: 24 },
    statisticsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 14,
    },
    sectionTitle: { fontSize: 17, fontWeight: "800", color: "#2B1730" },
    sectionSubtitle: { fontSize: 12, color: "#9A8AA0", marginTop: 2 },

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

    // Packages
    packageContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
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