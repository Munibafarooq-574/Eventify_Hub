import createConversation from "@/services/createConversation";
import getVendorOrderStats from "@/services/getVendorOrderStats";
import getVendorOrders from "@/services/getVendorOrders";
import patchUpdateOrderStatus from "@/services/patchUpdateOrderStatus";
import { getSecureData, saveSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, FlatList, Platform, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";

// Order interface
interface Order {
    id: string;
    event: string;
    name: string;
    date: string;
    package: string;
    price: string;
    status: "Processing" | "Completed";
}

const { width } = Dimensions.get('window');

// Same theme as MyEventsScreen
const PRIMARY = "#780C60";
const PRIMARY_LIGHT = "#F8E9F0";
const ACCENT = "#B84B9A";

   const getCardColor = (label: string) => {
    switch (label) {
        case "Orders":
            return "#C79AE8";
        case "Processing":
            return "#4A84BD";
        case "Completed":
            return "#63BE63";
        default:
            return PRIMARY;
    }
};

const OrderSummary = () => {
    const { selectedTab } = useLocalSearchParams(); // Read tab from navigation params
    const [selectedFilter, setSelectedFilter] = useState<"All" | "Processing" | "Completed">("All");
    const [orders, setOrders] = useState<any[]>([]);
    const [orderStats, setOrderStats] = useState({ totalOrders: 0, processing: 0, completed: 0 });

    useEffect(() => {
        // Fetch orders and stats on component mount
        const fetchData = async () => {
            try {
                const user = JSON.parse(await getSecureData("user") || "");
                if (!user) {
                    throw "user not found";
                }
                const ordersData = await getVendorOrders("Vendor", user._id);  // Fetch all orders
                const statsData = await getVendorOrderStats("Vendor", user._id);  // Fetch order stats
                console.log(ordersData);
                setOrders(ordersData);
                setOrderStats(statsData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Processing": return "#337AB7";
            case "Completed": return "#5CB85C";
            default: return "#999";
        }
    };

    const filteredOrders = selectedFilter === "All" ? orders : orders.filter(order => order.status !== "cancelled");

    const handleDelete = async (id: string) => {
        await patchUpdateOrderStatus(id, "cancelled");
        setOrders(prevOrders => prevOrders.filter(order => order.orderId !== id));
        alert("Order Cancelled");
    };

    const mark = async (id: string, status: "completed" | "pending" | "confirmed" | "cancelled") => {
        console.log(id);
        await patchUpdateOrderStatus(id, status);
        setOrders(prevOrders =>
            prevOrders.map(order => order.orderId === id ? { ...order, status: status } : order)
        );
        alert("Order Updated");
    };

    // Handler for summary card clicks
    const handleSummaryCardClick = (filterType: "All" | "Processing" | "Completed") => {
        setSelectedFilter(filterType);
    };

    // Create or get existing conversation/chat
    const handleMessageButtonClick = async (vendorId: string) => {
        try {
            const user = JSON.parse(await getSecureData("user") || "");
            if (!user) {
                throw "User not found";
            }

            // Call backend to check for an existing conversation or create a new one
            const { chatId } = await createConversation(user._id, vendorId);
            await saveSecureData("chatId", chatId);
            await saveSecureData("receiverId", vendorId);
            router.push(`/message`);
            // Navigate to the conversation screen
            // router.push(`/conversation/${chatId}`);
        } catch (error) {
            console.error('Error initiating conversation:', error);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/vendordashboard')}>
                        <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.headerTitleWrap}>
                        <Text style={styles.title}>Order Summary</Text>
                        <Text style={styles.headerSubtitle}>
                            {orderStats.totalOrders} total {orderStats.totalOrders === 1 ? "order" : "orders"}
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/vendornotifications')}>
                        <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                </View>

                {/* Order Status Summary */}
                <View style={styles.summaryContainer}>
                    <TouchableOpacity
                        style={styles.summaryCardWrapper}
                        onPress={() => handleSummaryCardClick("All")}
                        activeOpacity={0.7}
                    >
                        <SummaryCard
                            label="Orders"
                            value={orderStats.totalOrders}
                            icon="cart-outline"
                            isActive={selectedFilter === "All"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.summaryCardWrapper}
                        onPress={() => handleSummaryCardClick("Processing")}
                        activeOpacity={0.7}
                    >
                        <SummaryCard
                            label="Processing"
                            value={orderStats.processing}
                            icon="hourglass-outline"
                            isActive={selectedFilter === "Processing"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.summaryCardWrapper}
                        onPress={() => handleSummaryCardClick("Completed")}
                        activeOpacity={0.7}
                    >
                        <SummaryCard
                            label="Completed"
                            value={orderStats.completed}
                            icon="checkmark-done-outline"
                            isActive={selectedFilter === "Completed"}
                        />
                    </TouchableOpacity>
                </View>

                {/* Orders List */}
                <FlatList
                    style={styles.ordersList}
                    contentContainerStyle={styles.ordersListContent}
                    data={filteredOrders}
                    keyExtractor={(item) => item._id}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <Text style={styles.sectionTitle}>
                            {selectedFilter === "All" ? "All Orders" : `${selectedFilter} Orders`}
                        </Text>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconCircle}>
                                <Ionicons name="receipt-outline" size={34} color={PRIMARY} />
                            </View>
                            <Text style={styles.emptyTitle}>No orders found</Text>
                            <Text style={styles.emptySubtitle}>
                                Orders matching this filter will show up here
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View key={item._id} style={styles.orderCard}>
                            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                            <View style={styles.orderInfo}>
                                <View style={styles.orderCardHeader}>
                                    <View style={styles.eventIconWrap}>
                                        <Ionicons name="calendar" size={18} color={PRIMARY} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.eventTitle} numberOfLines={1}>{item.eventName}</Text>
                                        <Text style={styles.orderName}>{item.organizerId.name}</Text>
                                    </View>
                                    <View style={styles.statusBadge}>
                                        <Text style={styles.statusBadgeText}>{item.status}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailsBlock}>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="calendar-outline" size={14} color="#8A8A8A" />
                                        <Text style={styles.detailText}>{new Date(item.eventDate).toDateString()}</Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="pricetags-outline" size={14} color="#8A8A8A" />
                                        <Text style={styles.detailText} numberOfLines={1}>
                                            {item.vendorOrders.map((orderName: any) => orderName.serviceName).join(", ")}
                                        </Text>
                                    </View>
                                    <View style={styles.detailRow}>
                                        <Ionicons name="cash-outline" size={14} color="#8A8A8A" />
                                        <Text style={styles.detailText}>Rs. {item.totalAmount}</Text>
                                    </View>
                                </View>

                                <View style={styles.actionButtons}>
                                    {
                                        item.status !== "cancelled"
                                            ?
                                            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id)}>
                                                <Ionicons name="close-circle-outline" size={14} color="#fff" />
                                                <Text style={styles.buttonText}>Delete</Text>
                                            </TouchableOpacity>
                                            :
                                            <></>
                                    }

                                    {
                                        item.status !== "completed" && item.status !== "cancelled"
                                            ?
                                            item.status === "pending"
                                                ?
                                                <TouchableOpacity style={styles.completeButton} onPress={() => mark(item._id, "confirmed")}>
                                                    <Ionicons name="time-outline" size={14} color="#fff" />
                                                    <Text style={styles.buttonText}>Mark Processing</Text>
                                                </TouchableOpacity>
                                                :
                                                <TouchableOpacity style={styles.completeButton} onPress={() => mark(item._id, "completed")}>
                                                    <Ionicons name="checkmark-outline" size={14} color="#fff" />
                                                    <Text style={styles.buttonText}>Mark Completed</Text>
                                                </TouchableOpacity>
                                            :
                                            <></>
                                    }

                                    <TouchableOpacity style={styles.messageButton} onPress={() => handleMessageButtonClick(item.organizerId._id)}>
                                        <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
                                        <Text style={styles.buttonText}>Message</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                />
            </View>
            <BottomNavigationFinal />
        </SafeAreaView>
    );
};

