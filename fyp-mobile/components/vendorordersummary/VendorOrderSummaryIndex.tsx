import createConversation from "@/services/createConversation";
import getVendorOrderStats from "@/services/getVendorOrderStats";
import getVendorOrders from "@/services/getVendorOrders";
import patchUpdateOrderStatus from "@/services/patchUpdateOrderStatus";
import { getUserData, saveSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, FlatList, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";

// Order interface
interface Order {
    id: string;
    event: string;
    name: string;
    date: string;
    package: string;
    price: string;
    status: "Pending" | "Processing" | "Completed";
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
        case "Pending":
            return "#E8A23A"; // amber - order placed, not yet confirmed
        case "Processing":
            return "#4A84BD"; // blue - confirmed, work in progress
        case "Completed":
            return "#63BE63"; // green - done
        case "Cancelled":
            return "#D9534F"; // red - cancelled
        default:
            return PRIMARY;
    }
};

// Backend statuses mapped to UI filters:
// pending    -> "Pending"    (just placed, vendor hasn't confirmed yet)
// confirmed  -> "Processing" (vendor confirmed, work in progress)
// completed  -> "Completed"
// cancelled  -> excluded everywhere except explicitly shown
const PENDING_STATUS = "pending";
const PROCESSING_STATUS = "confirmed";
const COMPLETED_STATUS = "completed";
const CANCELLED_STATUS = "cancelled";

type FilterType = "All" | "Pending" | "Processing" | "Completed" | "Cancelled";

