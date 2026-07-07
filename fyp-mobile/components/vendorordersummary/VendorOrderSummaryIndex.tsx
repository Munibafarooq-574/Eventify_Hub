import createConversation from "@/services/createConversation";
import getVendorOrderStats from "@/services/getVendorOrderStats";
import getVendorOrders from "@/services/getVendorOrders";
import patchUpdateOrderStatus from "@/services/patchUpdateOrderStatus";
import { getSecureData, saveSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
                    <TouchableOpacity onPress={() => router.push('/vendordashboard')}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Order Summary</Text>
                    <TouchableOpacity onPress={() => router.push('/vendornotifications')}>
                        <Ionicons name="notifications-outline" size={24} color="#000" />
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
                            color="#D6A7E3"
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
                            color="#337AB7"
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
                            color="#5CB85C"
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
                    renderItem={({ item }) => (
                        <View key={item._id} style={styles.orderCard}>
                            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(item.status) }]} />
                            <View style={styles.orderInfo}>
                                <Text style={styles.eventTitle}>Event: <Text style={styles.bold}>{item.eventName}</Text></Text>
                                <Text>Name: <Text style={styles.bold}>{item.organizerId.name}</Text></Text>
                                <Text>Date: {new Date(item.eventDate).toDateString()}</Text>
                                <Text>Package: {item.vendorOrders.map((orderName: any) => orderName.serviceName)}</Text>
                                <Text>Price: {item.totalAmount}</Text>
                                <Text>Status: {item.status}</Text>
                                <View style={styles.actionButtons}>
                                    {
                                        item.status !== "cancelled"
                                            ?
                                            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item._id)}>
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
                                                    <Text style={styles.buttonText}>Mark As Processing</Text>
                                                </TouchableOpacity>
                                                :
                                                <TouchableOpacity style={styles.completeButton} onPress={() => mark(item._id, "completed")}>
                                                    <Text style={styles.buttonText}>Mark As Completed</Text>
                                                </TouchableOpacity>
                                            :
                                            <></>
                                    }

                                    <TouchableOpacity style={styles.messageButton} onPress={() => handleMessageButtonClick(item.organizerId._id)}>
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
    color,
    isActive = false
}: {
    label: string,
    value: number,
    color: string,
    isActive?: boolean
}) => (
    <View style={[
        styles.summaryCard,
        { backgroundColor: color },
        isActive && styles.activeSummaryCard
    ]}>
        <Ionicons name="cart-outline" size={20} color="white" />
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
        {isActive && <View style={styles.activeIndicator} />}
    </View>
);

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: "#F8E9F0",
    },
    container: {
        flex: 1,
        paddingHorizontal: 15,
        paddingTop: 50,
        paddingBottom: 80,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20
    },
    iconImage: {
        width: 37,
        height: 37,
        marginBottom: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#000"
    },
    summaryContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20
    },
    summaryCardWrapper: {
        flex: 1,
        marginHorizontal: 5,
    },
    summaryCard: {
        padding: 15,
        borderRadius: 10,
        alignItems: "center",
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    activeSummaryCard: {
        transform: [{ scale: 1.05 }],
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 4,
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -2,
        height: 3,
        width: '50%',
        backgroundColor: '#FFF',
        borderRadius: 3,
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: "white"
    },
    summaryLabel: {
        fontSize: 9,
        color: "white"
    },
    ordersList: {
        flex: 1,
    },
    ordersListContent: {
        paddingBottom: 20,
    },
    orderCard: {
        flexDirection: "row",
        backgroundColor: "white",
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2
    },
    statusIndicator: {
        width: 15,
        height: 15,
        borderRadius: 10,
        marginRight: 15
    },
    orderInfo: {
        flex: 1
    },
    eventTitle: {
        fontWeight: "bold"
    },
    bold: {
        fontWeight: "bold"
    },
    actionButtons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 10
    },
    deleteButton: {
        backgroundColor: "#A00",
        padding: 5,
        borderRadius: 5
    },
    completeButton: {
        backgroundColor: "#007BFF",
        padding: 5,
        borderRadius: 5
    },
    messageButton: {
        backgroundColor: "#4CAF50",
        padding: 5,
        borderRadius: 5
    },
    buttonText: {
        color: "white",
        fontSize: 12
    },
    bottomNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 70,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        width: width,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingBottom: 10,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    iconContainer: {
        backgroundColor: '#780C60',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5,
    },
});

export default OrderSummary;
