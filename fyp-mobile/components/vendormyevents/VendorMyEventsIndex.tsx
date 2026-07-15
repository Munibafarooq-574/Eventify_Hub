import getVendorOrders from "@/services/getVendorOrders";
import { getSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";
const { width } = Dimensions.get('window');

const PRIMARY = "#780C60";
const PRIMARY_LIGHT = "#F8E9F0";
const ACCENT = "#B84B9A";

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

    // Build marked dates so days that actually have orders get a subtle dot,
    // in addition to highlighting the currently selected day.
    const markedDates = React.useMemo(() => {
        const marks: Record<string, any> = {};

        orders.forEach((o) => {
            const key = new Date(o.eventDate).toISOString().split('T')[0];
            marks[key] = {
                ...(marks[key] || {}),
                marked: true,
                dotColor: ACCENT,
            };
        });

        marks[selectedDate] = {
            ...(marks[selectedDate] || {}),
            selected: true,
            selectedColor: PRIMARY,
            selectedTextColor: "#FFFFFF",
        };

        return marks;
    }, [orders, selectedDate]);

    const monthLabel = new Date(selectedDate).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerTitle}>My Events</Text>
                    <Text style={styles.headerSubtitle}>Manage your upcoming bookings</Text>
                </View>

                <TouchableOpacity
                    style={styles.headerIconBtn}
                    onPress={() => router.push('/vendornotifications')}
                >
                    <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
                    <View style={styles.notificationDot} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <>
                        {/* Calendar Card */}
                        <View style={styles.calendarCard}>
                            <Calendar
                                current={selectedDate}
                                markedDates={markedDates}
                                onDayPress={(day) => setSelectedDate(day.dateString)}
                                enableSwipeMonths
                                theme={{
                                    backgroundColor: "#FFFFFF",
                                    calendarBackground: "#FFFFFF",
                                    textSectionTitleColor: "#9B9B9B",
                                    selectedDayBackgroundColor: PRIMARY,
                                    selectedDayTextColor: "#FFFFFF",
                                    todayTextColor: PRIMARY,
                                    todayBackgroundColor: PRIMARY_LIGHT,
                                    dayTextColor: "#2D2D2D",
                                    textDisabledColor: "#D9D9D9",
                                    dotColor: ACCENT,
                                    selectedDotColor: "#FFFFFF",
                                    arrowColor: PRIMARY,
                                    monthTextColor: "#000000",
                                    textDayFontWeight: "500",
                                    textMonthFontWeight: "800",
                                    textDayHeaderFontWeight: "700",
                                    textDayFontSize: 14,
                                    textMonthFontSize: 17,
                                    textDayHeaderFontSize: 12,
                                }}
                                style={styles.calendar}
                            />
                        </View>

                        {/* Section Title */}
                        <View style={styles.sectionRow}>
                            <View>
                                <Text style={styles.sectionTitle}>{monthLabel}</Text>
                                <Text style={styles.sectionSubtitle}>
                                    {new Date(selectedDate).toDateString()}
                                </Text>
                            </View>
                            <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>
                                    {events.length} {events.length === 1 ? "Event" : "Events"}
                                </Text>
                            </View>
                        </View>
                    </>
                }
                renderItem={({ item }) => (
                    <View style={styles.eventCard}>
                        <View style={styles.eventAccentBar} />

                        <View style={styles.eventIconWrap}>
                            <Ionicons name="calendar" size={22} color={PRIMARY} />
                        </View>

                        <View style={styles.eventDetails}>
                            <Text style={styles.eventDate}>
                                {new Date(item.eventDate).toDateString()}
                            </Text>
                            <Text style={styles.eventTitle} numberOfLines={1}>
                                {item.eventName}
                            </Text>

                            <View style={styles.metaRow}>
                                <View style={styles.eventMeta}>
                                    <Ionicons name="time-outline" size={15} color={PRIMARY} />
                                    <Text style={styles.eventText}>{item.eventTime}</Text>
                                </View>
                                <View style={styles.eventMeta}>
                                    <Ionicons name="people-outline" size={15} color={PRIMARY} />
                                    <Text style={styles.eventText}>{item.guests}</Text>
                                </View>
                            </View>
                        </View>

                        <Ionicons name="chevron-forward" size={20} color="#C6C6C6" />
                    </View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="calendar-outline" size={34} color={PRIMARY} />
                        </View>
                        <Text style={styles.emptyTitle}>No events on this day</Text>
                        <Text style={styles.emptySubtitle}>
                            Select another date on the calendar to view your bookings
                        </Text>
                    </View>
                }
            />

            <BottomNavigationFinal />
        </View>
    );
};

export default MyEventsScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PRIMARY_LIGHT,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: PRIMARY,
        paddingTop: Platform.OS === "ios" ? 60 : 40,
        paddingBottom: 22,
        paddingHorizontal: 18,
        borderBottomLeftRadius: 26,
        borderBottomRightRadius: 26,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
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
    headerTitle: {
        fontSize: 19,
        fontWeight: "800",
        color: "#FFFFFF",
    },
    headerSubtitle: {
        fontSize: 12,
        color: "rgba(255,255,255,0.75)",
        marginTop: 2,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 110,
    },
    calendarCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        marginTop: 18,
        paddingVertical: 8,
        paddingHorizontal: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
        overflow: "hidden",
    },
    calendar: {
        borderRadius: 16,
    },
    sectionRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 22,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1A1A1A",
    },
    sectionSubtitle: {
        fontSize: 12,
        color: "#8A8A8A",
        marginTop: 2,
    },
    countBadge: {
        backgroundColor: PRIMARY,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    countBadgeText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "700",
    },
    eventCard: {
        flexDirection: "row",
        backgroundColor: "#fff",
        padding: 14,
        borderRadius: 16,
        alignItems: "center",
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 2,
        overflow: "hidden",
    },
    eventAccentBar: {
        width: 4,
        alignSelf: "stretch",
        backgroundColor: ACCENT,
        borderRadius: 4,
        marginRight: 12,
    },
    eventIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: PRIMARY_LIGHT,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    eventDetails: {
        flex: 1,
    },
    eventDate: {
        fontSize: 11,
        color: "#9B9B9B",
        fontWeight: "600",
        marginBottom: 2,
    },
    eventTitle: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1A1A1A",
    },
    metaRow: {
        flexDirection: "row",
        marginTop: 8,
        gap: 16,
    },
    eventMeta: {
        flexDirection: "row",
        alignItems: "center",
    },
    eventText: {
        marginLeft: 5,
        color: "#555",
        fontSize: 12,
        fontWeight: "500",
    },
    emptyState: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 40,
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