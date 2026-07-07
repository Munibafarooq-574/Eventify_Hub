// export default DashboardScreen;
import getOrderStatsMonthly from "@/services/getOrderStatsMonthly";
import getVendorOrderStats from "@/services/getVendorOrderStats";
import { getSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LineChart } from "react-native-chart-kit";
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";

const screenWidth = Dimensions.get("window").width;

const packages = [
    { value: "1", color: "#7D0C72" },
    { value: "2", color: "#B0B0B0" },
    { value: "3", color: "#FFD700" },
];

const DashboardScreen = () => {
    const [username, setUsername] = useState<string>("");
    const [vendorId, setVendorId] = useState<string | null>(null);
    const [orderStats, setOrderStats] = useState({ totalOrders: 0, processing: 0, completed: 0 });
    const [orderCountArray, setOrderCountArray] = useState([]);
    const [orderAmountArray, setOrderAmountArray] = useState([]);
    const [monthNameArray, setMonthNameArray] = useState([]);
    const [avatar, setAvatar] = useState<string>("");
    const [packages, setPackages] = useState([]);
    const monthNames = [
        '', 'Jan', 'Feb', 'Mar', 'Apr', 'May',
        'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'
    ];

    useEffect(() => {
        fetchUsername();
    }, []);

    useEffect(() => {
        // Fetch orders and stats on component mount
        const fetchData = async () => {
            try {
                const user = JSON.parse(await getSecureData("user") || "");
                if (!user) {
                    throw "user not found";
                }
                setPackages(user.packages || []);
                const statsData = await getVendorOrderStats("Vendor", user._id);  // Fetch order stats
                setOrderStats(statsData);
                const response = await getOrderStatsMonthly(user._id);
                const totalAmountArray = response.map((item: any) => item.totalAmount);
                const orderCountArray = response.map((item: any) => item.orderCount);
                const monthArray = response.map((item: any) => item.month);
                const monthNameArray = monthArray.map((month: any) => monthNames[month]);
                setMonthNameArray(monthNameArray);
                setOrderCountArray(orderCountArray);
                setOrderAmountArray(totalAmountArray);

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    const fetchUsername = async () => {
        const storedUser = await getSecureData("user");
        if (storedUser) {
            const user = JSON.parse(storedUser);
            setAvatar(user.contactDetails.brandLogo);
            setUsername(user.name);
            setVendorId(user._id);
        } else {
            setUsername("Guest");
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <View style={styles.profileContainer}>
                        <View style={styles.profileDetails}>
                            <Image
                                source={{ uri: avatar }}
                                style={{ width: 50, height: 50 }}
                            />
                            <Text style={styles.welcomeText}>Welcome , </Text>
                            <Text style={styles.username}>{username}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.notificationIcon}
                            onPress={() => router.push('/vendornotifications')}
                        >
                            <Ionicons name="notifications" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.statsContainer}>
                        <TouchableOpacity
                            style={[styles.statBox, styles.ordersBox]}
                            onPress={() => router.push({ pathname: "/vendorordersummary", params: { selectedTab: "All" } })}
                        >
                            <Text style={styles.statValue}>{orderStats.totalOrders}</Text>
                            <Text style={styles.statLabel}>Orders</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.statBox, styles.pendingBox]}
                            onPress={() => router.push({ pathname: "/vendorordersummary", params: { selectedTab: "Pending" } })}
                        >
                            <Text style={styles.statValue}>{orderStats.processing}</Text>
                            <Text style={styles.statLabel}>Processing</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.statBox, styles.completedBox]}
                            onPress={() => router.push({ pathname: "/vendorordersummary", params: { selectedTab: "Completed" } })}
                        >
                            <Text style={styles.statValue}>{orderStats.completed}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.sectionContainer}>
                    <View style={styles.statisticsHeader}>
                        <Text style={styles.sectionTitle}>Sales Statistics</Text>
                        {/* <TouchableOpacity style={styles.dropdownButton}>
                            <Text style={styles.dropdownText}>This Week</Text>
                        </TouchableOpacity> */}
                    </View>
                    {
                        monthNameArray.length > 0 && orderAmountArray.length > 0 && orderCountArray.length > 0
                            ?
                            < LineChart
                                data={{
                                    labels: monthNameArray,
                                    datasets: [
                                        {
                                            data: orderAmountArray,
                                            color: () => `purple`,
                                            strokeWidth: 2,
                                        },
                                        {
                                            data: orderCountArray,
                                            color: () => `red`,
                                            strokeWidth: 2,
                                        },
                                    ],
                                    legend: ["Amount", "Orders"],
                                }}
                                width={screenWidth - 32}
                                height={220}
                                chartConfig={chartConfig}
                                bezier
                                style={styles.chart}
                            />
                            :
                            <></>
                    }

                </View>

                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Current Packages</Text>
                    <View style={styles.packageContainer}>
                        {packages.map((pkg: any, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.packageBox, { backgroundColor: "#B0B0B0" }]}
                                onPress={() => {
                                    router.push({
                                        pathname: '/vendorpackages',
                                        params: { packageId: pkg._id },
                                    });
                                }}
                            >
                                {/* <Text style={styles.packageValue}>{pkg.packageName}</Text>
                                <Text style={styles.packageLabel}>Package</Text>
                                <TouchableOpacity
                                    style={styles.detailsButton}
                                    onPress={() => {
                                        router.push({
                                            pathname: '/vendorpackages',
                                            params: { packageId: pkg._id },
                                        });
                                    }}
                                >
                                    <Text style={styles.detailsText}>Details</Text>
                                </TouchableOpacity> */}
                                <View style={styles.packageContent}>
                                    <Text style={styles.packageValue}>{pkg.packageName}</Text>
                                    <Text style={styles.packageLabel}>Package</Text>
                                    <TouchableOpacity
                                        style={styles.detailsButton}
                                        onPress={() => {
                                            router.push({
                                                pathname: '/vendorpackages',
                                                params: { packageId: pkg._id },
                                            });
                                        }}
                                    >
                                        <Text style={styles.detailsText}>Details</Text>
                                    </TouchableOpacity>
                                </View>

                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.vendorProfileButton}
                    onPress={() => {
                        if (vendorId) {
                            router.push({
                                pathname: '/VPD',
                                params: { id: vendorId },
                            });
                        } else {
                            Alert.alert("Error", "Vendor ID not found.");
                        }
                    }}
                >
                    <Text style={styles.vendorProfileButtonText}>View Vendor Profile</Text>
                </TouchableOpacity>
            </ScrollView>
            <BottomNavigationFinal />
        </View>
    );
};

