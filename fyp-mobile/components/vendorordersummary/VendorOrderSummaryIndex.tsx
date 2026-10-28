import BookingUserGuide from '../guides/BookingUserGuide';
import BookingActivity from '../booking/BookingActivity';
import VendorLaterTimeRequest from '../booking/VendorLaterTimeRequest';
import { reportMarketplaceLoadError } from '@/services/reportMarketplaceLoadError';
import getVendorCancellationPreview, { type VendorCancellationPreview } from '@/services/getVendorCancellationPreview';
import VendorCancellationSummary from '../cancellation/VendorCancellationSummary';
import cancelConfirmedBooking from '@/services/cancelConfirmedBooking';
import useRefundUpdates from '@/hooks/useRefundUpdates';
import { canCompleteVendorBooking } from '@/utils/vendorCompletion';
import BookingCancellationDetails from '../booking/BookingCancellationDetails';
import createConversation from "@/services/createConversation";
import getVendorOrderStats from "@/services/getVendorOrderStats";
import getVendorOrders from "@/services/getVendorOrders";
import { getRescheduleRequests, respondToRescheduleRequest } from "@/services/rescheduleBooking";
import patchUpdateOrderStatus, {
    patchUpdateVendorOrderStatus,
} from "@/services/patchUpdateOrderStatus";
import { getUserData, saveSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";

// Order interface
interface Order {
    id: string;
    event: string;
    name: string;
    date: string;
    package: string;
    price: string;
    status: "Pending" | "Processing" | "Confirmed" | "Completed";
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
            return "#4A84BD"; // blue - accepted, payment still due
        case "Confirmed":
            return "#8F6CCF"; // financially secured after down payment
        case "Completed":
            return "#63BE63"; // green - done
        case "Cancelled":
            return "#D9534F"; // red - cancelled
        case "Payment Expired":
            return "#C47A2C"; // warm amber - payment hold expired
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
const PROCESSING_STATUS = "processing";
const CONFIRMED_STATUS = "confirmed";
const COMPLETED_STATUS = "completed";
const CANCELLED_STATUS = "cancelled";
const PAYMENT_EXPIRED_STATUS = "payment_expired";
const EXPIRED_STATUS = "expired";
const isClosedVendorStatus = (status: string) => ["no_longer_assigned", PAYMENT_EXPIRED_STATUS, EXPIRED_STATUS].includes(status);
const isAcceptanceDisabled = (booking: any, blockedId: string | null) =>
    booking?.laterTimeRequest?.status === 'PENDING' || booking?.laterTimeRequestAvailable === true ||
    (booking?.laterTimeRequestAvailable == null && !booking?.laterTimeRequest && blockedId === booking?._id);

// VendorOrder schema uses 'accepted' where Order/UI uses 'confirmed'
const mapVendorStatus = (status: string, replacementOutcome?: string | null) =>
    replacementOutcome === "NO_LONGER_ASSIGNED"
        ? "no_longer_assigned"
        : status === "cancelled_by_vendor"
            ? "cancelled"
            : status === "accepted"
            ? "confirmed"
            : status;

const formatTimeOnly = (value: string | Date) => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime())
        ? "Not provided"
        : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

// IMPORTANT: don't use order.status here — that's the PARENT order's
// aggregate status across ALL vendors on the order, and can differ from
// what THIS vendor's own service actually is (e.g. this vendor is
// completed/cancelled but another vendor on the same order is still
// active, so the parent flips to "confirmed").
const getVendorStatus = (order: any) => {
    const vOrders = order.vendorOrders || [];
    if (vOrders.length === 0) return order.status;

    if (vOrders.every((v: any) => String(v?.paymentStatus || "").toUpperCase() === "PAYMENT_EXPIRED")) {
        return PAYMENT_EXPIRED_STATUS;
    }

    if (vOrders.every((v: any) => v.status === EXPIRED_STATUS || ["EXPIRED", "PAYMENT_EXPIRED"].includes(String(v?.paymentStatus || "").toUpperCase()))) {
        return EXPIRED_STATUS;
    }

    const statuses = vOrders.map((v: any) => mapVendorStatus(v.status, v.replacementOutcome));
    if (statuses.every((x: string) => x === "no_longer_assigned")) return "no_longer_assigned";
    if (statuses.every((x: string) => x === "completed")) return "completed";
    if (statuses.every((x: string) => x === "cancelled")) return "cancelled";

    const accepted = vOrders.filter((v: any) => mapVendorStatus(v.status, v.replacementOutcome) === "confirmed");
    if (accepted.some((v: any) => ["PARTIALLY_PAID", "PAID"].includes(String(v?.paymentStatus || "").toUpperCase()))) return CONFIRMED_STATUS;
    if (accepted.some((v: any) => String(v?.paymentStatus || "").toUpperCase() === "PAYMENT_REQUIRED")) return PROCESSING_STATUS;
    if (accepted.length > 0) return PROCESSING_STATUS;

    return "pending";
};

type FilterType = "All" | "Pending" | "Processing" | "Confirmed" | "Completed" | "Cancelled" | "Expired" | "Payment Expired" | "No Longer Assigned";

const OrderSummary = () => {
    const { selectedTab, orderId: targetOrderId } = useLocalSearchParams(); // Read tab from navigation params
    const [selectedFilter, setSelectedFilter] = useState<FilterType>("All");
    const [orders, setOrders] = useState<any[]>([]);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);
    const [respondingRequestId, setRespondingRequestId] = useState<string | null>(null);
    const [isRefreshingScreen, setIsRefreshingScreen] = useState(false);
    const { refunds, refundLoading, refundError, loadRefunds } = useRefundUpdates();
    const [cancellation, setCancellation] = useState<{ orderId: string; vendorOrderId: string } | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [cancellationError, setCancellationError] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [cancellationPreview, setCancellationPreview] = useState<VendorCancellationPreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const previewGeneration = useRef(0);
    const cancellationLock = useRef(false);
    const summaryScrollRef = useRef<ScrollView>(null);

    const [lateAcceptanceId, setLateAcceptanceId] = useState<string | null>(null);
    const refreshScreenData = useCallback(async () => {
        const user = await getUserData();
        if (!user) throw new Error("user not found");

        // Re-read both sources together so dates/times, statuses, stats and
        // reschedule cards always represent the latest backend state.
        const [ordersData, requests] = await Promise.all([
            getVendorOrders("Vendor", user._id),
            getRescheduleRequests(),
        ]);
        setOrders(ordersData || []);
        setRescheduleRequests(Array.isArray(requests) ? requests : []);
    }, []);

    useEffect(() => {
        const tab = Array.isArray(selectedTab) ? selectedTab[0] : selectedTab;
        const validTabs: FilterType[] = ["All", "Pending", "Processing", "Confirmed", "Completed", "Cancelled", "Expired", "Payment Expired", "No Longer Assigned"];
        if (tab && validTabs.includes(tab as FilterType)) {
            setSelectedFilter(tab as FilterType);

            // Keep the selected summary card visible when this screen is opened
            // from the dashboard. The filter logic remains unchanged.
            const tabIndex = validTabs.indexOf(tab as FilterType);
            requestAnimationFrame(() => {
                summaryScrollRef.current?.scrollTo({
                    x: Math.max(0, tabIndex * 168 - 16),
                    animated: true,
                });
            });
        }
    }, [selectedTab]);

    useFocusEffect(useCallback(() => {
        void refreshScreenData().catch(() => {});
        if (typeof targetOrderId === 'string' && targetOrderId) { setSelectedFilter('All'); setExpandedOrderId(targetOrderId); }
    }, [targetOrderId, refreshScreenData]));

    const handleRescheduleResponse = async (
        requestId: string,
        status: "ACCEPTED" | "REJECTED"
    ) => {
        const perform = async () => {
            try {
                setRespondingRequestId(requestId);
                await respondToRescheduleRequest(requestId, status);

                // Acceptance may finalize the whole reschedule and update the
                // parent order/event. Refresh the complete screen instead of
                // patching only the request locally, preventing stale dates/times.
                setIsRefreshingScreen(true);
                await refreshScreenData();
                Alert.alert(
                    status === "ACCEPTED" ? "Schedule response saved" : "Thanks for letting us know 💜",
                    status === "ACCEPTED"
                        ? "Thank you! Your availability for the updated schedule has been shared. The event will move once all required vendors are confirmed."
                        : "We’ve shared your availability with the client. The current booking remains unchanged while they decide how they’d like to proceed."
                );
            } catch (error: any) {
                Alert.alert("Could not respond", error?.message || "Please try again.");
            } finally {
                setRespondingRequestId(null);
                setIsRefreshingScreen(false);
            }
        };

        if (status === "REJECTED") {
            Alert.alert(
                "Unable to accommodate this schedule?",
                "That’s completely okay. We’ll let the client know that the requested date/time doesn’t work for you, while the current booking stays unchanged for now.",
                [
                    { text: "Keep reviewing", style: "cancel" },
                    { text: "Confirm availability", onPress: perform },
                ]
            );
            return;
        }
        await perform();
    };

    // Live-computed stats: recalculates automatically whenever `orders` changes
    // (e.g. after Mark Processing / Mark Completed / Delete), so the numbers
    // on the summary cards increment/decrement instantly.
        const orderStats = useMemo(() => {
        const pending = orders.filter((o) => getVendorStatus(o) === PENDING_STATUS).length;
        const processing = orders.filter((o) => getVendorStatus(o) === PROCESSING_STATUS).length;
        const confirmed = orders.filter((o) => getVendorStatus(o) === CONFIRMED_STATUS).length;
        const completed = orders.filter((o) => getVendorStatus(o) === COMPLETED_STATUS).length;
        const cancelled = orders.filter((o) => getVendorStatus(o) === CANCELLED_STATUS).length;
        const expired = orders.filter((o) => getVendorStatus(o) === EXPIRED_STATUS).length;
        const paymentExpired = orders.filter((o) => getVendorStatus(o) === PAYMENT_EXPIRED_STATUS).length;
        const noLongerAssigned = orders.filter((o) => getVendorStatus(o) === "no_longer_assigned").length;
        return {
            totalOrders: orders.length, // matches dashboard's total (includes every status)
            pending,
            processing,
            confirmed,
            completed,
            cancelled,
            expired,
            paymentExpired,
            noLongerAssigned,
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
            case "expired":
            case "payment_expired":
                return "#C47A2C";
            case "no_longer_assigned":
                return "#8B6B82";
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
            if (selectedFilter === "Pending") return getVendorStatus(order) === PENDING_STATUS;
            if (selectedFilter === "Processing") return getVendorStatus(order) === PROCESSING_STATUS;
            if (selectedFilter === "Confirmed") return getVendorStatus(order) === CONFIRMED_STATUS;
            if (selectedFilter === "Completed") return getVendorStatus(order) === COMPLETED_STATUS;
            if (selectedFilter === "Cancelled") return getVendorStatus(order) === CANCELLED_STATUS;
            if (selectedFilter === "Expired") return getVendorStatus(order) === EXPIRED_STATUS;
            if (selectedFilter === "Payment Expired") return getVendorStatus(order) === PAYMENT_EXPIRED_STATUS;
            if (selectedFilter === "No Longer Assigned") return getVendorStatus(order) === "no_longer_assigned";
            return true;
        });
    }, [orders, selectedFilter]);

    /*const handleDelete = async (id: string) => {
        await patchUpdateOrderStatus(id, "cancelled");
        setOrders(prevOrders => prevOrders.map(order => order._id === id ? { ...order, status: "cancelled" } : order));
        alert("Order Cancelled");
    };*/
   
   const handleDelete = async (
    orderId: string,
    vendorOrderId: string
) => {
    try {
        console.log("Cancelling Main Order ID:", orderId);
        console.log("Cancelling Vendor Order ID:", vendorOrderId);

        if (!vendorOrderId) {
            alert("Vendor order ID not found");
            return;
        }

        setCancellation({ orderId, vendorOrderId });
        setCancellationReason(''); setCancellationError(''); setCancellationPreview(null);

    } catch (error: any) {
        const message = error?.response?.data?.message;
        Alert.alert('Unable to cancel booking', typeof message === 'string' ? message : 'Refresh this booking and try again.');
    }
};

    const loadCancellationPreview = useCallback(async () => {
        const request = ++previewGeneration.current;
        if (!cancellation) { setCancellationPreview(null); return; }
        setPreviewLoading(true); setCancellationError('');
        try {
            const result = await getVendorCancellationPreview(cancellation.vendorOrderId);
            if (request === previewGeneration.current) setCancellationPreview(result);
        } catch (error: any) {
            if (request === previewGeneration.current) { setCancellationPreview(null); setCancellationError(error?.response?.data?.message || 'Unable to load cancellation details. Please retry.'); }
        } finally { if (request === previewGeneration.current) setPreviewLoading(false); }
    }, [cancellation]);
    useFocusEffect(useCallback(() => {
        void loadCancellationPreview();
        return () => { ++previewGeneration.current; };
    }, [loadCancellationPreview]));

    const confirmVendorCancellation = async () => {
        if (!cancellation || cancellationLock.current || previewLoading) return;
        const reason = cancellationReason.trim();
        if (!reason) { setCancellationError('Please enter a cancellation reason.'); return; }
        if (!cancellationPreview || cancellationPreview.vendorOrderId !== cancellation.vendorOrderId) { setCancellationError('Load and review the cancellation details first.'); return; }
        cancellationLock.current = true; setCancelling(true); setCancellationError('');
        try {
            const latest = await getVendorCancellationPreview(cancellation.vendorOrderId);
            if (['bookingAmount', 'amountPaid', 'refundAmount', 'penaltyAmount', 'refundPercentage', 'penaltyPercentage', 'policyRevision'].some(key => latest[key as keyof VendorCancellationPreview] !== cancellationPreview[key as keyof VendorCancellationPreview])) {
                setCancellationPreview(latest); setCancellationError('Cancellation amounts changed. Review the updated details before confirming again.'); return;
            }
            await cancelConfirmedBooking(cancellation.vendorOrderId, 'vendor', reason);
            setCancellation(null); setCancellationReason('');
            await Promise.allSettled([refreshScreenData(), loadRefunds()]);
            Alert.alert('Booking cancelled', 'The cancellation has been recorded. Check the refund and penalty details for this booking.');
        } catch (error: any) {
            const message = error?.response?.data?.message;
            setCancellationError(typeof message === 'string' ? message : 'Unable to cancel this booking. Please try again.');
        } finally { cancellationLock.current = false; setCancelling(false); }
    };
    /*const mark = async (id: string, status: "completed" | "pending" | "confirmed" | "cancelled") => {
        console.log(id);
        await patchUpdateOrderStatus(id, status);
        setOrders(prevOrders =>
            prevOrders.map(order => order._id === id ? { ...order, status: status } : order)
        );
        alert("Order Updated");
    };*/

   const mark = async (
    orderId: string,
    vendorOrderId: string,
    status: "completed" | "pending" | "confirmed" | "cancelled"
) => {
    try {
        console.log("Main Order ID:", orderId);
        console.log("Vendor Order ID:", vendorOrderId);
        console.log("New Status:", status);

        if (!vendorOrderId) {
            alert("Vendor order ID not found");
            return;
        }

        // Backend: update vendor order
        await patchUpdateVendorOrderStatus(
            vendorOrderId,
            status
        );

        // Frontend: update the order shown on screen
        setOrders(prevOrders =>
            prevOrders.map(order => {
                if (order._id !== orderId) {
                    return order;
                }

                return {
                    ...order,

                    // THIS IS THE IMPORTANT FIX
                    status: status,

                    vendorOrders: order.vendorOrders?.map(
                        (vendorOrder: any) =>
                            vendorOrder._id === vendorOrderId
                                ? {
                                      ...vendorOrder,
                                      status: status,
                                  }
                                : vendorOrder
                    ),
                };
            })
        );

        alert("Order Updated");

    } catch (error: any) {
        if (/not enough time remains|service has already started/i.test(error?.message || '')) setLateAcceptanceId(vendorOrderId);
        reportMarketplaceLoadError('Booking status unavailable', error);
        Alert.alert('Booking could not be updated', error?.message || 'Please refresh and try again.');
    }
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
            reportMarketplaceLoadError('Booking chat unavailable', error);
            alert('Unable to open this booking chat. Please refresh your orders and try again.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                {isRefreshingScreen && (
                    <View
                        style={{
                            ...StyleSheet.absoluteFillObject,
                            zIndex: 1000,
                            elevation: 1000,
                            backgroundColor: "rgba(255,255,255,0.78)",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <View style={{ alignItems: "center", padding: 20, borderRadius: 16, backgroundColor: "#FFFFFF" }}>
                            <ActivityIndicator size="large" color={PRIMARY} />
                            <Text style={{ marginTop: 10, color: PRIMARY, fontWeight: "700" }}>Updating order summary…</Text>
                        </View>
                    </View>
                )}
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

                <BookingUserGuide kind="vendorOrders" primary={PRIMARY} />
                                {/* Order Status Summary */}
                <ScrollView
                    ref={summaryScrollRef}
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
                        onPress={() => handleSummaryCardClick("Confirmed")}
                        activeOpacity={0.7}
                    >
                        <SummaryCard
                            label="Confirmed"
                            value={orderStats.confirmed}
                            icon="shield-checkmark-outline"
                            isActive={selectedFilter === "Confirmed"}
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

                    <TouchableOpacity onPress={() => handleSummaryCardClick("Expired")} activeOpacity={0.7}>
                        <SummaryCard label="Expired" value={orderStats.expired} icon="timer-outline" isActive={selectedFilter === "Expired"} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleSummaryCardClick("Payment Expired")}
                        activeOpacity={0.7}
                    >
                        <SummaryCard
                            label="Payment Expired"
                            value={orderStats.paymentExpired}
                            icon="timer-outline"
                            isActive={selectedFilter === "Payment Expired"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => handleSummaryCardClick("No Longer Assigned")}
                        activeOpacity={0.7}
                    >
                        <SummaryCard
                            label="No Longer Assigned"
                            value={orderStats.noLongerAssigned}
                            icon="archive-outline"
                            isActive={selectedFilter === "No Longer Assigned"}
                        />
                    </TouchableOpacity>
                </ScrollView>

                {/* Orders List */}
                <FlatList
                    style={styles.ordersList}
                    contentContainerStyle={styles.ordersListContent}
                    data={filteredOrders}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
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
                                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(getVendorStatus(item)) }]} />
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
                                            <Text style={styles.statusBadgeText}>{getVendorStatus(item) === "no_longer_assigned" ? "No Longer Assigned" : getVendorStatus(item) === PAYMENT_EXPIRED_STATUS ? "Payment Expired" : getVendorStatus(item)}</Text>
                                        </View>
                                        <Ionicons
                                            name={isExpanded ? "chevron-up" : "chevron-down"}
                                            size={18}
                                            color="#8A8A8A"
                                            style={{ marginLeft: 8 }}
                                        />
                                    </View>

                                    {(item.vendorOrders || []).map((booking: any) => (
                                        <BookingActivity key={booking._id} booking={booking} timeZone={item.eventCityId?.timeZone} cancellationDetailsVisible />
                                    ))}
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

                                        {(item.vendorOrders || []).map((booking: any) => (
                                            <BookingCancellationDetails key={booking._id} booking={booking} audience="vendor" refundState={{ record: refunds[String(booking._id)], loading: refundLoading, error: refundError }} />
                                        ))}

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

                                                {!!(item?.eventCityId?.name || item?.eventCity?.name || item?.city?.name || item?.city) && (
                                                    <View style={styles.detailRow}><Ionicons name="location-outline" size={14} color="#8A8A8A" /><Text style={styles.detailText}>City: {item?.eventCityId?.name || item?.eventCity?.name || item?.city?.name || item?.city}</Text></View>
                                                )}
                                                {!!item?.eventStartDateTime && <View style={styles.detailRow}><Ionicons name="time-outline" size={14} color="#8A8A8A" /><Text style={styles.detailText}>Start Time: {formatTimeOnly(item.eventStartDateTime)}</Text></View>}
                                                {!!item?.eventEndDateTime && <View style={styles.detailRow}><Ionicons name="time-outline" size={14} color="#8A8A8A" /><Text style={styles.detailText}>End Time: {formatTimeOnly(item.eventEndDateTime)}</Text></View>}
                                                {!!item?.eventAddress && <View style={styles.detailRow}><Ionicons name="navigate-outline" size={14} color="#8A8A8A" /><Text style={styles.detailText}>Event Address: {item.eventAddress}</Text></View>}

                                                {getVendorStatus(item) === "no_longer_assigned" && (() => {
                                                    const service = (item.vendorOrders || []).find((vo: any) => vo.replacementOutcome === "NO_LONGER_ASSIGNED");
                                                    const request = rescheduleRequests.find((r: any) =>
                                                        String(r.orderId) === String(item._id) &&
                                                        String(r.replacesVendorOrderId || r.vendorOrderId) === String(service?._id)
                                                    ) || rescheduleRequests.find((r: any) => String(r.orderId) === String(item._id));
                                                    return (
                                                        <View style={styles.rescheduleCard}>
                                                            <View style={styles.rescheduleHeader}>
                                                                <Ionicons name="heart-outline" size={17} color={PRIMARY} />
                                                                <Text style={styles.rescheduleTitle}>Booking schedule updated 💜</Text>
                                                            </View>
                                                            <Text style={styles.rescheduleLine}>You’re no longer assigned to this event.</Text>
                                                            {!!request && (
                                                                <>
                                                                    <Text style={styles.rescheduleLine}>Original: {new Date(request.oldEventDate).toDateString()} · {request.oldStartTime}</Text>
                                                                    <Text style={styles.rescheduleLine}>Requested: {new Date(request.newEventDate).toDateString()} · {request.newStartTime}</Text>
                                                                    <Text style={styles.rescheduleResolved}>Your response: Unable to accommodate</Text>
                                                                </>
                                                            )}
                                                            <Text style={styles.rescheduleReason}>
                                                                Thank you for letting us know about your availability. The client made alternative arrangements for the updated schedule, so no further action is needed from you. We hope to work with you on another event soon.
                                                            </Text>
                                                        </View>
                                                    );
                                                })()}

                                                {!["cancelled", "no_longer_assigned"].includes(getVendorStatus(item)) && rescheduleRequests
                                                    .filter((request: any) => String(request.orderId) === String(item._id) && !(item.vendorOrders || []).some((booking: any) => String(booking._id) === String(request.vendorOrderId) && booking.laterTimeRequest?.clientAcceptedSuggestion))
                                                    .map((request: any) => {
                                                        const pending = request.status === "CHANGE_REQUESTED";
                                                        const busy = respondingRequestId === request._id;
                                                        return (
                                                            <View key={request._id} style={styles.rescheduleCard}>
                                                                <View style={styles.rescheduleHeader}>
                                                                    <Ionicons name="calendar-outline" size={17} color={PRIMARY} />
                                                                    <Text style={styles.rescheduleTitle}>Schedule Update Request</Text>
                                                                </View>
                                                                <Text style={styles.rescheduleLine}>
                                                                    New date: {new Date(request.newEventDate).toDateString()}
                                                                </Text>
                                                                <Text style={styles.rescheduleLine}>
                                                                    New start: {request.newStartTime}
                                                                </Text>
                                                                {!!request.reason && (
                                                                    <Text style={styles.rescheduleReason}>Reason: {request.reason}</Text>
                                                                )}
                                                                {request.availabilityPrecheckPassed === false && (
                                                                    <Text style={styles.rescheduleWarning}>
                                                                        Availability pre-check found a conflict. Review carefully.
                                                                    </Text>
                                                                )}
                                                                {pending ? (
                                                                    <View style={styles.rescheduleActions}>
                                                                        <TouchableOpacity
                                                                            disabled={busy}
                                                                            style={styles.rejectRescheduleButton}
                                                                            onPress={() => handleRescheduleResponse(request._id, "REJECTED")}
                                                                        >
                                                                            <Text style={styles.rescheduleActionText}>Unable to Accommodate</Text>
                                                                        </TouchableOpacity>
                                                                        <TouchableOpacity
                                                                            disabled={busy}
                                                                            style={styles.acceptRescheduleButton}
                                                                            onPress={() => handleRescheduleResponse(request._id, "ACCEPTED")}
                                                                        >
                                                                            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.rescheduleActionText}>Accept New Schedule</Text>}
                                                                        </TouchableOpacity>
                                                                    </View>
                                                                ) : (
                                                                    <Text style={styles.rescheduleResolved}>
                                                                        {request.status === "ACCEPTED" ? "New schedule accepted" : request.status === "REJECTED" ? "Unable to accommodate" : "Request expired"}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        );
                                                    })}

                                                {/* Organizer Details */}
                                                {item.vendorOrders?.some((v:any)=>v.paymentVerificationOverdue) && (
                                                    <Text style={{color:'#9B2335',paddingVertical:10}}>Payment verification overdue — service not secured. Awaiting Admin review.</Text>
                                                )}
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
                                                        <Text style={[styles.detailText, { textTransform: "capitalize" }]}>Status: {getVendorStatus(item) === "no_longer_assigned" ? "No Longer Assigned" : getVendorStatus(item) === PAYMENT_EXPIRED_STATUS ? "Payment Expired" : getVendorStatus(item)}</Text>
                                                    </View>
                                                )}

                                                {/* Services */}
                                                {Array.isArray(item.vendorOrders) && item.vendorOrders.length > 0 && (
                                                    <>
                                                        <Text style={styles.expandedSubTitle}>Services</Text>
                                                        {item.vendorOrders.map((service: any, idx: number) => {
                                                            const vendorPackages = Array.isArray(service?.vendorId?.packages) ? service.vendorId.packages : [];
                                                            const selectedPackage = vendorPackages.find((pkg: any) => String(pkg?._id || pkg?.id) === String(service?.packageId || ""));
                                                            const total = Number(service?.finalAmount ?? service?.price ?? 0);
                                                            const paymentStatus = String(service?.paymentStatus || "UNPAID").toUpperCase();
                                                            // remainingAmount is also a pre-payment snapshot, so only
                                                            // secured payment states may contribute to the paid display.
                                                            const savedRemaining = Number(service?.remainingAmount ?? total);
                                                            const remaining = paymentStatus === "PAID" ? 0
                                                                : paymentStatus === "PARTIALLY_PAID" && Number.isFinite(savedRemaining)
                                                                    ? Math.min(total, Math.max(savedRemaining, 0))
                                                                    : total;
                                                            const paid = Math.max(total - remaining, 0);
                                                            return (
                                                              <View key={service?._id || idx} style={styles.serviceDetailCard}>
                                                                <Text style={styles.serviceDetailTitle}>{service?.serviceName || "Service"}</Text>
                                                                <Text style={styles.serviceDetailText}>Package: {selectedPackage?.packageName || service?.packageName || "Not provided"}</Text>
                                                                <Text style={styles.serviceDetailText}>Start Time: {service?.eventStartDateTime ? formatTimeOnly(service.eventStartDateTime) : "Not provided"}</Text>
                                                                <Text style={styles.serviceDetailText}>End Time: {service?.eventEndDateTime ? formatTimeOnly(service.eventEndDateTime) : "Not provided"}</Text>
                                                                <Text style={styles.serviceDetailText}>Booking Amount: Rs. {total}</Text>
                                                                <Text style={styles.serviceDetailText}>Paid: Rs. {paid}</Text>
                                                                <Text style={styles.serviceDetailText}>Remaining: Rs. {remaining}</Text>
                                                                <Text style={styles.serviceDetailText}>Payment Status: {String(service?.paymentStatus || "UNPAID").replace(/_/g, " ")}</Text>
                                                              </View>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </View>
                                        )}
                                    </View>

                                    {(item.vendorOrders || []).map((booking: any) => (
                                        <VendorLaterTimeRequest key={`later-${booking._id}`} booking={booking} event={item} available={isAcceptanceDisabled(booking, lateAcceptanceId)} onUpdated={refreshScreenData} />
                                    ))}
                                    {isClosedVendorStatus(getVendorStatus(item)) ? (
                                        <View style={styles.closedBookingBox}>
                                            <Ionicons name="lock-closed-outline" size={16} color={PRIMARY} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.closedBookingTitle}>
                                                    {getVendorStatus(item) === PAYMENT_EXPIRED_STATUS ? "Payment window expired" : getVendorStatus(item) === EXPIRED_STATUS ? "Booking expired" : "This booking is closed"}
                                                </Text>
                                                <Text style={styles.closedBookingText}>
                                                    {getVendorStatus(item) === PAYMENT_EXPIRED_STATUS
                                                        ? "The client did not complete the required payment before the deadline. This booking is now history only and the reserved slot has been released."
                                                        : getVendorStatus(item) === EXPIRED_STATUS
                                                        ? "This booking has expired. It is kept for your history; booking actions and messaging are no longer available here."
                                                        : "This record is available for your history only. No further actions are required."}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : (
                                    <View style={styles.actionButtons}>
                                        {getVendorStatus(item) !== "cancelled" && getVendorStatus(item) !== "completed" && (
                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                               // onPress={() => handleDelete(item._id)}
                                            onPress={() =>
                                        handleDelete(
                                            item._id,
                                            item.vendorOrders?.[0]?._id
                                        )
                                    }
                                            >
                                                <Ionicons name="close-circle-outline" size={14} color="#fff" />
                                                <Text style={styles.buttonText}>Cancel Order</Text>
                                            </TouchableOpacity>
                                        )}

                                        {getVendorStatus(item) !== "completed" && getVendorStatus(item) !== "cancelled" && (
                                            getVendorStatus(item) === "pending" ? (
                                                <TouchableOpacity
                                                    disabled={isAcceptanceDisabled(item.vendorOrders?.[0], lateAcceptanceId)}
                                                    accessibilityState={{ disabled: isAcceptanceDisabled(item.vendorOrders?.[0], lateAcceptanceId) }}
                                                    style={[styles.completeButton, (isAcceptanceDisabled(item.vendorOrders?.[0], lateAcceptanceId)) && { opacity: 0.45 }]}
                                                   // onPress={() => mark(item._id, "confirmed")}
                                                   onPress={() =>
                                                        mark(
                                                            item._id,
                                                            item.vendorOrders?.[0]?._id,
                                                            "confirmed"
                                                        )
                                                    }
                                                >
                                                    <Ionicons name="time-outline" size={14} color="#fff" />
                                                    <Text style={styles.buttonText}>Mark Processing</Text>
                                                </TouchableOpacity>
                                            ) : canCompleteVendorBooking(item.vendorOrders?.[0]) ? (
                                                <TouchableOpacity
                                                    style={styles.completeButton}
                                                    //onPress={() => mark(item._id, "completed")}
                                                    onPress={() => Alert.alert(
                                                        "Complete booking?",
                                                        "Have you provided the booked service?",
                                                        [
                                                            { text: "Keep Booking", style: "cancel" },
                                                            { text: "Mark Completed", onPress: () => {
                                                                if (canCompleteVendorBooking(item.vendorOrders?.[0])) {
                                                                    void mark(item._id, item.vendorOrders?.[0]?._id, "completed");
                                                                }
                                                            } },
                                                        ],
                                                    )}
                                                >
                                                    <Ionicons name="checkmark-outline" size={14} color="#fff" />
                                                    <Text style={styles.buttonText}>Mark Completed</Text>
                                                </TouchableOpacity>
                                            ) : null
                                        )}

                                        <TouchableOpacity
                                            style={styles.messageButton}
                                            onPress={() => handleMessageButtonClick(item.organizerId?._id)}
                                        >
                                            <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
                                            <Text style={styles.buttonText}>Message</Text>
                                        </TouchableOpacity>
                                    </View>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>
            <Modal visible={!!cancellation} transparent animationType="slide" onRequestClose={() => { if (!cancelling) setCancellation(null); }}>
                <KeyboardAvoidingView style={styles.cancellationOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.cancellationPanel}>
                        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }}>
                            <Text style={styles.cancellationTitle}>Cancel this booking?</Text>
                            <Text style={styles.cancellationText}>This cancels only your vendor booking. The client refund and any vendor penalty will be recorded by the server under the applicable cancellation rules.</Text>
                            {previewLoading && <ActivityIndicator color={PRIMARY} />}
                            {cancellationPreview && cancellation && <VendorCancellationSummary
                                order={orders.find(order => order._id === cancellation.orderId)}
                                booking={orders.find(order => order._id === cancellation.orderId)?.vendorOrders?.find((booking: any) => booking._id === cancellation.vendorOrderId)}
                                preview={cancellationPreview} />}
                            {!previewLoading && !cancellationPreview && <TouchableOpacity onPress={() => void loadCancellationPreview()}><Text style={{ color: PRIMARY, fontWeight: '700' }}>Reload cancellation details</Text></TouchableOpacity>}
                            <Text style={styles.cancellationText}>Reason for cancellation (required)</Text>
                            <TextInput accessibilityLabel="Vendor cancellation reason" style={styles.cancellationInput}
                                value={cancellationReason} onChangeText={value => { setCancellationReason(value); setCancellationError(''); }}
                                placeholder="Tell the client why you cannot provide the service" multiline maxLength={500} editable={!cancelling} textAlignVertical="top" />
                            {!!cancellationError && <Text accessibilityRole="alert" style={{ color: '#A9273B' }}>{cancellationError}</Text>}
                            <TouchableOpacity accessibilityRole="button" disabled={cancelling || previewLoading || !cancellationPreview || !cancellationReason.trim()}
                                onPress={confirmVendorCancellation} style={[styles.cancellationConfirm, (cancelling || previewLoading || !cancellationPreview || !cancellationReason.trim()) && { opacity: 0.5 }]}>
                                <Text style={styles.buttonText}>{cancelling ? 'Cancelling…' : 'Confirm Cancellation'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity accessibilityRole="button" disabled={cancelling} onPress={() => setCancellation(null)} style={styles.cancellationKeep}>
                                <Text style={{ color: PRIMARY, fontWeight: '700' }}>Keep Booking</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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
    cancellationOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    cancellationPanel: { width: '100%', maxWidth: 560, maxHeight: '85%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20 },
    cancellationTitle: { fontSize: 20, color: PRIMARY, fontWeight: '800' },
    cancellationText: { fontSize: 14, lineHeight: 21, color: '#5F3041' },
    cancellationInput: { minHeight: 110, borderWidth: 1, borderColor: '#DCC5D5', borderRadius: 12, padding: 12, color: '#1A1A1A' },
    cancellationConfirm: { minHeight: 48, backgroundColor: '#C43848', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12 },
    cancellationKeep: { minHeight: 48, borderWidth: 1, borderColor: '#DCC5D5', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: 12 },

    rescheduleCard: { marginTop: 14, padding: 13, borderRadius: 13, backgroundColor: '#FFF8FC', borderWidth: 1, borderColor: '#E8D4E1' },
    rescheduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
    rescheduleTitle: { color: PRIMARY, fontWeight: '800', fontSize: 14 },
    rescheduleLine: { color: '#4F3B49', fontSize: 12.5, marginBottom: 4 },
    rescheduleReason: { color: '#7A6675', fontSize: 12, marginTop: 5 },
    rescheduleWarning: { color: '#B06B00', fontWeight: '700', fontSize: 11.5, marginTop: 7 },
    rescheduleActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    rejectRescheduleButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: '#C0392B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8 },
    acceptRescheduleButton: { flex: 1, minHeight: 48, borderRadius: 12, backgroundColor: '#278A4B', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, paddingVertical: 8 },
    rescheduleActionText: { color: '#FFFFFF', fontWeight: '800', fontSize: 11.5, lineHeight: 15, textAlign: 'center', flexShrink: 1 },
    rescheduleResolved: { marginTop: 9, color: PRIMARY, fontWeight: '800', fontSize: 12 },
    serviceDetailCard: { marginTop: 8, padding: 10, borderRadius: 11, backgroundColor: '#FFF8FC', borderWidth: 1, borderColor: '#E8D4E1' },
    serviceDetailTitle: { color: PRIMARY, fontSize: 12.5, fontWeight: '800', marginBottom: 4 },
    serviceDetailText: { color: '#4F3B49', fontSize: 11.5, lineHeight: 18 },
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
        height: 116,
        paddingVertical: 12,
        paddingHorizontal: 6,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "flex-start",
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
    closedBookingBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12, padding: 13, borderRadius: 12, backgroundColor: '#F8EEF5', borderWidth: 1, borderColor: '#E7CFDF' },
    closedBookingTitle: { color: PRIMARY, fontWeight: '800', fontSize: 13 },
    closedBookingText: { color: '#76636F', fontSize: 11.5, lineHeight: 17, marginTop: 2 },
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