const OrderSummary = () => {
    const { selectedTab } = useLocalSearchParams(); // Read tab from navigation params
    const [selectedFilter, setSelectedFilter] = useState<FilterType>("All");
    const [orders, setOrders] = useState<any[]>([]);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

    useEffect(() => {
        // Fetch orders on mount. Stats are derived live from `orders` below,
        // so they always match the current list (no separate stale stats call needed).
        const fetchData = async () => {
            try {
                const user = await getUserData();
                if (!user) {
                    throw "user not found";
                }
                const ordersData = await getVendorOrders("Vendor", user._id); // Fetch all orders
                console.log(ordersData);
                setOrders(ordersData || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    // Live-computed stats: recalculates automatically whenever `orders` changes
    // (e.g. after Mark Processing / Mark Completed / Delete), so the numbers
    // on the summary cards increment/decrement instantly.
        const orderStats = useMemo(() => {
        const pending = orders.filter((o) => o.status === PENDING_STATUS).length;
        const processing = orders.filter((o) => o.status === PROCESSING_STATUS).length;
        const completed = orders.filter((o) => o.status === COMPLETED_STATUS).length;
        const cancelled = orders.filter((o) => o.status === CANCELLED_STATUS).length;
        return {
            totalOrders: orders.length, // matches dashboard's total (includes every status)
            pending,
            processing,
            completed,
            cancelled,
        };
    }, [orders]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending":
                return "#E8A23A";
            case "confirmed":
                return "#337AB7";
            case "completed":
                return "#5CB85C";
            case "cancelled":
                return "#D9534F";
            default:
                return "#999";
        }
    };

    // Filter respects the selected summary card:
    // - All -> everything except cancelled
    // - Pending -> newly placed orders only
    // - Processing -> confirmed orders only
    // - Completed -> completed orders only
        const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            if (selectedFilter === "All") return true;
            if (selectedFilter === "Pending") return order.status === PENDING_STATUS;
            if (selectedFilter === "Processing") return order.status === PROCESSING_STATUS;
            if (selectedFilter === "Completed") return order.status === COMPLETED_STATUS;
            if (selectedFilter === "Cancelled") return order.status === CANCELLED_STATUS;
            return true;
        });
    }, [orders, selectedFilter]);

    const handleDelete = async (id: string) => {
        await patchUpdateOrderStatus(id, "cancelled");
        setOrders(prevOrders => prevOrders.map(order => order._id === id ? { ...order, status: "cancelled" } : order));
        alert("Order Cancelled");
    };

    const mark = async (id: string, status: "completed" | "pending" | "confirmed" | "cancelled") => {
        console.log(id);
        await patchUpdateOrderStatus(id, status);
        setOrders(prevOrders =>
            prevOrders.map(order => order._id === id ? { ...order, status: status } : order)
        );
        alert("Order Updated");
    };

    // Handler for summary card clicks
    const handleSummaryCardClick = (filterType: FilterType) => {
        setSelectedFilter(filterType);
    };

    const toggleExpand = (id: string) => {
        setExpandedOrderId(prev => (prev === id ? null : id));
    };

    // Create or get existing conversation/chat
    const handleMessageButtonClick = async (vendorId: string) => {
        try {
            const user = await getUserData();
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
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.summaryScroll}
                    contentContainerStyle={styles.summaryContainer}
                >
                    <TouchableOpacity
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
                        onPress={() => handleSummaryCardClick("Pending")}
                        activeOpacity={0.7}
                    >
                        <SummaryCard
                            label="Pending"
                            value={orderStats.pending}
                            icon="time-outline"
                            isActive={selectedFilter === "Pending"}
                        />
                    </TouchableOpacity>

<TouchableOpacity
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

                    <TouchableOpacity
                        onPress={() => handleSummaryCardClick("Cancelled")}
                        activeOpacity={0.7}
                    >
                        <SummaryCard
                            label="Cancelled"
                            value={orderStats.cancelled}
                            icon="close-circle-outline"
                            isActive={selectedFilter === "Cancelled"}
                        />
                    </TouchableOpacity>
                </ScrollView>

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
                    renderItem={({ item }) => {
                        const isExpanded = expandedOrderId === item._id;
                        // Show only THIS vendor's earnings for the order, not the
                        // organizer's full bill (which may include other vendors'
                        // services on the same booking).
                        const vendorTotal = Array.isArray(item.vendorOrders)
                            ? item.vendorOrders.reduce((sum: number, s: any) => sum + (s.price || 0), 0)
                            : item.totalAmount;
                        return (
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => toggleExpand(item._id)}
                                style={styles.orderCard}
                            >
                                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                                <View style={styles.orderInfo}>
                                    <View style={styles.orderCardHeader}>
                                        <View style={styles.eventIconWrap}>
                                            <Ionicons name="calendar" size={18} color={PRIMARY} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.eventTitle} numberOfLines={1}>{item.eventName}</Text>
                                            <Text style={styles.orderName}>{item.organizerId?.name}</Text>
                                        </View>
                                        <View style={styles.statusBadge}>
                                            <Text style={styles.statusBadgeText}>{item.status}</Text>
                                        </View>
                                        <Ionicons
                                            name={isExpanded ? "chevron-up" : "chevron-down"}
                                            size={18}
                                            color="#8A8A8A"
                                            style={{ marginLeft: 8 }}
                                        />
                                    </View>

                                    <View style={styles.detailsBlock}>
                                        <View style={styles.detailRow}>
                                            <Ionicons name="calendar-outline" size={14} color="#8A8A8A" />
                                            <Text style={styles.detailText}>{new Date(item.eventDate).toDateString()}</Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Ionicons name="pricetags-outline" size={14} color="#8A8A8A" />
                                            <Text style={styles.detailText} numberOfLines={isExpanded ? undefined : 1}>
                                                {item.vendorOrders?.map((o: any) => o.serviceName).join(", ")}
                                            </Text>
                                        </View>
                                        <View style={styles.detailRow}>
                                            <Ionicons name="cash-outline" size={14} color="#8A8A8A" />
                                            <Text style={styles.detailText}>Rs. {vendorTotal}</Text>
                                        </View>

                                                                                {/* Expanded order details - shown only when the card is tapped */}
                                        {isExpanded && (
                                            <View style={styles.expandedBlock}>
                                                {/* Order ID - highlighted, always first */}
                                                <View style={styles.orderIdBadge}>
                                                    <Ionicons name="receipt-outline" size={14} color={PRIMARY} />
                                                    <Text style={styles.orderIdText}>Order ID: {item._id}</Text>
                                                </View>

                                                {/* Event Details */}
                                                <Text style={styles.expandedSubTitle}>Event Details</Text>
                                                {!!item.eventName && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="calendar-outline" size={14} color="#8A8A8A" />
                                                        <Text style={styles.detailText}>Event Name: {item.eventName}</Text>
                                                    </View>
                                                )}
                                                {!!item.eventType && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="pricetag-outline" size={14} color="#8A8A8A" />
                                                        <Text style={styles.detailText}>Event Type: {item.eventType}</Text>
                                                    </View>
                                                )}
                                                {!!item.eventDate && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="calendar-number-outline" size={14} color="#8A8A8A" />
                                                        <Text style={styles.detailText}>Date: {new Date(item.eventDate).toDateString()}</Text>
                                                    </View>
                                                )}
                                                {!!item.guests && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="people-outline" size={14} color="#8A8A8A" />
                                                        <Text style={styles.detailText}>Guests: {item.guests}</Text>
                                                    </View>
                                                )}

                                                {/* Organizer Details */}
                                                <Text style={styles.expandedSubTitle}>Organizer Details</Text>
                                                {!!item.organizerId?.name && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="person-outline" size={14} color="#8A8A8A" />
                                                        <Text style={styles.detailText}>Name: {item.organizerId.name}</Text>
                                                    </View>
                                                )}
                                                {!!item.organizerId?.email && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="mail-outline" size={14} color="#8A8A8A" />
                                                        <Text style={styles.detailText}>Email: {item.organizerId.email}</Text>
                                                    </View>
                                                )}
                                                {!!item.organizerId?.phone && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="call-outline" size={14} color="#8A8A8A" />
                                                        <Text style={styles.detailText}>Phone: {item.organizerId.phone}</Text>
                                                    </View>
                                                )}

                                                {/* Booking Details */}
                                                <Text style={styles.expandedSubTitle}>Booking Details</Text>
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="cash-outline" size={14} color="#8A8A8A" />
                                                    <Text style={styles.detailText}>Your Earnings: Rs. {vendorTotal}</Text>
                                                </View>
                                                {!!item.status && (
                                                    <View style={styles.detailRow}>
                                                        <Ionicons name="information-circle-outline" size={14} color="#8A8A8A" />
                                                        <Text style={[styles.detailText, { textTransform: "capitalize" }]}>Status: {item.status}</Text>
                                                    </View>
                                                )}

                                                {/* Services */}
                                                {Array.isArray(item.vendorOrders) && item.vendorOrders.length > 0 && (
                                                    <>
                                                        <Text style={styles.expandedSubTitle}>Services</Text>
                                                        {item.vendorOrders.map((service: any, idx: number) => (
                                                            <View key={idx} style={styles.detailRow}>
                                                                <Ionicons name="checkmark-circle-outline" size={14} color={PRIMARY} />
                                                                <Text style={styles.detailText}>
                                                                    {service.serviceName}
                                                                    {service.price ? ` - Rs. ${service.price}` : ""}
                                                                </Text>
                                                            </View>
                                                        ))}
                                                    </>
                                                )}
                                            </View>
                                        )}
                                    </View>

                                                                        <View style={styles.actionButtons}>
                                        {item.status !== "cancelled" && item.status !== "completed" && (
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={() => handleDelete(item._id)}
                                            >
                                                <Ionicons name="close-circle-outline" size={14} color="#fff" />
                                                <Text style={styles.buttonText}>Cancel Order</Text>
                                            </TouchableOpacity>
                                        )}

                                        {item.status !== "completed" && item.status !== "cancelled" && (
                                            item.status === "pending" ? (
                                                <TouchableOpacity
                                                    style={styles.completeButton}
                                                    onPress={() => mark(item._id, "confirmed")}
                                                >
                                                    <Ionicons name="time-outline" size={14} color="#fff" />
                                                    <Text style={styles.buttonText}>Mark Processing</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <TouchableOpacity
                                                    style={styles.completeButton}
                                                    onPress={() => mark(item._id, "completed")}
                                                >
                                                    <Ionicons name="checkmark-outline" size={14} color="#fff" />
                                                    <Text style={styles.buttonText}>Mark Completed</Text>
                                                </TouchableOpacity>
                                            )
                                        )}

                                        <TouchableOpacity
                                            style={styles.messageButton}
                                            onPress={() => handleMessageButtonClick(item.organizerId?._id)}
                                        >
                                            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
                                            <Text style={styles.buttonText}>Message</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
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
            <Ionicons name={icon} size={18} color={isActive ? PRIMARY : "#FFFFFF"} />
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
        summaryScroll: {
        flexGrow: 0,
        marginBottom: 18,
    },
    summaryContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        paddingHorizontal: 12,
    },
    summaryCard: {
        width: 92,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#F0DDEA",
        marginHorizontal: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },

    summaryIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "rgba(255,255,255,0.22)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 6,
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
        fontSize: 19,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    summaryValueActive: {
        color: "#FFFFFF",
    },
    summaryLabel: {
        fontSize: 10,
        color: "#FFFFFF",
        fontWeight: "600",
        marginTop: 2,
        textAlign: "center",
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
        expandedBlock: {
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "rgba(120,12,96,0.12)",
    },
    orderIdBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: PRIMARY_LIGHT,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 8,
    },
    orderIdText: {
        marginLeft: 6,
        fontSize: 11,
        fontWeight: "800",
        color: PRIMARY,
    },
    expandedSubTitle: {
        fontSize: 11,
        fontWeight: "800",
        color: PRIMARY,
        marginTop: 4,
        marginBottom: 4,
        textTransform: "uppercase",
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