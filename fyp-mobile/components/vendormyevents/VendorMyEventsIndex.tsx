import getVendorOrders from "@/services/getVendorOrders";
import { getSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";
const { width } = Dimensions.get('window');

const MyEventsScreen = () => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [orders, setOrders] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);

    useEffect(() => {
        // Fetch orders and stats on component mount
        const fetchData = async () => {
            try {
                const user = JSON.parse(await getSecureData("user") || "");
                if (!user) {
                    throw "user not found";
                }
                const ordersData = await getVendorOrders("Vendor", user._id);  // Fetch all orders
                console.log(ordersData);
                setOrders(ordersData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedDate && orders.length > 0) {
            const selected = new Date(selectedDate).toISOString().split('T')[0];

            const ordersArr = orders.filter(x => {
                const eventDate = new Date(x.eventDate).toISOString().split('T')[0];
                return eventDate === selected;
            });

            setEvents(ordersArr);
        }
    }, [selectedDate, orders]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Events</Text>
                <TouchableOpacity onPress={() => router.push('/vendornotifications')}>
                    <Ionicons name="notifications-outline" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            <Calendar
                current={selectedDate}
                markedDates={{
                    [selectedDate]: { selected: true, selectedColor: "#780C60" }, // Selected Date Color
                }}
                onDayPress={(day) => setSelectedDate(day.dateString)}
                theme={{
                    backgroundColor: "#FFFFFF", // White Background
                    calendarBackground: "#FFFFFF", // White Calendar Background
                    textSectionTitleColor: "#000", // Black Month and Weekday Titles
                    selectedDayBackgroundColor: "#780C60", // Correct Selected Date Color
                    selectedDayTextColor: "#FFFFFF", // White Text on Selected Date
                    todayTextColor: "#000", // Black Text for Today
                    arrowColor: "#000", // Black Arrows for Month Navigation
                    monthTextColor: "#000", // Black Month Name
                }}
            />


            {/* Events List */}
            <Text style={styles.sectionTitle}>This month</Text>
            <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.eventCard}>
                        <View style={styles.eventDetails}>
                            <Text style={styles.eventDate}>
                                {new Date(item.eventDate).toDateString()}
                            </Text>
                            <Text style={styles.eventTitle}>{item.eventName}</Text>
                            <View style={styles.eventMeta}>
                                <Ionicons name="time-outline" size={16} color="#555" />
                                <Text style={styles.eventText}>{item.eventTime}</Text>
                            </View>
                            <View style={styles.eventMeta}>
                                <Ionicons name="location-outline" size={16} color="#555" />
                                <Text style={styles.eventText}>{item.guests}</Text>
                            </View>
                        </View>
                    </View>
                )}
            />

            <BottomNavigationFinal />
        </View>
    );
};

export default MyEventsScreen;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8E9F0",
        paddingTop: 70,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
        paddingHorizontal: 15,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#000",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#000",
        marginVertical: 15,
        paddingHorizontal: 15,
    },
    eventCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 10,
        borderRadius: 10,
        alignItems: "center",
        marginBottom: 10,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    eventImage: {
        width: 70,
        height: 70,
        borderRadius: 10,
        marginRight: 10,
    },
    eventDetails: {
        flex: 1,
    },
    eventDate: {
        fontSize: 12,
        color: "#666",
    },
    eventTitle: {
        fontSize: 16,
        fontWeight: "bold",
        color: "#000",
    },
    eventMeta: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 5,
    },
    eventText: {
        marginLeft: 5,
        color: "#555",
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
        // marginBottom: 30, // Moves the Home button slightly upward
        transform: [{ translateY: -10 }], // Alternatively, use translateY to lift it
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

});