const SummaryCard = ({
    label,
    value,
    icon,
    isActive = false
}: {
    label: string,
    value: number,
    icon: keyof typeof Ionicons.glyphMap,
    isActive?: boolean
}) => (
    <View
    style={[
        styles.summaryCard,
        {
            backgroundColor: getCardColor(label),
            borderColor: getCardColor(label),
        },
        isActive && {
            transform: [{ scale: 1.05 }],
        },
    ]}
>
        <View style={styles.summaryIconWrap}>
            <Ionicons name={icon} size={20} color={isActive ? PRIMARY : "#FFFFFF"} />
        </View>
        <Text style={[styles.summaryValue, isActive && styles.summaryValueActive]}>{value}</Text>
        <Text style={[styles.summaryLabel, isActive && styles.summaryLabelActive]}>{label}</Text>
        {isActive && <View style={styles.activeIndicator} />}
    </View>
);

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: PRIMARY,
    },
    container: {
    flex: 1,
    backgroundColor: PRIMARY_LIGHT,
    paddingBottom: 80,
},
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: PRIMARY,
        paddingHorizontal: 18,
        paddingTop: Platform.OS === "ios" ? 16 : 30,
        paddingBottom: 22,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 26,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: 18,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.15)",
        justifyContent: "center",
        alignItems: "center",
    },
    notificationDot: {
        position: "absolute",
        top: 8,
        right: 9,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FF5A5F",
        borderWidth: 1.5,
        borderColor: PRIMARY,
    },
    headerTitleWrap: {
        alignItems: "center",
    },
    title: {
        fontSize: 19,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    headerSubtitle: {
        fontSize: 12,
        color: "rgba(255,255,255,0.75)",
        marginTop: 2,
    },
    summaryContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 18,
        paddingHorizontal: 15,
    },
    summaryCardWrapper: {
        flex: 1,
        marginHorizontal: 5,
    },
    summaryCard: {
        padding: 14,
        borderRadius: 16,
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#F0DDEA",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    /*activeSummaryCard: {
        backgroundColor: PRIMARY,
        borderColor: PRIMARY,
        transform: [{ scale: 1.04 }],
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },*/
    summaryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
},
    activeIndicator: {
    position: "absolute",
    bottom: -1,
    height: 4,
    width: "38%",
    backgroundColor: "#FFF",
    borderRadius: 5,
},
    summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
},
    summaryValueActive: {
        color: "#FFFFFF",
    },
    
    summaryLabel: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    marginTop: 3,
},

    summaryLabelActive: {
        color: "rgba(255,255,255,0.85)",
    },
    ordersList: {
        flex: 1,
    },
    ordersListContent: {
        paddingBottom: 30,
        paddingHorizontal: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "800",
        color: "#1A1A1A",
        marginBottom: 12,
    },
    orderCard: {
        flexDirection: "row",
        backgroundColor: "white",
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
    },
    statusIndicator: {
        width: 4,
        alignSelf: "stretch",
        borderRadius: 4,
        marginRight: 12,
    },
    orderInfo: {
        flex: 1
    },
    orderCardHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },
    eventIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: "#1A1A1A",
    },
    orderName: {
        fontSize: 12,
        color: "#8A8A8A",
        marginTop: 1,
    },
    statusBadge: {
        backgroundColor: PRIMARY_LIGHT,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: PRIMARY,
        textTransform: "capitalize",
    },
    bold: {
        fontWeight: "bold"
    },
    detailsBlock: {
        backgroundColor: PRIMARY_LIGHT,
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
    },
    detailRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 4,
    },
    detailText: {
        marginLeft: 6,
        fontSize: 12,
        color: "#4A4A4A",
        flexShrink: 1,
    },
    actionButtons: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    deleteButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#D9534F",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
    },
    completeButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#337AB7",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
    },
    messageButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#5CB85C",
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
    },
    buttonText: {
        color: "white",
        fontSize: 11,
        fontWeight: "700",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 50,
        paddingHorizontal: 30,
    },
    emptyIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 14,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1A1A1A",
        marginBottom: 4,
    },
    emptySubtitle: {
        fontSize: 12,
        color: "#8A8A8A",
        textAlign: "center",
        lineHeight: 18,
    },
});

export default OrderSummary;