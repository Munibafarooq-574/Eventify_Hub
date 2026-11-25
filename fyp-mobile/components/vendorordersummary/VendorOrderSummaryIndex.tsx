import VendorScheduleProposal from '../booking/VendorScheduleProposal';
import { displayBookingMoney, getVendorBookingSummary } from '@/utils/vendorBookingAmounts';
import { bookingTimeZone, formatBookingDate, formatBookingTime, formatCalendarDate } from '@/utils/bookingTimezone';
import { pricingLabel } from '@/utils/packagePricing';
import { usePullToRefresh } from "@/components/refresh/usePullToRefresh";
import type { ComponentRef } from 'react';
import DeliveryDetails from '@/components/booking/DeliveryDetails';
import { formatBookingActivityTime } from '@/utils/bookingActivity';
import BookingUserGuide from '../guides/BookingUserGuide';
import BookingActivity from '../booking/BookingActivity';
import VendorLaterTimeRequest from '../booking/VendorLaterTimeRequest';
import { reportMarketplaceLoadError } from '@/services/reportMarketplaceLoadError';
import getVendorCancellationPreview, { type VendorCancellationPreview } from '@/services/getVendorCancellationPreview';
import VendorCancellationSummary from '../cancellation/VendorCancellationSummary';
import cancelConfirmedBooking from '@/services/cancelConfirmedBooking';
import useRefundUpdates from '@/hooks/useRefundUpdates';
import { canCompleteVendorBooking, getVendorCompletionTime, isFullyPaidVendorOrder } from '@/utils/vendorCompletion';
import BookingCancellationDetails from '../booking/BookingCancellationDetails';
import createConversation from "@/services/createConversation";
import getVendorOrderStats from "@/services/getVendorOrderStats";
import getVendorOrders from "@/services/getVendorOrders";
import { getRescheduleRequests, respondToRescheduleRequest } from "@/services/rescheduleBooking";
import patchUpdateOrderStatus, {
    patchUpdateVendorOrderStatus,
    acceptPendingVendorPackages,
} from "@/services/patchUpdateOrderStatus";
import { getUserData, saveSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Dimensions, FlatList, KeyboardAvoidingView, Linking, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
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

const titleCase = (value: string) => value.toLowerCase().replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());

const completionTimeLeft = (time: number, now: number) => {
    const minutes = Math.ceil((time - now) / 60_000);
    if (minutes <= 0) return '';
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
};

const openOrderLink = (url: string) => {
    void Linking.openURL(url).catch(() => Alert.alert('Unable to open link'));
};

const { width } = Dimensions.get('window');

// Same theme as MyEventsScreen
const PRIMARY = "#780C60";
const PRIMARY_LIGHT = "#F8E9F0";
const ACCENT = "#B84B9A";

type StatusAppearance = { color: string; background: string; icon: keyof typeof Ionicons.glyphMap };
const statusAppearance: Record<string, StatusAppearance> = {
    pending: { color: '#9A5107', background: '#FFF0D7', icon: 'time-outline' },
    processing: { color: '#195B95', background: '#E4F0FD', icon: 'hourglass-outline' },
    accepted: { color: '#126A60', background: '#DDF4EF', icon: 'checkmark-outline' },
    confirmed: { color: '#6533A0', background: '#EFE5FC', icon: 'shield-checkmark-outline' },
    completed: { color: '#217448', background: '#E4F5E9', icon: 'checkmark-done-outline' },
    cancelled: { color: '#A6293D', background: '#FCE7EB', icon: 'close-circle-outline' },
    expired: { color: '#685B54', background: '#EEE9E5', icon: 'hourglass-outline' },
    payment_expired: { color: '#9C411D', background: '#FCE9DC', icon: 'alarm-outline' },
    no_longer_assigned: { color: '#4F5D73', background: '#E9EDF4', icon: 'remove-circle-outline' },
    unpaid: { color: '#9C411D', background: '#FCE9DC', icon: 'ellipse-outline' },
    partially_paid: { color: '#9A5107', background: '#FFF0D7', icon: 'contrast-outline' },
    paid: { color: '#217448', background: '#E4F5E9', icon: 'checkmark-circle-outline' },
};
const defaultAppearance: StatusAppearance = { color: PRIMARY, background: PRIMARY_LIGHT, icon: 'information-circle-outline' };
const appearanceFor = (status: string) =>
    statusAppearance[['rejected', 'cancelled_by_vendor'].includes(status) ? 'cancelled' : status] ?? defaultAppearance;
const StatusChip = ({ status, label }: { status: string; label?: string }) => {
    const { color, background, icon } = appearanceFor(status);
    return <View style={[styles.statusBadge, { backgroundColor: background }]}>
        <Ionicons name={icon} size={12} color={color} />
        <Text style={[styles.statusBadgeText, { color }]}>{label ?? titleCase(status)}</Text>
    </View>;
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

const formatScheduleTime = (value: string) => {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value || '')) return 'Not provided';
    const [hour, minute] = value.split(':').map(Number);
    return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
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

type FilterType = "All" | "Pending" | "Processing" | "Confirmed" | "Completed" | "Fully Paid" | "Cancelled" | "Expired" | "Payment Expired" | "No Longer Assigned" | "Closed";

