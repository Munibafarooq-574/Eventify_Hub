import getVendorOrders from "@/services/getVendorOrders";
import { getSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Dimensions,
    FlatList,
    Platform,
    ScrollView,
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
const ACCENT_LIGHT = "#F0DDEA";

type ViewMode = "day" | "upcoming" | "month" | "past";

const FILTERS: { key: ViewMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: "day", label: "Selected Day", icon: "today-outline" },
    { key: "upcoming", label: "Upcoming", icon: "arrow-forward-circle-outline" },
    { key: "month", label: "This Month", icon: "calendar-outline" },
    { key: "past", label: "Past", icon: "time-outline" },
];

const toKey = (d: string | Date) => new Date(d).toISOString().split('T')[0];

const MyEventsScreen = () => {
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [orders, setOrders] = useState<any[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>("day");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = JSON.parse(await getSecureData("user") || "");
                if (!user) {
                    throw "user not found";
                }
                const ordersData = await getVendorOrders("Vendor", user._id);
                console.log(ordersData);
                setOrders(ordersData || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };
        fetchData();
    }, []);

    const todayKey = toKey(new Date());

    // ---- Mini dashboard stats (always visible, regardless of filter/day) ----
    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = orders.filter((o) => {
            const d = new Date(o.eventDate);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const upcoming = orders.filter((o) => toKey(o.eventDate) >= todayKey);
        return {
            total: orders.length,
            thisMonth: thisMonth.length,
            upcoming: upcoming.length,
        };
    }, [orders, todayKey]);

    // ---- Events list, driven by the active filter chip ----
    const events = useMemo(() => {
        const now = new Date();
        let list: any[] = [];

        if (viewMode === "day") {
            list = orders.filter((o) => toKey(o.eventDate) === selectedDate);
        } else if (viewMode === "upcoming") {
            list = orders
                .filter((o) => toKey(o.eventDate) >= todayKey)
                .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
        } else if (viewMode === "month") {
            list = orders
                .filter((o) => {
                    const d = new Date(o.eventDate);
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                })
                .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
        } else if (viewMode === "past") {
            list = orders
                .filter((o) => toKey(o.eventDate) < todayKey)
                .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
        }

        return list;
    }, [orders, viewMode, selectedDate, todayKey]);

    // Event dates get a solid, high-contrast highlight using the calendar's
    // own default day-cell size (no custom layout) — just a color change.
    const markedDates = useMemo(() => {
        const marks: Record<string, any> = {};

        orders.forEach((o) => {
            const key = toKey(o.eventDate);
            marks[key] = {
                customStyles: {
                    container: {
                        backgroundColor: ACCENT,
                        borderRadius: 8,
                    },
                    text: {
                        color: "#FFFFFF",
                        fontWeight: "800",
                    },
                },
            };
        });

        // Selected date always wins visually, even if it's also an event date
        // (gets a white ring so it's distinguishable from a plain event day).
        marks[selectedDate] = {
            customStyles: {
                container: {
                    backgroundColor: PRIMARY,
                    borderRadius: 8,
                    borderWidth: marks[selectedDate] ? 2 : 0,
                    borderColor: "#FFFFFF",
                },
                text: {
                    color: "#FFFFFF",
                    fontWeight: "800",
                },
            },
        };

        return marks;
    }, [orders, selectedDate]);

    const monthLabel = new Date(selectedDate).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    const toggleExpand = (id: string) => setExpandedId(prev => (prev === id ? null : id));

    const listTitle =
        viewMode === "day" ? new Date(selectedDate).toDateString() :
        viewMode === "upcoming" ? "Upcoming Bookings" :
        viewMode === "month" ? `Bookings in ${monthLabel}` :
        "Past Bookings";

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
                keyExtractor={(item) => item._id || item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    <>
                        {/* Mini dashboard */}
                        <View style={styles.statsRow}>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.total}</Text>
                                <Text style={styles.statLabel}>Total</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.thisMonth}</Text>
                                <Text style={styles.statLabel}>This Month</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.upcoming}</Text>
                                <Text style={styles.statLabel}>Upcoming</Text>
                            </View>
                        </View>

                        {/* Calendar Card */}
                        <View style={styles.calendarCard}>
                            <Calendar
                                current={selectedDate}
                                markedDates={markedDates}
                                markingType="custom"
                                onDayPress={(day) => {
                                    setSelectedDate(day.dateString);
                                    setViewMode("day");
                                }}
                                enableSwipeMonths
                                theme={{
                                    backgroundColor: "#FFFFFF",
                                    calendarBackground: "#FFFFFF",
                                    textSectionTitleColor: "#9B9B9B",
                                    todayTextColor: PRIMARY,
                                    todayBackgroundColor: PRIMARY_LIGHT,
                                    dayTextColor: "#2D2D2D",
                                    textDisabledColor: "#D9D9D9",
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
                            <View style={styles.legendRow}>
                                <View style={styles.legendSwatch} />
                                <Text style={styles.legendText}>Date with booking(s)</Text>
                                <View style={[styles.legendSwatch, styles.legendSwatchSelected]} />
                                <Text style={styles.legendText}>Selected</Text>
                            </View>
                        </View>

                        {/* Filter chips */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.filterRow}
                        >
                            {FILTERS.map((f) => {
                                const active = viewMode === f.key;
                                return (
                                    <TouchableOpacity
                                        key={f.key}
                                        onPress={() => setViewMode(f.key)}
                                        style={[styles.filterChip, active && styles.filterChipActive]}
                                        activeOpacity={0.8}
                                    >
                                        <Ionicons
                                            name={f.icon}
                                            size={14}
                                            color={active ? "#FFFFFF" : PRIMARY}
                                        />
                                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                                            {f.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Section Title */}
                        <View style={styles.sectionRow}>
                            <View>
                                <Text style={styles.sectionTitle}>{listTitle}</Text>
                                {viewMode === "day" && (
                                    <Text style={styles.sectionSubtitle}>{monthLabel}</Text>
                                )}
                            </View>
                            <View style={styles.countBadge}>
                                <Text style={styles.countBadgeText}>
                                    {events.length} {events.length === 1 ? "Event" : "Events"}
                                </Text>
                            </View>
                        </View>
                    </>
                }
                renderItem={({ item }) => {
                    const id = item._id || item.id;
                    const isExpanded = expandedId === id;
                    // Show only this vendor's own earnings, not the organizer's
                    // full order total (which may span multiple vendors).
                    const vendorTotal = Array.isArray(item.vendorOrders)
                        ? item.vendorOrders.reduce((sum: number, s: any) => sum + (s.price || 0), 0)
                        : item.totalAmount;
                    return (
                        <TouchableOpacity
                            style={styles.eventCard}
                            activeOpacity={0.85}
                            onPress={() => toggleExpand(id)}
                        >
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
                                    {!!item.guests && (
                                        <View style={styles.eventMeta}>
                                            <Ionicons name="people-outline" size={15} color={PRIMARY} />
                                            <Text style={styles.eventText}>{item.guests}</Text>
                                        </View>
                                    )}
                                </View>

                                {isExpanded && (
                                    <View style={styles.expandedBlock}>
                                        {!!item.organizerId?.name && (
                                            <View style={styles.eventMeta}>
                                                <Ionicons name="person-outline" size={14} color="#8A8A8A" />
                                                <Text style={styles.expandedText}>{item.organizerId.name}</Text>
                                            </View>
                                        )}
                                        {!!item.organizerId?.phone && (
                                            <View style={styles.eventMeta}>
                                                <Ionicons name="call-outline" size={14} color="#8A8A8A" />
                                                <Text style={styles.expandedText}>{item.organizerId.phone}</Text>
                                            </View>
                                        )}
                                        {!!vendorTotal && (
                                            <View style={styles.eventMeta}>
                                                <Ionicons name="cash-outline" size={14} color="#8A8A8A" />
                                                <Text style={styles.expandedText}>Rs. {vendorTotal}</Text>
                                            </View>
                                        )}
                                        {!!item.status && (
                                            <View style={styles.eventMeta}>
                                                <Ionicons name="information-circle-outline" size={14} color="#8A8A8A" />
                                                <Text style={[styles.expandedText, { textTransform: "capitalize" }]}>
                                                    {item.status}
                                                </Text>
                                            </View>
                                        )}
                                        {Array.isArray(item.vendorOrders) && item.vendorOrders.length > 0 && (
                                            <>
                                                <Text style={styles.expandedSubTitle}>Services</Text>
                                                {item.vendorOrders.map((s: any, idx: number) => (
                                                    <View key={idx} style={styles.eventMeta}>
                                                        <Ionicons name="checkmark-circle-outline" size={14} color={PRIMARY} />
                                                        <Text style={styles.expandedText}>
                                                            {s.serviceName}
                                                            {s.price != null ? ` - Rs. ${s.price}` : ""}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </>
                                        )}
                                    </View>
                                )}
                            </View>

                            <Ionicons
                                name={isExpanded ? "chevron-up" : "chevron-forward"}
                                size={20}
                                color="#C6C6C6"
                            />
                        </TouchableOpacity>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconCircle}>
                            <Ionicons name="calendar-outline" size={34} color={PRIMARY} />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {viewMode === "day" ? "No events on this day" : "No events found"}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {viewMode === "day"
                                ? "Select another date on the calendar to view your bookings"
                                : "Try a different filter or check back later"}
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
    statsRow: {
        flexDirection: "row",
        gap: 10,
        marginTop: 18,
        marginBottom: 6,
    },
    statCard: {
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: "#F0DDEA",
    },
    statValue: {
        fontSize: 20,
        fontWeight: "800",
        color: PRIMARY,
    },
    statLabel: {
        fontSize: 11,
        color: "#8A8A8A",
        fontWeight: "600",
        marginTop: 2,
    },
    calendarCard: {
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        marginTop: 14,
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
    legendRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingBottom: 8,
        paddingTop: 2,
        gap: 6,
    },
    legendSwatch: {
        width: 12,
        height: 12,
        borderRadius: 4,
        backgroundColor: ACCENT,
    },
    legendSwatchSelected: {
        backgroundColor: PRIMARY,
        marginLeft: 12,
    },
    legendText: {
        fontSize: 11,
        color: "#8A8A8A",
        fontWeight: "600",
    },
    filterRow: {
        gap: 8,
        marginTop: 16,
        paddingRight: 8,
    },
    filterChip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "#FFFFFF",
        borderWidth: 1.5,
        borderColor: "#F0DDEA",
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 20,
    },
    filterChipActive: {
        backgroundColor: PRIMARY,
        borderColor: PRIMARY,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: "700",
        color: PRIMARY,
    },
    filterChipTextActive: {
        color: "#FFFFFF",
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
        marginTop: 6,
    },
    eventText: {
        marginLeft: 5,
        color: "#555",
        fontSize: 12,
        fontWeight: "500",
    },
    expandedBlock: {
        marginTop: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: "rgba(120,12,96,0.12)",
    },
    expandedText: {
        marginLeft: 6,
        fontSize: 12,
        color: "#4A4A4A",
    },
    expandedSubTitle: {
        fontSize: 11,
        fontWeight: "800",
        color: PRIMARY,
        marginTop: 6,
        textTransform: "uppercase",
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