const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#f9f0f9",
    backgroundGradientTo: "#f2f2f2",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
    style: {
        borderRadius: 16,
    },
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8E9F0', paddingTop: 50, },
    header: { padding: 20 },
    profileContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    profileDetails: {
        flexDirection: "row",
        alignItems: "center",
    },
    profileImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 10,
    },
    username: {
        fontSize: 18,
        fontWeight: "bold",
    },
    notificationIcon: {
        padding: 8,
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginHorizontal: 10,
    },
    statBox: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 10,
        marginHorizontal: 5,
        borderRadius: 10,
    },
    ordersBox: {
        backgroundColor: "#D6A7E3",
    },
    pendingBox: {
        backgroundColor: "#EFCAB8",
    },
    processBox: {
        backgroundColor: "#F6A6A2",
    },
    completedBox: {
        backgroundColor: "#98FB98",
    },
    statValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: "black",
    },
    statLabel: {
        fontSize: 14,
        color: "#333",
    },
    sectionContainer: { paddingHorizontal: 16, marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
    dropdownButton: { backgroundColor: "#7D0C72", borderRadius: 20, padding: 10, alignSelf: "flex-end" },
    dropdownText: { color: "#fff", fontSize: 14 },
    chart: { borderRadius: 16 },
    packageContainer: { flexDirection: "row", justifyContent: "space-between" },
    packageBox: { width: "30%", padding: 10, borderRadius: 10, alignItems: "center" },
    packageValue: { fontSize: 12, fontWeight: "bold" },
    packageLabel: { fontSize: 14 },
    detailsButton: { marginTop: 5, backgroundColor: "#fff", borderRadius: 5, padding: 5 },
    detailsText: { color: "#000" },
    vendorProfileButton: {
        backgroundColor: '#7D0C72',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 10,
    },
    vendorProfileButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    bottomNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 80,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        position: 'absolute',
        bottom: 0,
        width: '100%',
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        backgroundColor: '#780C60',
        width: 30,
        height: 30,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    iconImage: {
        width: 37,
        height: 37,
        marginBottom: 5,
    },
    navText: {
        fontSize: 10,
        color: '#000000',
    },
    homeButton: {
        transform: [{ translateY: -10 }],
    },
    homeButtonIconContainer: {
        backgroundColor: '#780C60',
        width: 55,
        height: 55,
        borderRadius: 27.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
    statisticsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    welcomeText: {
        fontSize: 20,
        // fontWeight: '500',
        color: '#000',
        paddingLeft: 10,
        fontWeight: "bold",
    },
    packageContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },


});

export default DashboardScreen;