const OrderSummary = () => {
    const { selectedTab, orderId: targetOrderId } = useLocalSearchParams(); // Read tab from navigation params
    const targetId = Array.isArray(targetOrderId) ? targetOrderId[0] : targetOrderId;
    const ordersListRef = useRef<FlatList<any>>(null);
    const [selectedFilter, setSelectedFilter] = useState<FilterType>("All");
    const [orders, setOrders] = useState<any[]>([]);
    const [fullyPaidOrders, setFullyPaidOrders] = useState<any[]>([]);
    const [completionTick, setCompletionTick] = useState(0);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
    const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
    const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
    const [orderOptions, setOrderOptions] = useState<{ id: string; packages: any[] } | null>(null);
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
    const completionLock = useRef(false);
    const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);
    const cancellationLock = useRef(false);
    const summaryScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

    const [lateAcceptanceId, setLateAcceptanceId] = useState<string | null>(null);
    useEffect(() => {
        const now = Date.now();
        const next = orders.flatMap(order => order.vendorOrders || [])
            .filter(booking => booking.status === 'accepted')
            .map(getVendorCompletionTime)
            .reduce<number>((earliest, time) => time !== null && time > now ? Math.min(earliest, time) : earliest, Infinity);
        if (!Number.isFinite(next)) return;
        const timer = setTimeout(() => setCompletionTick(value => value + 1), Math.min(next - now, 60_000));
        return () => clearTimeout(timer);
    }, [orders, completionTick]);

    const refreshScreenData = useCallback(async () => {
        const user = await getUserData();
        if (!user) throw new Error("user not found");

        // Re-read both sources together so dates/times, statuses, stats and
        // reschedule cards always represent the latest backend state.
        const [ordersData, requests, paid] = await Promise.all([
            getVendorOrders("Vendor", user._id, undefined, targetId ? 0 : 10),
            getRescheduleRequests(),
            getVendorOrders("Vendor", user._id, "fully_paid", 0).catch(() => null),
        ]);
        setOrders(ordersData || []);
        setFullyPaidOrders((paid ?? ordersData ?? []).filter(isFullyPaidVendorOrder));
        setRescheduleRequests(Array.isArray(requests) ? requests : []);
    }, [targetId]);

    const rescheduleHoldReason = (order: any) => {
        if (order.vendorOrders?.[0]?.replacementRescheduleRequestId) return '';
        const request = rescheduleRequests.find(request => String(request.orderId) === String(order._id) &&
            ['PENDING', 'REPLACEMENT_REQUIRED'].includes(String(request.resolutionStatus || 'PENDING')));
        if (!request) return '';
        if (request.status === 'CHANGE_REQUESTED') return 'Review the date/time change request before accepting this booking.';
        if (['REJECTED', 'EXPIRED'].includes(request.status)) return 'Waiting for the client to resolve the date/time change.';
        return 'Waiting for the event schedule to be finalized.';
    };

    const { refreshControl } = usePullToRefresh(
        async () => {
            const [ordersResult] = await Promise.allSettled([refreshScreenData(), loadRefunds()]);
            if (ordersResult.status === "rejected") throw ordersResult.reason;
        },
    );

    useEffect(() => {
        const tab = Array.isArray(selectedTab) ? selectedTab[0] : selectedTab;
        const validTabs: FilterType[] = ["All", "Pending", "Processing", "Confirmed", "Completed", "Fully Paid", "Cancelled", "Expired", "Payment Expired", "No Longer Assigned"];
        if (tab && validTabs.includes(tab as FilterType)) {
            setSelectedFilter(tab as FilterType);

            // Keep the selected summary card visible when this screen is opened
            // from the dashboard. The filter logic remains unchanged.
            const tabIndex = validTabs.indexOf(tab as FilterType);
            requestAnimationFrame(() => {
                summaryScrollRef.current?.scrollTo({
                    x: Math.max(0, tabIndex * 108 - 16),
                    animated: true,
                });
            });
        }
    }, [selectedTab]);

    useFocusEffect(useCallback(() => {
        void refreshScreenData().catch(() => {});
        if (targetId) {
            setSelectedFilter('All');
            setExpandedOrderId(targetId);
            ordersListRef.current?.scrollToOffset({ offset: 0, animated: false });
        }
    }, [targetId, refreshScreenData]));

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

    // Filter respects the selected summary card:
    // - All -> everything except cancelled
    // - Pending -> newly placed orders only
    // - Processing -> confirmed orders only
    // - Completed -> completed orders only
        const filteredOrders = useMemo(() => {
        if (selectedFilter === "Fully Paid") return fullyPaidOrders;
        const matchingOrders = orders.filter((order) => {
            if (selectedFilter === "All") return order._id === targetId || !isClosedVendorStatus(getVendorStatus(order));
            if (selectedFilter === "Closed") return isClosedVendorStatus(getVendorStatus(order));
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
        // Keep a booking opened from My Events or notifications immediately visible.
        if (selectedFilter === "All" && targetId) {
            return [
                ...matchingOrders.filter(order => order._id === targetId),
                ...matchingOrders.filter(order => order._id !== targetId),
            ];
        }
        return matchingOrders;
    }, [orders, selectedFilter, fullyPaidOrders, targetId]);

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

        if (status === "completed") void refreshScreenData().catch(() => {});
        alert("Order Updated");

    } catch (error: any) {
        if (/not enough time remains|service has already started/i.test(error?.message || '')) setLateAcceptanceId(vendorOrderId);
        await refreshScreenData().catch(() => {});
        reportMarketplaceLoadError('Booking status unavailable', error);
        Alert.alert('Booking could not be updated', error?.message || 'Please refresh and try again.');
    }
};
    const acceptingPackages = useRef(false);
    const confirmAcceptPackages = (order: any, pending: any[]) => {
        const zone = bookingTimeZone(order);
        const summary = pending.map(booking => `${booking.serviceName} · ${formatBookingActivityTime(booking.eventStartDateTime, zone)} – ${formatBookingTime(booking.eventEndDateTime, zone)}`).join('\n');
        Alert.alert('Accept pending packages?', summary, [
            { text: 'Back', style: 'cancel' },
            { text: 'Accept', onPress: async () => {
                if (acceptingPackages.current) return;
                acceptingPackages.current = true;
                try {
                    await acceptPendingVendorPackages(pending.map(booking => String(booking._id)));
                } catch (error: any) {
                    Alert.alert('Packages could not be accepted', error?.message || 'Please refresh and try again.');
                } finally {
                    acceptingPackages.current = false;
                    await refreshScreenData().catch(() => {});
                }
            } },
        ]);
    };

    const confirmCompletion = (orderId: string, booking: any) => {
        if (completionLock.current || !canCompleteVendorBooking(booking)) return;
        completionLock.current = true;
        const release = () => { completionLock.current = false; };
        let submitted = false;
        Alert.alert("Complete booking?", "Have you provided the booked service?", [
            { text: "Keep Booking", style: "cancel", onPress: release },
            {
                text: "Mark Completed",
                onPress: async () => {
                    if (submitted) return;
                    submitted = true;
                    if (!completionLock.current || !canCompleteVendorBooking(booking)) {
                        release();
                        return;
                    }
                    setCompletingBookingId(booking._id);
                    try {
                        await mark(orderId, booking._id, "completed");
                    } finally {
                        setCompletingBookingId(null);
                        release();
                    }
                },
            },
        ], { cancelable: true, onDismiss: release });
    };

    // Handler for summary card clicks
    const handleSummaryCardClick = (filterType: FilterType) => {
        setSelectedFilter(filterType);
    };

    const toggleExpand = (id: string) => {
        setExpandedOrderId(prev => (prev === id ? null : id));
    };

    // Create or get existing conversation/chat
    const handleMessageButtonClick = async (client: any, historyBookingId?: string, timeZone = 'UTC') => {
        const vendorId = client?._id;
        try {
            const user = await getUserData();
            if (!user) {
                throw "User not found";
            }

            // Call backend to check for an existing conversation or create a new one
            const { chatId } = historyBookingId ? { chatId: '' } : await createConversation(user._id, vendorId);
            await saveSecureData("chatId", chatId);
            await saveSecureData("receiverId", vendorId);
            await saveSecureData("receiverAvatar", client?.profileImage || "");
            await saveSecureData("receiverName", client?.name || "Conversation");
            router.push({ pathname: "/message", params: { eventTimeZone: timeZone, ...(historyBookingId ? {history: "true", bookingId: historyBookingId} : {}) } });
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
                            ...StyleSheet.absoluteFill,
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
                    showsHorizontalScrollIndicator
                    style={styles.summaryScroll}
                    contentContainerStyle={styles.summaryContainer}
                >
                    <TouchableOpacity
                        onPress={() => handleSummaryCardClick("All")}
                        activeOpacity={0.7}
                    >
                        <SummaryCard
                            label="All"
                            value={orderStats.totalOrders - orderStats.expired - orderStats.paymentExpired - orderStats.noLongerAssigned}
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

                    <TouchableOpacity onPress={() => handleSummaryCardClick("Fully Paid")} activeOpacity={0.7}>
                        <SummaryCard label="Fully Paid" value={fullyPaidOrders.length} icon="wallet-outline"
                            isActive={selectedFilter === "Fully Paid"} />
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

                    <TouchableOpacity onPress={() => handleSummaryCardClick("Closed")} activeOpacity={0.7}>
                        <SummaryCard label="Closed" value={orderStats.expired + orderStats.paymentExpired + orderStats.noLongerAssigned}
                            icon="archive-outline" isActive={["Closed", "Expired", "Payment Expired", "No Longer Assigned"].includes(selectedFilter)} />
                    </TouchableOpacity>
                </ScrollView>

                {/* Orders List */}
                <FlatList
                    ref={ordersListRef}
                    refreshControl={refreshControl}
                    style={styles.ordersList}
                    contentContainerStyle={styles.ordersListContent}
                    data={filteredOrders}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    keyExtractor={(item) => item._id}
                    showsVerticalScrollIndicator={false}
                    ListHeaderComponent={
                        <Text style={styles.sectionTitle}>
                            {selectedFilter === "All" ? "All Orders" : `${selectedFilter === "Expired" ? "Request Expired" : selectedFilter} Orders`}
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
                        const scheduleHold = rescheduleHoldReason(item);
                        const services: any[] = Array.isArray(item.vendorOrders) ? item.vendorOrders : [];
                        const requestGroups = new Map<string, any[]>();
                        for (const request of rescheduleRequests) {
                            if (String(request.orderId) !== String(item._id)) continue;
                            const key = `${request.vendorId}:${request.requestGroupId || request._id}`;
                            const group = requestGroups.get(key) ?? [];
                            group.push(request);
                            requestGroups.set(key, group);
                        }
                        const zone = bookingTimeZone(item);
                        const slotLabel = (start?: string, end?: string) => {
                            if (!start || !Number.isFinite(new Date(start).getTime())) return 'Unavailable';
                            const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: zone });
                            const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: zone });
                            const startDate = new Date(start);
                            const startLabel = `${dateFormat.format(startDate)} · ${timeFormat.format(startDate)}`;
                            if (!end || !Number.isFinite(new Date(end).getTime())) return startLabel;
                            const endDate = new Date(end);
                            const endLabel = dateFormat.format(startDate) === dateFormat.format(endDate)
                                ? timeFormat.format(endDate)
                                : `${dateFormat.format(endDate)} · ${timeFormat.format(endDate)}`;
                            return `${startLabel} – ${endLabel}`;
                        };
                        const pending = services.filter((booking: any) => booking.status === 'pending' && booking.replacementOutcome !== 'NO_LONGER_ASSIGNED');
                        const proposalBooking = services.find((booking: any) => booking.vendorScheduleProposal?.status === 'PENDING')
                            ?? services.find((booking: any) => booking.vendorScheduleProposal);
                        const proposalAnchor = pending.find((booking: any) =>
                            String(booking.paymentStatus || 'UNPAID') === 'UNPAID' &&
                            !booking.replacementOutcome && !booking.replacementRescheduleRequestId &&
                            booking.laterTimeRequest?.status !== 'PENDING' && new Date(booking.eventStartDateTime).getTime() > Date.now());
                        const acceptanceDisabled = !!scheduleHold || proposalBooking?.vendorScheduleProposal?.status === 'PENDING'
                            || pending.some((booking: any) => isAcceptanceDisabled(booking, lateAcceptanceId));
                        const status = getVendorStatus(item);
                        const faded = isClosedVendorStatus(status);
                        const closed = faded || status === 'cancelled';
                        const orderStatusLabel = status === EXPIRED_STATUS ? 'Request Expired' : titleCase(status);
                        const { amounts, original, discount, bookingTotal, platformFee, earnings, totalPaid, totalRemaining } = getVendorBookingSummary(services, item);
                        const cancellablePackages = services.filter((booking: any) =>
                            ['pending', 'accepted'].includes(booking.status) && booking.replacementOutcome !== 'NO_LONGER_ASSIGNED');
                        const nextCompletion = services
                            .filter((booking: any) => booking.status === 'accepted' && booking.replacementOutcome !== 'NO_LONGER_ASSIGNED')
                            .map(getVendorCompletionTime)
                            .reduce<number>((next, time) => time !== null && time > Date.now() ? Math.min(next, time) : next, Infinity);
                        const organizer = item.organizerId;
                        const organizerName = organizer?.name || 'Organizer';
                        const organizerPhone = organizer?.phone_number || organizer?.phone || organizer?.contactDetails?.contactNumber;
                        const organizerEmail = organizer?.email;
                        const city = item.eventCityId?.name || item.eventCity?.name || item.city?.name || (typeof item.city === 'string' ? item.city : '');
                        const schedule = item.eventStartDateTime
                            ? slotLabel(item.eventStartDateTime, item.eventEndDateTime)
                            : formatCalendarDate(item.eventDate);
                        const eventDay = item.eventStartDateTime ? formatBookingDate(item.eventStartDateTime, zone) : formatCalendarDate(item.eventDate);
                        const dayParts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' })
                            .formatToParts(new Date());
                        const dayNumber = (type: string) => Number(dayParts.find(part => part.type === type)?.value);
                        const tomorrow = new Date(Date.UTC(dayNumber('year'), dayNumber('month') - 1, dayNumber('day') + 1));
                        const isTomorrow = eventDay === formatCalendarDate(tomorrow);
                        const historyOpen = expandedHistory === item._id;

                        return (
                            <View style={[styles.orderCard, faded && { opacity: 0.78 }]}>
                                <View style={[styles.statusIndicator, { backgroundColor: appearanceFor(status).color }]} />
                                <View style={styles.orderInfo}>
                                    <View style={styles.orderCardHeader}>
                                        <TouchableOpacity style={[styles.detailRow, { flex: 1 }]} activeOpacity={0.85}
                                            accessibilityRole="button" accessibilityState={{ expanded: isExpanded }}
                                            onPress={() => toggleExpand(item._id)}>
                                            <View style={styles.eventIconWrap}><Ionicons name="calendar" size={18} color={PRIMARY} /></View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.eventTitle}>{item.eventName}</Text>
                                                {!isExpanded && <Text style={styles.orderName}>
                                                    {[organizer?.name, item.guests != null ? `${item.guests} guests` : ''].filter(Boolean).join(' · ')}
                                                </Text>}
                                            </View>
                                            <StatusChip status={status} label={orderStatusLabel} />
                                            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={PRIMARY} />
                                        </TouchableOpacity>
                                        {!closed && cancellablePackages.length > 0 && <TouchableOpacity style={styles.iconAction} accessibilityRole="button"
                                            accessibilityLabel="Order options" onPress={() => setOrderOptions({ id: item._id, packages: cancellablePackages })}>
                                            <Ionicons name="ellipsis-horizontal" size={19} color={PRIMARY} />
                                        </TouchableOpacity>}
                                    </View>
                                    <View style={styles.detailsBlock}>
                                        <View style={styles.detailRow}>
                                            <Ionicons name="calendar-outline" size={15} color={PRIMARY} />
                                            <Text style={[styles.detailText, { flex: 1 }]}>{schedule}{!isExpanded && isTomorrow ? ' · Tomorrow' : ''}</Text>
                                        </View>
                                        {isExpanded && <>
                                            {[ { icon: 'location-outline', label: city }, { icon: 'people-outline', label: item.guests != null ? `${item.guests} guests` : '' },
                                                { icon: 'pricetag-outline', label: item.eventType } ].map(({ icon, label }) => label ? (
                                                <View key={icon} style={styles.detailRow}>
                                                    <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={15} color={PRIMARY} />
                                                    <Text style={[styles.detailText, { flex: 1 }]}>{label}</Text>
                                                </View>
                                            ) : null)}
                                            {!!item.eventAddress && <TouchableOpacity style={styles.detailRow} accessibilityRole="link"
                                                onPress={() => openOrderLink('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([item.eventAddress, city].filter(Boolean).join(', ')))}>
                                                <Ionicons name="location-outline" size={16} color={PRIMARY} />
                                                <Text style={[styles.detailText, styles.linkText]}>{item.eventAddress}</Text>
                                            </TouchableOpacity>}
                                        </>}
                                        {!isExpanded && <>
                                            <Text style={styles.detailText}>{services.length} {services.length === 1 ? 'package' : 'packages'} · {displayBookingMoney(bookingTotal, item)}</Text>
                                            <Text style={styles.moneyLine}>Received {displayBookingMoney(totalPaid, item)} · Pending {displayBookingMoney(totalRemaining, item)}</Text>
                                            {Number.isFinite(nextCompletion) && <Text style={styles.detailText}>Next to complete · {formatBookingActivityTime(new Date(nextCompletion).toISOString(), zone)}</Text>}
                                        </>}
                                    </View>
                                    {isExpanded && <>
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
                                                                    <Text style={styles.rescheduleLine}>Original: {formatCalendarDate(request.oldEventDate)} · {formatBookingTime(request.oldStartTime, bookingTimeZone(item))}</Text>
                                                                    <Text style={styles.rescheduleLine}>Requested: {formatCalendarDate(request.newEventDate)} · {formatBookingTime(request.newStartTime, bookingTimeZone(item))}</Text>
                                                                    <Text style={styles.rescheduleResolved}>Your response: Unable to accommodate</Text>
                                                                </>
                                                            )}
                                                            <Text style={styles.rescheduleReason}>
                                                                Thank you for letting us know about your availability. The client made alternative arrangements for the updated schedule, so no further action is needed from you. We hope to work with you on another event soon.
                                                            </Text>
                                                        </View>
                                                    );
                                                })()}

                                                {!["cancelled", "no_longer_assigned"].includes(getVendorStatus(item)) && Array.from(requestGroups, ([key, group]) => {
                                                        const actionable = group.find(row => row.status === "CHANGE_REQUESTED" && (!row.resolutionStatus || row.resolutionStatus === "PENDING"));
                                                        const request = actionable ?? group[0];
                                                        if (!actionable && group.every(row => services.some((booking: any) => String(booking._id) === String(row.vendorOrderId) && booking.laterTimeRequest?.clientAcceptedSuggestion))) return null;
                                                        const busy = respondingRequestId === request._id;
                                                        const applied = group.every(row => row.resolutionStatus === 'APPLIED');
                                                        const showDetails = expandedSchedule === key;
                                                        const accepted = group.every(row => row.status === 'ACCEPTED');
                                                        return (
                                                            <View key={key} style={[styles.rescheduleCard, {
                                                                backgroundColor: actionable ? '#FFF4E2' : applied ? '#F0F7F2' : '#F4F1F3',
                                                            }]}>
                                                                {!actionable && <TouchableOpacity accessibilityRole="button"
                                                                    accessibilityState={{ expanded: showDetails }}
                                                                    onPress={() => setExpandedSchedule(showDetails ? null : key)}>
                                                                    <View style={styles.detailRow}>
                                                                        <Ionicons name="calendar-outline" size={17} color={PRIMARY} />
                                                                        <Text style={[styles.rescheduleTitle, { flex: 1 }]}>
                                                                            {applied ? 'Rescheduled' : accepted ? 'Awaiting schedule update' : 'Schedule change history'}
                                                                        </Text>
                                                                        {accepted && <StatusChip status="completed" label="Accepted" />}
                                                                        <Ionicons name={showDetails ? 'chevron-up' : 'chevron-down'} size={16} color={PRIMARY} />
                                                                    </View>
                                                                    {applied && <Text style={styles.rescheduleLine}>{formatCalendarDate(request.oldEventDate)} → {formatCalendarDate(request.newEventDate)}</Text>}
                                                                    <Text style={styles.scheduleMeta}>
                                                                        Requested {formatBookingDate(request.createdAt, zone)} · Reason: {request.reason || 'Not provided'}
                                                                    </Text>
                                                                </TouchableOpacity>}
                                                                {(actionable || showDetails) && <>
                                                                <View style={styles.rescheduleHeader}>
                                                                    <Ionicons name="calendar-outline" size={17} color={PRIMARY} />
                                                                    <Text style={styles.rescheduleTitle}>{actionable ? "Review Reschedule Request" : "Package schedules"}</Text>
                                                                    {actionable && <StatusChip status="pending" label="Pending" />}
                                                                </View>
                                                                {actionable && <>
                                                                <Text style={styles.rescheduleLine}>
                                                                    New date: {new Date(request.newEventDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                                                                </Text>
                                                                <Text style={styles.rescheduleLine}>
                                                                    New start time: {formatScheduleTime(request.newStartTime)}
                                                                </Text>
                                                                <Text style={styles.rescheduleReason}>Reason: {request.reason || 'Not provided'}</Text>
                                                                <Text style={styles.rescheduleLine}>Request sent: {formatBookingActivityTime(request.createdAt, bookingTimeZone(item))}</Text>
                                                                </>}
                                                                <Text style={styles.rescheduleTitle}>Affected packages ({group.length})</Text>
                                                                {group.map(row => {
                                                                    const booking = services.find((service: any) => String(service._id) === String(row.vendorOrderId));
                                                                    return (
                                                                        <View key={row._id} style={styles.serviceDetailCard}>
                                                                            <Text style={styles.serviceDetailTitle}>{booking?.serviceName || 'Package'}</Text>
                                                                            <Text style={styles.rescheduleLine}>Current slot · {slotLabel(row.oldServiceStartDateTime, row.oldServiceEndDateTime)}</Text>
                                                                            <Text style={styles.rescheduleLine}>Proposed slot · {slotLabel(row.newServiceStartDateTime, row.newServiceEndDateTime)}</Text>
                                                                            {row.availabilityPrecheckPassed === false && row.status === "CHANGE_REQUESTED" && (
                                                                                <Text style={styles.rescheduleWarning}>{row.availabilityPrecheckReason || 'Availability pre-check found a conflict.'}</Text>
                                                                            )}
                                                                            {(!actionable || row.status !== "CHANGE_REQUESTED") && <Text style={styles.rescheduleResolved}>
                                                                                {row.status === "ACCEPTED" ? "New schedule accepted" : row.status === "REJECTED" ? "Unable to accommodate" : row.status === "EXPIRED" ? "Request expired" : "Request closed"}
                                                                            </Text>}
                                                                        </View>
                                                                    );
                                                                })}
                                                                {actionable && (
                                                                    <View style={styles.rescheduleActions}>
                                                                        <TouchableOpacity
                                                                            disabled={respondingRequestId !== null}
                                                                            style={styles.rejectRescheduleButton}
                                                                            onPress={() => handleRescheduleResponse(request._id, "REJECTED")}
                                                                        >
                                                                            <Text style={styles.rescheduleActionText}>Unable to Accommodate</Text>
                                                                        </TouchableOpacity>
                                                                        <TouchableOpacity
                                                                            disabled={respondingRequestId !== null}
                                                                            style={styles.acceptRescheduleButton}
                                                                            onPress={() => handleRescheduleResponse(request._id, "ACCEPTED")}
                                                                        >
                                                                            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.rescheduleActionText}>Accept New Schedule</Text>}
                                                                        </TouchableOpacity>
                                                                    </View>
                                                                )}
                                                                </>}
                                                            </View>
                                                        );
                                                    })}


                                        {services.some((booking: any) => booking.paymentVerificationOverdue) && (
                                            <Text style={styles.rescheduleWarning}>Payment verification overdue — service not secured. Awaiting Admin review.</Text>
                                        )}
                                        {!closed && <View style={styles.bookingActions}>
                                        {!!scheduleHold && <Text accessibilityRole="alert" style={styles.rescheduleReason}>{scheduleHold}</Text>}
                                        {pending.length > 0 && (
                                            <TouchableOpacity
                                                disabled={acceptanceDisabled}
                                                style={[styles.completeButton, acceptanceDisabled && styles.disabledAction]}
                                                onPress={() => pending.length === 1
                                                    ? mark(item._id, pending[0]._id, "confirmed")
                                                    : confirmAcceptPackages(item, pending)}
                                            >
                                                <Ionicons name="checkmark-outline" size={14} color="#fff" />
                                                <Text style={styles.buttonText}>{pending.length === 1 ? 'Accept Package' : 'Accept All Pending Packages'}</Text>
                                            </TouchableOpacity>
                                        )}
                                        </View>}
                                        {!!services.length && <Text style={styles.expandedSubTitle}>Packages</Text>}
                                        {services.map((booking: any, index: number) => {
                                            const { total, paid, remaining } = amounts[index];
                                            const moneyContext = booking.currency ? booking : item;
                                            const packageKey = String(booking._id || index);
                                            const detailsOpen = expandedPackage === packageKey;
                                            const completionTime = getVendorCompletionTime(booking);
                                            const completionNow = Date.now();
                                            const timeLeft = completionTime === null ? '' : completionTimeLeft(completionTime, completionNow);
                                            const bookedPackage = booking.vendorId?.packages?.find((pkg: any) => String(pkg._id) === String(booking.packageId));
                                            const completionLabel = (booking.bookingType || bookedPackage?.bookingType) === 'DELIVERY_BASED'
                                                ? 'Scheduled delivery' : 'After service ends';
                                            const canComplete = canCompleteVendorBooking(booking, completionNow);
                                            const showCompletion = !closed && booking.status === 'accepted' && booking.replacementOutcome !== 'NO_LONGER_ASSIGNED';
                                            const paymentLabel = String(booking.paymentStatus || 'UNPAID').toUpperCase();
                                            const paymentTone = paymentLabel === 'PAID' ? 'paid' : paymentLabel === 'PARTIALLY_PAID' ? 'partially_paid'
                                                : paymentLabel === 'PAYMENT_EXPIRED' ? 'payment_expired' : 'unpaid';
                                            return (
                                                <View key={packageKey} style={styles.serviceDetailCard}>
                                                    <TouchableOpacity style={styles.detailRow} accessibilityRole="button" accessibilityState={{ expanded: detailsOpen }}
                                                        onPress={() => setExpandedPackage(detailsOpen ? null : packageKey)}>
                                                        <Text style={[styles.serviceDetailTitle, { flex: 1 }]}>{booking.serviceName || 'Package'}</Text>
                                                        <StatusChip status={booking.replacementOutcome === 'NO_LONGER_ASSIGNED' ? 'no_longer_assigned' : paymentLabel === 'PAYMENT_EXPIRED' ? 'payment_expired' : String(booking.status || 'pending').toLowerCase()} label={booking.status === 'expired' && paymentLabel !== 'PAYMENT_EXPIRED' ? 'Request expired' : undefined} />
                                                        <Ionicons name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={15} color={PRIMARY} />
                                                    </TouchableOpacity>
                                                    {booking.delivery ? <DeliveryDetails pkg={booking} timeZone={zone} /> : (
                                                        <Text style={styles.serviceDetailText}>
                                                            {booking.personCount != null ? `${booking.personCount} people · ` : ''}
                                                            {booking.eventStartDateTime && formatBookingDate(booking.eventStartDateTime, zone) === eventDay &&
                                                                (!booking.eventEndDateTime || formatBookingDate(booking.eventEndDateTime, zone) === eventDay)
                                                                ? [formatBookingTime(booking.eventStartDateTime, zone), booking.eventEndDateTime && formatBookingTime(booking.eventEndDateTime, zone)].filter(Boolean).join(' – ')
                                                                : slotLabel(booking.eventStartDateTime, booking.eventEndDateTime)}
                                                        </Text>
                                                    )}
                                                    {detailsOpen && <View style={styles.packageDetails}>
                                                        {(booking.quantity != null || !!booking.pricingMethod) && <Text style={styles.serviceDetailText}>
                                                            {[booking.quantity != null ? `Qty ${booking.quantity}` : '', booking.pricingMethod ? pricingLabel(booking) : ''].filter(Boolean).join(' · ')}
                                                        </Text>}
                                                        {booking.pricingMethod === 'GROUP' && <Text style={styles.serviceDetailText}>People included · {Number(booking.groupSize) * Number(booking.quantity || 1)}</Text>}
                                                    </View>}
                                                    <View style={styles.detailRow}>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.moneyLine}>{displayBookingMoney(total, moneyContext)}</Text>
                                                            {amounts[index].discount > 0 && <Text style={styles.serviceDetailText}>
                                                                {booking.promotionCode ? `Discount (${booking.promotionCode})` : 'Discount'} · −{displayBookingMoney(amounts[index].discount, moneyContext)}
                                                            </Text>}
                                                        </View>
                                                        <StatusChip status={paymentTone} label={paymentLabel === 'PAID' ? 'Fully paid' : paymentLabel === 'PARTIALLY_PAID' ? 'Partially paid' : titleCase(paymentLabel)} />
                                                    </View>
                                                    <View style={styles.paymentTrack}>
                                                        <View style={[styles.paymentFill, { backgroundColor: appearanceFor(paymentTone).color, width: `${paymentLabel === 'PAID' ? 100 : total > 0 ? Math.max(0, Math.min(100, paid / total * 100)) : 0}%` }]} />
                                                    </View>
                                                    <Text style={styles.serviceDetailText}>Paid {displayBookingMoney(paid, moneyContext)} · Left {displayBookingMoney(remaining, moneyContext)}</Text>
                                                    {showCompletion && (canComplete ? (
                                                        <TouchableOpacity accessibilityRole="button" disabled={completingBookingId !== null}
                                                            accessibilityState={{ disabled: completingBookingId !== null, busy: completingBookingId === booking._id }}
                                                            style={[styles.completeButton, styles.finishButton, completingBookingId !== null && styles.disabledAction]}
                                                            onPress={() => confirmCompletion(item._id, booking)}>
                                                            <Ionicons name="checkmark-outline" size={16} color="#fff" />
                                                            <Text style={styles.buttonText}>{completingBookingId === booking._id ? 'Completing…' : 'Mark Completed'}</Text>
                                                        </TouchableOpacity>
                                                    ) : <View style={styles.completionNotice}>
                                                        <Ionicons name="lock-closed-outline" size={15} color={PRIMARY} />
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.moneyLine}>Mark Completed</Text>
                                                            <Text style={styles.scheduleMeta}>{completionTime === null ? 'Scheduled service time unavailable.'
                                                                : timeLeft ? `Available in ${timeLeft}`
                                                                : 'Available once payment is secured.'}</Text>
                                                            {completionTime !== null && !!timeLeft && <Text style={styles.scheduleMeta}>
                                                                {completionLabel} · {formatBookingActivityTime(new Date(completionTime).toISOString(), zone)}
                                                            </Text>}
                                                        </View>
                                                    </View>)}
                                                    <BookingCancellationDetails booking={booking} timeZone={zone} audience="vendor"
                                                        refundState={{ record: refunds[String(booking._id)], loading: refundLoading, error: refundError }} />
                                                </View>
                                            );
                                        })}
                                        <View style={styles.detailsBlock}>
                                            <Text style={styles.moneyLine}>Total {displayBookingMoney(bookingTotal, item)} · Received {displayBookingMoney(totalPaid, item)} · Pending {displayBookingMoney(totalRemaining, item)}</Text>
                                            {discount > 0 && <Text style={styles.detailText}>Original price {displayBookingMoney(original, item)}</Text>}
                                            {platformFee > 0 && <Text style={styles.detailText}>Platform fee {displayBookingMoney(platformFee, item)} · Net booking value {displayBookingMoney(earnings, item)}</Text>}
                                        </View>
                                        <View style={styles.serviceDetailCard}>
                                            <View style={styles.detailRow}>
                                                <View style={styles.eventIconWrap}><Text style={styles.moneyLine}>{organizerName.charAt(0).toUpperCase()}</Text></View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.serviceDetailTitle}>{organizerName}</Text>
                                                    <Text style={styles.scheduleMeta}>Organizer</Text>
                                                </View>
                                            </View>
                                            {!!organizerPhone && <TouchableOpacity style={styles.detailRow} accessibilityRole="link"
                                                onPress={() => openOrderLink(`tel:${String(organizerPhone).replace(/[^+\d]/g, '')}`)}>
                                                <Ionicons name="call-outline" size={16} color={PRIMARY} />
                                                <Text style={[styles.detailText, styles.linkText]}>{organizerPhone}</Text>
                                            </TouchableOpacity>}
                                            {!!organizerEmail && <TouchableOpacity style={styles.detailRow} accessibilityRole="link"
                                                onPress={() => openOrderLink(`mailto:${encodeURIComponent(organizerEmail)}`)}>
                                                <Ionicons name="mail-outline" size={16} color={PRIMARY} />
                                                <Text style={[styles.detailText, styles.linkText]}>{organizerEmail}</Text>
                                            </TouchableOpacity>}
                                            {!organizerPhone && !organizerEmail && <Text style={styles.scheduleMeta}>Phone and email unavailable</Text>}
                                            <View style={styles.contactRow}>
                                                {!!organizerPhone && <TouchableOpacity accessibilityRole="link" accessibilityLabel="Call organizer"
                                                    style={styles.contactAction} onPress={() => openOrderLink(`tel:${String(organizerPhone).replace(/[^+\d]/g, '')}`)}>
                                                    <Ionicons name="call-outline" size={16} color={PRIMARY} /><Text style={styles.messageButtonText}>Call</Text>
                                                </TouchableOpacity>}
                                                {!!organizerEmail && <TouchableOpacity accessibilityRole="link" accessibilityLabel="Email organizer"
                                                    style={styles.contactAction} onPress={() => openOrderLink(`mailto:${encodeURIComponent(organizerEmail)}`)}>
                                                    <Ionicons name="mail-outline" size={16} color={PRIMARY} /><Text style={styles.messageButtonText}>Email</Text>
                                                </TouchableOpacity>}
                                                {!closed && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Chat with organizer"
                                                    style={styles.contactAction} onPress={() => handleMessageButtonClick(organizer, undefined, zone)}>
                                                    <Ionicons name="chatbubble-ellipses-outline" size={16} color={PRIMARY} /><Text style={styles.messageButtonText}>Chat</Text>
                                                </TouchableOpacity>}
                                            </View>
                                        </View>
                                    </>}
                                    {isExpanded && <>
                                    {!!(proposalBooking || proposalAnchor) && (
                                        <VendorScheduleProposal
                                            key={proposalBooking?.vendorScheduleProposal?.id || proposalAnchor._id}
                                            anchorId={proposalAnchor?._id || proposalBooking?._id}
                                            proposal={proposalBooking?.vendorScheduleProposal}
                                            canPropose={!!proposalAnchor && !scheduleHold}
                                            timeZone={bookingTimeZone(item)}
                                            onUpdated={refreshScreenData}
                                        />
                                    )}
                                    {services.filter((booking: any) => booking.laterTimeRequest).map((booking: any) => (
                                        <VendorLaterTimeRequest key={`later-${booking._id}`} booking={booking} event={item} available={isAcceptanceDisabled(booking, lateAcceptanceId)} onUpdated={refreshScreenData} />
                                    ))}
                                    {(isClosedVendorStatus(getVendorStatus(item)) || getVendorStatus(item) === 'cancelled') && <View style={styles.actionButtons}>
                                        <TouchableOpacity style={styles.messageButton} onPress={() => handleMessageButtonClick(item.organizerId, item.vendorOrders?.[0]?._id, bookingTimeZone(item))}>
                                            <Text style={styles.messageButtonText}>View chat history</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.messageButton} onPress={() => router.push('/contactus')}>
                                            <Text style={styles.messageButtonText}>Contact Support</Text>
                                        </TouchableOpacity>
                                    </View>}
                                    {isClosedVendorStatus(getVendorStatus(item)) ? (
                                        <View style={styles.closedBookingBox}>
                                            <Ionicons name="lock-closed-outline" size={16} color={PRIMARY} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.closedBookingTitle}>
                                                    {getVendorStatus(item) === PAYMENT_EXPIRED_STATUS ? "Payment window expired" : getVendorStatus(item) === EXPIRED_STATUS ? "Request expired" : "This booking is closed"}
                                                </Text>
                                                <Text style={styles.closedBookingText}>
                                                    {getVendorStatus(item) === PAYMENT_EXPIRED_STATUS
                                                        ? "The client did not complete the required payment before the deadline. This booking is now history only and the reserved slot has been released."
                                                        : getVendorStatus(item) === EXPIRED_STATUS
                                                        ? "This request was not accepted before the service started. It is kept for your history; new booking actions and messages are unavailable. You can still view chat history."
                                                        : "You are no longer assigned to this event."}
                                                </Text>
                                            </View>
                                        </View>
                                    ) : null}
                                        <TouchableOpacity style={styles.historyToggle} accessibilityRole="button" accessibilityState={{ expanded: historyOpen }}
                                            onPress={() => setExpandedHistory(historyOpen ? null : item._id)}>
                                            <Text style={styles.serviceDetailTitle}>History</Text>
                                            <Ionicons name={historyOpen ? 'chevron-up' : 'chevron-down'} size={16} color={PRIMARY} />
                                        </TouchableOpacity>
                                        {historyOpen && <>
                                            <Text style={styles.orderIdText}>Order ID: {item._id}</Text>
                                            <BookingActivity bookings={services} timeZone={zone} cancellationDetailsVisible hideTimeZone />
                                            <Text style={styles.serviceDetailText}>Times shown in {zone.replace(/_/g, ' ')}</Text>
                                        </>}
                                    </>}
                                </View>
                            </View>
                        );
                    }}
                />
            </View>
            <Modal visible={!!orderOptions} transparent animationType="fade" onRequestClose={() => setOrderOptions(null)}>
                <View style={styles.cancellationOverlay}>
                    <View style={styles.cancellationPanel} accessibilityViewIsModal>
                        <Text style={styles.cancellationTitle}>{orderOptions?.packages.length === 1 ? 'Cancel booking' : 'Choose a package to cancel'}</Text>
                        <ScrollView style={styles.optionsList}>
                            {orderOptions?.packages.map(booking => (
                                <TouchableOpacity key={booking._id} style={styles.historyToggle} accessibilityRole="button"
                                    onPress={() => {
                                        const orderId = orderOptions.id;
                                        setOrderOptions(null);
                                        void handleDelete(orderId, booking._id);
                                    }}>
                                    <Text style={styles.rescheduleWarning}>{booking.serviceName || 'Package'}</Text>
                                    <Ionicons name="chevron-forward" size={16} color={PRIMARY} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.cancellationKeep} onPress={() => setOrderOptions(null)}>
                            <Text style={styles.messageButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <Modal visible={!!cancellation} transparent animationType="slide" onRequestClose={() => { if (!cancellationLock.current) setCancellation(null); }}>
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
                            <TouchableOpacity accessibilityRole="button" disabled={cancelling} onPress={() => { if (!cancellationLock.current) setCancellation(null); }} style={styles.cancellationKeep}>
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

const SummaryCard = ({ label, value, icon, isActive = false }: {
    label: string;
    value: number;
    icon: keyof typeof Ionicons.glyphMap;
    isActive?: boolean;
}) => {
    const key = label === 'Fully Paid' ? 'paid' : label === 'Closed' ? 'expired' : label.toLowerCase().replace(/ /g, '_');
    const { color, background, icon: statusIcon } = appearanceFor(key);
    return <View style={[styles.filterChip, { backgroundColor: isActive ? color : background, borderColor: color }]}>
        <Ionicons name={key === 'all' ? icon : statusIcon} size={14} color={isActive ? '#FFF' : color} />
        <Text style={[styles.filterText, { color: isActive ? '#FFF' : color }]}>{label} {value}</Text>
    </View>;
};

const styles = StyleSheet.create({
    filterChip: { minHeight: 38, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF', borderRadius: 20, borderWidth: 1, borderColor: '#EAD7E5' },
    filterText: { color: PRIMARY, fontSize: 12, fontWeight: '700' },
    iconAction: { minWidth: 38, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    optionsList: { flexGrow: 0, maxHeight: 320, marginVertical: 12 },
    moneyLine: { color: PRIMARY, fontWeight: '800', fontSize: 13 },
    linkText: { flex: 1, color: PRIMARY, textDecorationLine: 'underline' },
    packageDetails: { gap: 4, paddingVertical: 5 },
    paymentTrack: { height: 6, backgroundColor: '#EBD8E8', borderRadius: 3, overflow: 'hidden', marginVertical: 5 },
    paymentFill: { height: '100%', backgroundColor: PRIMARY },
    contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    contactAction: { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', gap: 5, alignItems: 'center', borderRadius: 10, backgroundColor: PRIMARY_LIGHT },
    completionNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: PRIMARY_LIGHT },
    scheduleMeta: { color: '#675961', fontSize: 12, marginTop: 4 },
    historyToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
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
        marginHorizontal: 18,
        marginBottom: 18,
    },
    summaryContainer: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 7,
    },
    ordersList: {
        flex: 1,
    },
    ordersListContent: {
        paddingBottom: 30,
        paddingHorizontal: 18,
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
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: PRIMARY_LIGHT,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: "700",
        color: PRIMARY,
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
    originalBookingPrice: { textDecorationLine: "line-through", color: "#786B74" },
    bookingDiscountBadge: {
        color: "#614100", backgroundColor: "#FFE9AA", borderRadius: 9,
        fontSize: 11, fontWeight: "800", paddingHorizontal: 7, paddingVertical: 3,
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
    paidInFullBadge: { alignSelf: 'flex-start', backgroundColor: '#E5F5EB', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4, marginTop: 7 },
    paidInFullText: { color: '#236947', fontWeight: '700', fontSize: 11 },
    bookingActions: { gap: 10 },
    completionAction: { gap: 6 },
    completionHint: { color: '#695562', fontSize: 12, lineHeight: 17, textAlign: 'center' },
    finishButton: { backgroundColor: '#237247' },
    disabledAction: { backgroundColor: '#E5E5E5' },
    disabledActionText: { color: '#626262' },
    actionButtons: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    deleteButton: {
        flexGrow: 1,
        flexBasis: 120,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#A9273B',
        backgroundColor: '#A9273B',
        padding: 8,
        borderRadius: 10,
    },
    deleteButtonText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    completeButton: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: PRIMARY,
        padding: 8,
        borderRadius: 10,
    },
    closedBookingBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12, padding: 13, borderRadius: 12, backgroundColor: '#F8EEF5', borderWidth: 1, borderColor: '#E7CFDF' },
    closedBookingTitle: { color: PRIMARY, fontWeight: '800', fontSize: 13 },
    closedBookingText: { color: '#76636F', fontSize: 11.5, lineHeight: 17, marginTop: 2 },
    messageButton: {
        flexGrow: 1,
        flexBasis: 120,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#E7CFDF',
        backgroundColor: '#F8EEF5',
        padding: 8,
        borderRadius: 10,
    },
    messageButtonText: { color: PRIMARY, fontSize: 12, fontWeight: '700', textAlign: 'center' },
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

export { getVendorStatus };
