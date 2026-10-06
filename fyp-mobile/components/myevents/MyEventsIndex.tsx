//fyp-mobile/components/myevents/MyEventsIndex.tsx
import createConversation from '@/services/createConversation';
import getVendorOrders from '@/services/getVendorOrders';
import getPaymentStatus from '@/services/getPaymentStatus';
import { getRescheduleRequests } from '@/services/rescheduleBooking';
import { getUserData, getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';

// Large system font sizes ko limit karo taake layout na tootay
(Text as any).defaultProps = {
  ...((Text as any).defaultProps || {}),
  maxFontSizeMultiplier: 1.2,
};

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ───────────────────────── Theme ─────────────────────────
const COLORS = {
  primary: '#7B2869',
  primaryDark: '#3D1233',
  primarySoft: '#F1DDEB',
  bg: '#F8EAF2',
  surface: '#FFFFFF',
  surfaceTint: '#FFF8FC',
  vendorSurface: '#FBF4F8',
  border: '#F0DCE7',
  muted: '#8B7188',
  text: '#3D1233',
  success: '#28a745',
  danger: '#dc3545',
};

// TODO: replace with your real delete-event API call from services/
// e.g. import deleteVendorOrder from '@/services/deleteVendorOrder';
const deleteEventPlaceholder = async (_eventId: string) => {
  // Simulated network delay so the UI feels real while you wire up the backend call.
  await new Promise((resolve) => setTimeout(resolve, 400));
  return { success: true };
};

const statusStyleMap: Record<string, { bg: string; text: string; icon: any }> = {
  Upcoming: { bg: '#E7F0FF', text: '#007AFF', icon: 'time-outline' },
  Completed: { bg: '#E6F7EA', text: '#28a745', icon: 'checkmark-circle-outline' },
  Cancelled: { bg: '#FDEAEC', text: '#dc3545', icon: 'close-circle-outline' },
};

const vendorStatusStyleMap: Record<string, { bg: string; text: string; icon: any }> = {
  pending: { bg: '#FFF3CD', text: '#B8860B', icon: 'time-outline' },
  accepted: { bg: '#E7F0FF', text: '#007AFF', icon: 'checkmark-circle-outline' },
  completed: { bg: '#E6F7EA', text: '#28a745', icon: 'checkmark-done-outline' },
  cancelled: { bg: '#FDEAEC', text: '#dc3545', icon: 'close-circle-outline' },
};

const paymentChipMap: Record<string, { bg: string; text: string }> = {
  PAID: { bg: '#E6F7EA', text: '#278A4B' },
  PARTIALLY_PAID: { bg: '#E7F0FF', text: '#007AFF' },
  PAYMENT_REQUIRED: { bg: '#FFF3CD', text: '#9A6B00' },
  PAYMENT_FAILED: { bg: '#FDEAEC', text: '#DC3545' },
  PAYMENT_EXPIRED: { bg: '#FFF3CD', text: '#9A6B00' },
};

// ───────────────────────── Small UI helpers ─────────────────────────
const smoothLayout = () =>
  LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));

/** One-time soft entrance for each event card. */
const FadeInUp = ({ index, children }: { index: number; children: React.ReactNode }) => {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay: Math.min(index, 5) * 80,
      useNativeDriver: true,
    }).start();
  }, [index, progress]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
};

/** Compact tile used in the event details grid. */
const InfoTile = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View style={styles.infoTile}>
    <View style={styles.infoTileIcon}>
      <Ionicons name={icon} size={14} color={COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoTileLabel}>{label}</Text>
      <Text style={styles.infoTileValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  </View>
);

/** Label / value row used in the vendor details block. */
const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const MyEventsScreen = () => {
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [paymentBreakdowns, setPaymentBreakdowns] = useState<Record<string, any>>({});
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});
  const [expandedVendors, setExpandedVendors] = useState<Record<string, boolean>>({});
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);

  // Safely get the logged-in user, trying AsyncStorage first (where login
  // saves it via saveUserData), then falling back to SecureStore in case
  // some part of the app still saves it there.
  const resolveUser = async () => {
    const userFromAsync = await getUserData(); // already parsed, or null
    if (userFromAsync) return userFromAsync;

    const raw = await getSecureData('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse user from SecureStore:', e);
      return null;
    }
  };

  const fetchData = useCallback(async () => {
    setErrorMsg(null);
    try {
      const user = await resolveUser();
      if (!user || !user._id) {
        console.warn('No logged-in user found, cannot fetch events.');
        setErrorMsg('You need to be logged in to see your events.');
        setEvents([]);
        return;
      }
      const fetchedEvents = await getVendorOrders('Organizer', user._id);

      setEvents(fetchedEvents || []);

      try {
        const requests = await getRescheduleRequests();
        setRescheduleRequests(Array.isArray(requests) ? requests : []);
      } catch (error) {
        console.error('Could not load rescheduling requests:', error);
        setRescheduleRequests([]);
      }

      const paymentEntries = await Promise.all(
        (fetchedEvents || [])
          .flatMap((event: any) => event.vendorOrders || [])
          .filter((vendor: any) => {
            const status = String(vendor?.status || '').toLowerCase();
            return status === 'accepted' || status === 'completed';
          })
          .map(async (vendor: any) => {
            try {
              const breakdown = await getPaymentStatus(vendor._id);
              return [vendor._id, breakdown] as const;
            } catch (error) {
              console.error('Could not load payment breakdown:', vendor._id, error);
              return [vendor._id, null] as const;
            }
          }),
      );

      setPaymentBreakdowns(Object.fromEntries(paymentEntries));
    } catch (error) {
      console.error('Error fetching events:', error);
      setErrorMsg('Something went wrong while loading your events.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleEventDetails = (eventId: string) => {
    smoothLayout();
    setExpandedEvents((current) => ({
      ...current,
      [eventId]: !current[eventId],
    }));
  };

  const toggleVendorDetails = (vendorOrderId: string) => {
    smoothLayout();
    setExpandedVendors((current) => ({
      ...current,
      [vendorOrderId]: !current[vendorOrderId],
    }));
  };

  const formatDate = (value?: string | Date) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (value?: string | Date) => {
    if (!value) return 'N/A';

    if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
      const [hourPart, minutePart] = value.split(':');
      const hour = Number(hourPart);
      const minute = Number(minutePart);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (minutes?: number) => {
    const total = Number(minutes || 0);
    if (!total) return 'N/A';
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours && mins) return `${hours} hr ${mins} min`;
    if (hours) return `${hours} hr`;
    return `${mins} min`;
  };

  // Date badge pieces (UI only)
  const getDateBadge = (value?: string | Date) => {
    if (!value) return { day: '--', month: '---' };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { day: '--', month: '---' };
    return {
      day: String(date.getDate()),
      month: date.toLocaleDateString('en-GB', { month: 'short' }),
    };
  };

  const getDesiredServices = (event: any) => {
    const selectedServices = Array.isArray(event?.selectedCategoryIds)
      ? event.selectedCategoryIds
          .map(
            (category: any) =>
              category?.name || category?.categoryName || category?.normalizedName,
          )
          .filter(Boolean)
      : [];

    if (selectedServices.length > 0) {
      return [...new Set(selectedServices)].join(', ');
    }

    const vendorCategories = Array.isArray(event?.vendorOrders)
      ? event.vendorOrders
          .map(
            (vendorOrder: any) =>
              vendorOrder?.vendorId?.buisnessCategory?.name ||
              vendorOrder?.vendorId?.buisnessCategory?.categoryName ||
              vendorOrder?.vendorId?.buisnessCategory?.normalizedName,
          )
          .filter(Boolean)
      : [];

    return vendorCategories.length > 0 ? [...new Set(vendorCategories)].join(', ') : 'N/A';
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleDelete = (eventId: string, eventName: string) => {
    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${eventName}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(eventId);
            try {
              // Replace deleteEventPlaceholder with your real backend call, e.g.:
              // await deleteVendorOrder(eventId);
              const res = await deleteEventPlaceholder(eventId);
              if (res.success) {
                smoothLayout();
                setEvents((prev) => prev.filter((e) => e._id !== eventId));
              }
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Could not delete this event. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleMessage = async (vendor: any) => {
    try {
      const user = await resolveUser();
      if (!user || !user._id) {
        throw new Error('User not found');
      }
      const { chatId } = await createConversation(user._id, vendor?.vendorId?._id);

      const displayName =
        vendor?.vendorId?.contactDetails?.brandName || // brand name (agar backend business info bhi populate karta ho)
        vendor?.vendorId?.name || // fallback personal name
        'Conversation';

      await saveSecureData('chatId', chatId);
      await saveSecureData('receiverId', vendor?.vendorId?._id);
      await saveSecureData('receiverName', displayName);
      await saveSecureData('receiverAvatar', vendor?.vendorId?.contactDetails?.brandLogo || '');

      router.push(`/message`);
    } catch (error) {
      console.error('Error initiating conversation:', error);
    }
  };

  const goToPayment = (vendorOrderId: string) =>
    router.push({
      pathname: '/paymentmethod',
      params: { vendorOrderId },
    });

  // ─────────── Summary numbers for the hero card (display only) ───────────
  const totalVendors = events.reduce(
    (sum, e) => sum + (Array.isArray(e.vendorOrders) ? e.vendorOrders.length : 0),
    0,
  );
  const paymentsDue = events.reduce(
    (sum, e) =>
      sum +
      (Array.isArray(e.vendorOrders)
        ? e.vendorOrders.filter(
            (v: any) =>
              String(v?.paymentStatus || '').toUpperCase() === 'PAYMENT_REQUIRED',
          ).length
        : 0),
    0,
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Top bar */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 10 }]}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          style={styles.headerIconButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>

        <Text style={styles.title}>My Events</Text>

        <TouchableOpacity
          //onPress={() => router.push('/cartmanagment')}
          style={styles.headerIconButton}
          activeOpacity={0.7}
        >
          <Ionicons name="cart-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {loading ? (
          <View style={styles.centerState}>
            <View style={styles.stateIconWrap}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
            <Text style={styles.centerStateText}>Loading your events...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerState}>
            <View style={[styles.stateIconWrap, { backgroundColor: '#FDEAEC' }]}>
              <Ionicons name="alert-circle-outline" size={40} color={COLORS.danger} />
            </View>
            <Text style={styles.emptyTitle}>Couldn't load events</Text>
            <Text style={styles.centerStateText}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              activeOpacity={0.85}
              onPress={() => {
                setLoading(true);
                fetchData();
              }}
            >
              <Ionicons name="refresh" size={14} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.centerState}>
            <View style={styles.stateIconWrap}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.centerStateText}>
              Events you organize will show up here once created.
            </Text>
          </View>
        ) : (
          <>
            {/* Hero summary */}
            <View style={styles.hero}>
              <View style={styles.heroClip} pointerEvents="none">
                <View style={styles.heroCircleA} />
                <View style={styles.heroCircleB} />
              </View>

              <Text style={styles.heroGreeting}>Your planning at a glance</Text>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{events.length}</Text>
                  <Text style={styles.heroStatLabel}>
                    {events.length === 1 ? 'Event' : 'Events'}
                  </Text>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{totalVendors}</Text>
                  <Text style={styles.heroStatLabel}>
                    {totalVendors === 1 ? 'Vendor' : 'Vendors'}
                  </Text>
                </View>

                <View style={styles.heroStatDivider} />

                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{paymentsDue}</Text>
                  <Text style={styles.heroStatLabel}>Payments due</Text>
                </View>
              </View>
            </View>

            {events.map((event, eventIndex) => {
              const isDeleting = deletingId === event._id;
              const eventExpanded = !!expandedEvents[event._id];
              const badge = getDateBadge(event.eventDate);
              const vendorOrders: any[] = Array.isArray(event.vendorOrders)
                ? event.vendorOrders
                : [];

              return (
                <FadeInUp key={event._id} index={eventIndex}>
                  <View style={[styles.card, isDeleting && styles.cardDeleting]}>
                    {/* ───── Event header ───── */}
                    <View style={styles.cardTopRow}>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => toggleEventDetails(event._id)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.expandHeaderRow}>
                          <View style={styles.dateBadge}>
                            <Text style={styles.dateBadgeDay}>{badge.day}</Text>
                            <Text style={styles.dateBadgeMonth}>{badge.month}</Text>
                          </View>

                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.eventName} numberOfLines={1}>
                              {event.eventName}
                            </Text>

                            <View style={styles.infoRow}>
                              <Ionicons name="calendar-outline" size={13} color="#777" />
                              <Text style={styles.info}>{formatDate(event.eventDate)}</Text>
                            </View>

                            <View style={styles.metaChipsRow}>
                              {!!event.eventType && (
                                <View style={styles.metaChip}>
                                  <Text style={styles.metaChipText}>{event.eventType}</Text>
                                </View>
                              )}
                              {event.guests != null && (
                                <View style={styles.metaChip}>
                                  <Ionicons name="people-outline" size={11} color={COLORS.primary} />
                                  <Text style={styles.metaChipText}>{event.guests}</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          <View style={styles.chevronCircle}>
                            <Ionicons
                              name={eventExpanded ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color={COLORS.primary}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        disabled={isDeleting}
                        activeOpacity={0.7}
                        onPress={() => handleDelete(event._id, event.eventName)}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color={COLORS.danger} />
                        ) : (
                          <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                        )}
                      </TouchableOpacity>
                    </View>

                    {/* ───── Event details ───── */}
                    {eventExpanded && (
                      <View style={styles.detailsPanel}>
                        <Text style={styles.detailsSectionTitle}>Event details</Text>

                        <View style={styles.tileGrid}>
                          <InfoTile
                            icon="sparkles-outline"
                            label="Event type"
                            value={event.eventType || 'N/A'}
                          />
                          <InfoTile
                            icon="people-outline"
                            label="Guests"
                            value={String(event.guests ?? 'N/A')}
                          />
                          <InfoTile
                            icon="calendar-outline"
                            label="Date"
                            value={formatDate(event.eventDate)}
                          />
                          <InfoTile
                            icon="location-outline"
                            label="City"
                            value={event?.eventCityId?.name || 'N/A'}
                          />
                        </View>

                        {/* Timeline */}
                        <View style={styles.timeline}>
                          <View style={styles.timelineItem}>
                            <View style={styles.timelineDot} />
                            <View style={styles.timelineLine} />
                            <View style={styles.timelineContent}>
                              <Text style={styles.detailLabel}>Start time</Text>
                              <Text style={styles.timelineValue}>
                                {formatTime(event.eventStartDateTime || event.eventTime)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.timelineItem}>
                            <View style={[styles.timelineDot, styles.timelineDotEnd]} />
                            <View style={styles.timelineContent}>
                              <Text style={styles.detailLabel}>End time</Text>
                              <Text style={styles.timelineValue}>
                                {formatTime(event.eventEndDateTime)}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.durationPill}>
                            <Ionicons name="hourglass-outline" size={12} color={COLORS.primary} />
                            <Text style={styles.durationPillText}>
                              {formatDuration(event.eventDurationMinutes)}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.detailBlock}>
                          <View style={styles.detailBlockHeader}>
                            <Ionicons name="navigate-outline" size={13} color={COLORS.muted} />
                            <Text style={styles.detailLabel}>Event address</Text>
                          </View>
                          <Text style={styles.detailValueLeft}>{event.eventAddress || 'N/A'}</Text>
                        </View>

                        <View style={styles.detailBlock}>
                          <View style={styles.detailBlockHeader}>
                            <Ionicons name="albums-outline" size={13} color={COLORS.muted} />
                            <Text style={styles.detailLabel}>Desired services</Text>
                          </View>
                          <Text style={styles.detailValueLeft}>{getDesiredServices(event)}</Text>
                        </View>
                      </View>
                    )}

                    {eventExpanded && !['completed', 'cancelled'].includes(String(event.status || '').toLowerCase()) && (
                      <TouchableOpacity
                        style={styles.rescheduleButton}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: '/reschedulebooking',
                            params: {
                              orderId: event._id,
                              eventName: event.eventName,
                              eventDate: event.eventDate,
                              eventTime: event.eventTime,
                              durationMinutes: String(event.eventDurationMinutes || 60),
                            },
                          })
                        }
                      >
                        <Ionicons name="calendar-outline" size={17} color="#FFFFFF" />
                        <Text style={styles.rescheduleButtonText}>Request Date/Time Change</Text>
                      </TouchableOpacity>
                    )}

                    {eventExpanded && rescheduleRequests.some((request: any) => String(request.orderId) === String(event._id)) && (
                      <View style={styles.rescheduleStatusCard}>
                        <Text style={styles.rescheduleStatusTitle}>Rescheduling status</Text>
                        {rescheduleRequests
                          .filter((request: any) => String(request.orderId) === String(event._id))
                          .map((request: any) => {
                            const vendorOrder = vendorOrders.find((item: any) => String(item._id) === String(request.vendorOrderId));
                            const vendorData = vendorOrder?.vendorId || {};
                            const vendorName = vendorData?.contactDetails?.brandName || vendorData?.name || vendorOrder?.serviceName || 'Vendor';
                            const status = String(request.status || 'CHANGE_REQUESTED');
                            const statusLabel =
                              status === 'CHANGE_REQUESTED' ? 'Waiting for vendor' :
                              status === 'ACCEPTED' ? 'New date accepted' :
                              status === 'REJECTED' ? 'New date rejected' : 'Request expired';
                            return (
                              <View key={request._id} style={styles.rescheduleStatusRow}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.rescheduleVendorName}>{vendorName}</Text>
                                  <Text style={styles.rescheduleRequestedTime}>
                                    {formatDate(request.newEventDate)} • {formatTime(request.newStartTime)}
                                  </Text>
                                </View>
                                <View style={[
                                  styles.rescheduleChip,
                                  status === 'ACCEPTED' && { backgroundColor: '#E6F7EA' },
                                  status === 'REJECTED' && { backgroundColor: '#FDEAEC' },
                                ]}>
                                  <Text style={[
                                    styles.rescheduleChipText,
                                    status === 'ACCEPTED' && { color: COLORS.success },
                                    status === 'REJECTED' && { color: COLORS.danger },
                                  ]}>{statusLabel}</Text>
                                </View>
                              </View>
                            );
                          })}
                        {rescheduleRequests.some((request: any) => String(request.orderId) === String(event._id) && request.status === 'REJECTED') && (
                          <Text style={styles.rescheduleHelp}>
                            A vendor rejected the new timing. The original booking remains unchanged.
                          </Text>
                        )}
                      </View>
                    )}

                    <View style={styles.divider} />

                    <View style={styles.sectionHeaderRow}>
                      <Text style={styles.sectionTitle}>Vendors</Text>
                      <View style={styles.countBubble}>
                        <Text style={styles.countBubbleText}>{vendorOrders.length}</Text>
                      </View>
                    </View>

                    {/* ───── Vendors ───── */}
                    {vendorOrders.map((vendor: any, index: number) => {
                      const vendorStatus = String(vendor?.status || 'pending').toLowerCase();

                      const vendorData = vendor?.vendorId || {};

                      const vendorBrandName =
                        vendorData?.contactDetails?.brandName || vendorData?.name || 'Vendor';

                      const vendorAccountName = vendorData?.name || 'N/A';

                      const vendorCategory =
                        vendorData?.buisnessCategory?.name ||
                        vendorData?.buisnessCategory?.normalizedName ||
                        'N/A';

                      const vendorServiceCities = Array.isArray(vendorData?.serviceLocationCityIds)
                        ? vendorData.serviceLocationCityIds
                            .map((city: any) => city?.name)
                            .filter(Boolean)
                            .join(', ')
                        : 'N/A';

                      const vendorBusinessCity = vendorData?.businessCityId?.name || 'N/A';

                      const vendorPhone =
                        vendorData?.contactDetails?.contactNumber ||
                        vendorData?.phone_number ||
                        'N/A';

                      const vendorSecondaryPhone =
                        vendorData?.contactDetails?.contactNumberSecondary || '';

                      const vendorBookingEmail =
                        vendorData?.contactDetails?.bookingEmail || vendorData?.email || 'N/A';

                      const vendorWebsite = vendorData?.contactDetails?.website || 'N/A';

                      const vendorInstagram = vendorData?.contactDetails?.instagramLink || 'N/A';

                      const vendorOfficeAddress =
                        vendorData?.contactDetails?.officialAddress ||
                        vendorData?.businessAddress ||
                        'N/A';

                      const vendorExpanded = !!expandedVendors[vendor._id];

                      const bookedPackage = Array.isArray(vendorData?.packages)
                        ? vendorData.packages.find(
                            (pkg: any) => String(pkg?._id) === String(vendor?.packageId || ''),
                          )
                        : null;

                      const bookingType = String(
                        bookedPackage?.bookingType || 'DURATION_BASED',
                      ).toUpperCase();

                      const vStatus =
                        vendorStatusStyleMap[vendorStatus] || vendorStatusStyleMap.pending;

                      const paymentStatus = String(vendor?.paymentStatus || 'UNPAID').toUpperCase();

                      const finalAmount = Number(vendor?.finalAmount ?? vendor?.price ?? 0);

                      const downPaymentAmount = Number(vendor?.downPaymentAmount ?? 0);

                      const remainingAmount = Number(
                        vendor?.remainingAmount ?? Math.max(finalAmount - downPaymentAmount, 0),
                      );

                      const paymentDeadline = vendor?.paymentDeadline
                        ? new Date(vendor.paymentDeadline)
                        : null;

                      const paymentBreakdown = paymentBreakdowns[vendor._id];

                      const pendingPayment = paymentBreakdown?.pendingPayment;

                      const hasPendingPayment = !!pendingPayment;

                      const successfulPayment = paymentBreakdown?.latestSuccessfulPayment;

                      const hasSuccessfulPayment = !!successfulPayment;

                      // Progress bar (display only)
                      const paidSoFar =
                        paymentStatus === 'PAID'
                          ? finalAmount
                          : paymentStatus === 'PARTIALLY_PAID'
                            ? downPaymentAmount
                            : 0;
                      const paidPercent =
                        finalAmount > 0
                          ? Math.min(100, Math.round((paidSoFar / finalAmount) * 100))
                          : 0;

                      const payChip = paymentChipMap[paymentStatus] || {
                        bg: COLORS.primarySoft,
                        text: COLORS.primary,
                      };

                      return (
                        <View key={vendor._id || index} style={styles.vendorCard}>
                          {/* Vendor header */}
                          <TouchableOpacity
                            onPress={() => toggleVendorDetails(vendor._id)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.vendorHeaderRow}>
                              <View style={styles.vendorAvatar}>
                                <Text style={styles.vendorAvatarText}>
                                  {String(vendorBrandName).trim().charAt(0).toUpperCase() || 'V'}
                                </Text>
                              </View>

                              <View style={{ flex: 1 }}>
                                <Text style={styles.vendorText} numberOfLines={1}>
                                  {vendorBrandName}
                                </Text>
                                <Text style={styles.packageText} numberOfLines={1}>
                                  {vendor.serviceName}
                                </Text>
                              </View>

                              <Ionicons
                                name={vendorExpanded ? 'chevron-up' : 'chevron-down'}
                                size={18}
                                color={COLORS.primary}
                              />
                            </View>
                          </TouchableOpacity>

                          {/* Price block */}
                          {vendor?.promotionCode && Number(vendor?.discountAmount || 0) > 0 ? (
                            <View style={styles.promotionSnapshot}>
                              <View style={styles.amountRow}>
                                <Text style={styles.amountLabel}>Original Amount</Text>
                                <Text style={styles.amountValueStrike}>
                                  Rs.{' '}
                                  {Number(
                                    vendor?.originalAmount ?? vendor?.price ?? 0,
                                  ).toLocaleString()}
                                </Text>
                              </View>

                              <View style={styles.amountRow}>
                                <View style={styles.promoTag}>
                                  <Ionicons name="pricetag" size={10} color={COLORS.success} />
                                  <Text style={styles.discountLabel}>{vendor.promotionCode}</Text>
                                </View>
                                <Text style={styles.discountValue}>
                                  - Rs. {Number(vendor?.discountAmount || 0).toLocaleString()}
                                </Text>
                              </View>

                              <View style={styles.amountDivider} />

                              <View style={styles.amountRow}>
                                <Text style={styles.finalAmountLabel}>Final Amount</Text>
                                <Text style={styles.finalAmountValue}>
                                  Rs.{' '}
                                  {Number(vendor?.finalAmount ?? vendor?.price ?? 0).toLocaleString()}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <Text style={styles.priceText}>
                              Rs. {Number(vendor?.finalAmount ?? vendor?.price ?? 0).toLocaleString()}
                            </Text>
                          )}

                          {/* Vendor expanded details */}
                          {vendorExpanded && (
                            <View style={styles.vendorDetailsPanel}>
                              <Text style={styles.detailsSectionTitle}>Vendor details</Text>

                              <DetailRow label="Brand name" value={vendorBrandName} />
                              <DetailRow label="Vendor name" value={vendorAccountName} />
                              <DetailRow label="Category" value={vendorCategory} />
                              <DetailRow label="Service cities" value={vendorServiceCities || 'N/A'} />
                              <DetailRow label="Business city" value={vendorBusinessCity} />
                              <DetailRow label="Phone" value={vendorPhone} />

                              {!!vendorSecondaryPhone && (
                                <DetailRow label="Alternate phone" value={vendorSecondaryPhone} />
                              )}

                              <DetailRow label="Booking email" value={vendorBookingEmail} />
                              <DetailRow label="Website" value={vendorWebsite} />
                              <DetailRow label="Instagram" value={vendorInstagram} />

                              <View style={styles.detailBlock}>
                                <View style={styles.detailBlockHeader}>
                                  <Ionicons name="business-outline" size={13} color={COLORS.muted} />
                                  <Text style={styles.detailLabel}>Official office address</Text>
                                </View>
                                <Text style={styles.detailValueLeft}>{vendorOfficeAddress}</Text>
                              </View>

                              <DetailRow label="Package" value={vendor.serviceName || 'N/A'} />

                              {bookingType === 'DELIVERY_BASED' ? (
                                <DetailRow
                                  label="Delivered at"
                                  value={
                                    vendor?.eventStartDateTime
                                      ? `${formatDate(vendor.eventStartDateTime)} • ${formatTime(
                                          vendor.eventStartDateTime,
                                        )}`
                                      : 'N/A'
                                  }
                                />
                              ) : bookingType === 'SETUP_BASED' ? (
                                <>
                                  <DetailRow
                                    label="Setup start"
                                    value={formatTime(vendor.eventStartDateTime)}
                                  />
                                  <DetailRow
                                    label="Setup end"
                                    value={formatTime(vendor.eventEndDateTime)}
                                  />
                                </>
                              ) : bookingType === 'TIME_SLOT_BASED' ? (
                                <>
                                  <DetailRow
                                    label="Appointment start"
                                    value={formatTime(vendor.eventStartDateTime)}
                                  />
                                  <DetailRow
                                    label="Appointment end"
                                    value={formatTime(vendor.eventEndDateTime)}
                                  />
                                </>
                              ) : (
                                <>
                                  <DetailRow
                                    label="Service start"
                                    value={formatTime(vendor.eventStartDateTime)}
                                  />
                                  <DetailRow
                                    label="Service end"
                                    value={formatTime(vendor.eventEndDateTime)}
                                  />
                                </>
                              )}
                            </View>
                          )}

                          {/* Status + message row */}
                          <View style={styles.vendorFooterRow}>
                            <View style={[styles.statusPill, { backgroundColor: vStatus.bg }]}>
                              <Ionicons name={vStatus.icon} size={12} color={vStatus.text} />
                              <Text
                                style={[
                                  styles.statusPillText,
                                  { color: vStatus.text, textTransform: 'capitalize' },
                                ]}
                              >
                                {vendorStatus}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={styles.messageButton}
                              activeOpacity={0.85}
                              onPress={() => handleMessage(vendor)}
                            >
                              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
                              <Text style={styles.messageButtonText}>Message</Text>
                            </TouchableOpacity>
                          </View>

                          {/* ───── Payment panel ───── */}
                          {(vendorStatus === 'accepted' || vendorStatus === 'completed') && (
                            <View style={styles.paymentBox}>
                              <View style={styles.paymentHeaderRow}>
                                <View style={styles.paymentTitleWrap}>
                                  <Ionicons name="wallet-outline" size={14} color={COLORS.primary} />
                                  <Text style={styles.paymentTitle}>Payment</Text>
                                </View>

                                <View style={[styles.paymentChip, { backgroundColor: payChip.bg }]}>
                                  <Text style={[styles.paymentStatusText, { color: payChip.text }]}>
                                    {paymentStatus.replace(/_/g, ' ')}
                                  </Text>
                                </View>
                              </View>

                              {/* Progress */}
                              <View style={styles.progressTrack}>
                                <View
                                  style={[styles.progressFill, { width: `${paidPercent}%` }]}
                                />
                              </View>

                              <View style={styles.paymentFigures}>
                                <View style={styles.paymentFigure}>
                                  <Text style={styles.paymentLabel}>Total</Text>
                                  <Text style={styles.paymentValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                                    Rs. {finalAmount.toLocaleString()}
                                  </Text>
                                </View>

                                <View style={styles.paymentFigure}>
                                  <Text style={styles.paymentLabel}>Down payment</Text>
                                  <Text style={styles.paymentValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                                    Rs. {downPaymentAmount.toLocaleString()}
                                  </Text>
                                </View>

                                <View style={[styles.paymentFigure, { alignItems: 'flex-end' }]}>
                                  <Text style={styles.paymentLabel}>Remaining</Text>
                                  <Text style={styles.paymentValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                                    Rs. {remainingAmount.toLocaleString()}
                                  </Text>
                                </View>
                              </View>

                              {paymentDeadline && (
                                <View style={styles.deadlineRow}>
                                  <Ionicons name="alarm-outline" size={12} color="#B8860B" />
                                  <Text style={styles.paymentDeadlineText}>
                                    Pay before {paymentDeadline.toLocaleString()}
                                  </Text>
                                </View>
                              )}

                              {hasPendingPayment && (
                                <View style={styles.paymentPendingBox}>
                                  <Text style={styles.paymentPendingText}>
                                    {String(pendingPayment?.type || '').toUpperCase() === 'REMAINING'
                                      ? 'Remaining payment is awaiting confirmation.'
                                      : 'Down payment is awaiting confirmation.'}
                                  </Text>

                                  <Text style={styles.paymentPendingSubtext}>
                                    Rs. {Number(pendingPayment?.amount || 0).toLocaleString()}
                                    {' • '}
                                    {String(pendingPayment?.method || '').toUpperCase()}
                                  </Text>
                                </View>
                              )}

                              {paymentStatus === 'PAYMENT_REQUIRED' && !hasPendingPayment && (
                                <TouchableOpacity
                                  style={styles.payNowButton}
                                  activeOpacity={0.85}
                                  onPress={() => goToPayment(vendor._id)}
                                >
                                  <Ionicons name="card-outline" size={15} color="#fff" />
                                  <Text style={styles.payNowButtonText}>Pay Down Payment</Text>
                                </TouchableOpacity>
                              )}

                              {paymentStatus === 'PAYMENT_FAILED' && !hasPendingPayment && (
                                <>
                                  <View style={styles.paymentFailedBox}>
                                    <Ionicons name="warning-outline" size={13} color="#DC3545" />
                                    <Text style={styles.paymentFailedText}>
                                      Previous payment attempt failed.
                                    </Text>
                                  </View>

                                  <TouchableOpacity
                                    style={styles.payNowButton}
                                    activeOpacity={0.85}
                                    onPress={() => goToPayment(vendor._id)}
                                  >
                                    <Ionicons name="refresh" size={15} color="#fff" />
                                    <Text style={styles.payNowButtonText}>Retry Down Payment</Text>
                                  </TouchableOpacity>
                                </>
                              )}

                              {paymentStatus === 'PARTIALLY_PAID' && vendorStatus !== 'completed' && (
                                <View style={styles.paidInfoBox}>
                                  <Ionicons name="information-circle-outline" size={14} color="#278A4B" />
                                  <Text style={styles.paidInfoText}>
                                    Down payment paid. Remaining amount will be due after service
                                    completion.
                                  </Text>
                                </View>
                              )}

                              {paymentStatus === 'PARTIALLY_PAID' &&
                                vendorStatus === 'completed' &&
                                !hasPendingPayment && (
                                  <TouchableOpacity
                                    style={styles.payNowButton}
                                    activeOpacity={0.85}
                                    onPress={() => goToPayment(vendor._id)}
                                  >
                                    <Ionicons name="card-outline" size={15} color="#fff" />
                                    <Text style={styles.payNowButtonText}>Pay Remaining Amount</Text>
                                  </TouchableOpacity>
                                )}

                              {paymentStatus === 'PAID' && (
                                <View style={styles.paidInfoBox}>
                                  <Ionicons name="checkmark-circle" size={14} color="#278A4B" />
                                  <Text style={styles.paidInfoText}>Payment completed</Text>
                                </View>
                              )}

                              {hasSuccessfulPayment && (
                                <TouchableOpacity
                                  style={styles.receiptButton}
                                  activeOpacity={0.8}
                                  onPress={() =>
                                    router.push({
                                      pathname: '/paymentconfirmation',
                                      params: {
                                        vendorOrderId: vendor._id,
                                      },
                                    })
                                  }
                                >
                                  <Ionicons name="receipt-outline" size={14} color={COLORS.primary} />
                                  <Text style={styles.receiptButtonText}>View Receipt</Text>
                                </TouchableOpacity>
                              )}

                              {paymentStatus === 'PAYMENT_EXPIRED' && (
                                <View style={styles.paymentExpiredBox}>
                                  <Ionicons name="time-outline" size={13} color="#9A6B00" />
                                  <Text style={styles.paymentExpiredText}>
                                    Payment window expired.
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}

                    {/* ───── Total ───── */}
                    <View style={styles.totalRow}>
                      <View>
                        <Text style={styles.totalLabel}>Total Event Price</Text>
                        <Text style={styles.totalHint}>
                          {vendorOrders.length} {vendorOrders.length === 1 ? 'vendor' : 'vendors'}
                        </Text>
                      </View>
                      <Text style={styles.totalPrice}>Rs. {event.totalAmount}</Text>
                    </View>
                  </View>
                </FadeInUp>
              );
            })}
          </>
        )}
      </ScrollView>

      <BottomNavigationFinal />
    </View>
  );
};

export default MyEventsScreen;

const styles = StyleSheet.create({
  rescheduleButton: { marginTop: 16, backgroundColor: COLORS.primary, minHeight: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  rescheduleButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  rescheduleStatusCard: { marginTop: 14, padding: 14, backgroundColor: '#FFF8FC', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  rescheduleStatusTitle: { color: COLORS.primaryDark, fontWeight: '800', fontSize: 14, marginBottom: 10 },
  rescheduleStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F4E5EE' },
  rescheduleVendorName: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  rescheduleRequestedTime: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  rescheduleChip: { maxWidth: 135, backgroundColor: '#FFF3CD', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 6 },
  rescheduleChipText: { color: '#8A6500', fontSize: 10.5, fontWeight: '800', textAlign: 'center' },
  rescheduleHelp: { color: COLORS.danger, fontSize: 12, lineHeight: 18, marginTop: 10 },
  container: {
    flex: 1,
  },

  // ── Top bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.bg,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.primaryDark,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // ── Hero summary
  hero: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 18,
    padding: 20,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  heroClip: {
    ...StyleSheet.absoluteFill,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroCircleA: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -50,
    right: -30,
  },
  heroCircleB: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -30,
    left: 40,
  },
  heroGreeting: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F1DDEB',
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: {
    flex: 1,
    alignItems: 'flex-start',
  },
  heroStatValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  heroStatLabel: {
    fontSize: 12,
    color: '#F1DDEB',
    marginTop: 2,
    fontWeight: '600',
  },
  heroStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginHorizontal: 14,
  },

  // ── States
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 90,
    paddingHorizontal: 40,
  },
  stateIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4A2140',
    marginTop: 18,
  },
  centerStateText: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 18,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Event card
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  cardDeleting: {
    opacity: 0.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  expandHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    width: 56,
    height: 62,
    borderRadius: 16,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadgeDay: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    lineHeight: 26,
  },
  dateBadgeMonth: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    opacity: 0.8,
  },
  eventName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#222',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  info: {
    fontSize: 12.5,
    color: '#777',
    marginLeft: 2,
  },
  metaChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceTint,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metaChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FDEAEC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  // ── Event details
  detailsPanel: {
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceTint,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 12,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  infoTile: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoTileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTileLabel: {
    fontSize: 10.5,
    color: COLORS.muted,
    fontWeight: '600',
  },
  infoTileValue: {
    fontSize: 12.5,
    color: COLORS.text,
    fontWeight: '700',
    marginTop: 1,
  },

  // Timeline
  timeline: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 40,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 3,
  },
  timelineDotEnd: {
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  timelineLine: {
    position: 'absolute',
    left: 5,
    top: 17,
    bottom: -4,
    width: 2,
    backgroundColor: COLORS.primarySoft,
  },
  timelineContent: {
    marginLeft: 14,
    flex: 1,
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 1,
  },
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
  },
  durationPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },

  detailBlock: {
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
    flexShrink: 0,
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '700',
    textAlign: 'right',
  },
  detailValueLeft: {
    marginTop: 4,
    fontSize: 12.5,
    color: COLORS.text,
    fontWeight: '700',
    lineHeight: 18,
  },

  divider: {
    height: 1,
    backgroundColor: '#F0E4EE',
    marginVertical: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#4A2140',
  },
  countBubble: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBubbleText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.primary,
  },

  // ── Vendor card
  vendorCard: {
    backgroundColor: COLORS.vendorSurface,
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3E3EC',
  },
  vendorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vendorAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorAvatarText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  vendorText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  packageText: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  priceText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primary,
  },
  vendorDetailsPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFDCE9',
  },

  promotionSnapshot: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EEDDE8',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  amountDivider: {
    height: 1,
    backgroundColor: '#F0E4EE',
    marginVertical: 6,
  },
  amountLabel: {
    fontSize: 12,
    color: '#777',
  },
  amountValueStrike: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  promoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#E6F7EA',
  },
  discountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.success,
  },
  discountValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.success,
  },
  finalAmountLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#333',
  },
  finalAmountValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.success,
  },

  vendorFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 20,
    gap: 4,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Payment panel
  paymentBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEDDE8',
  },
  paymentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  paymentTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  paymentChip: {
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primarySoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  paymentFigures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  paymentFigure: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 10.5,
    color: '#888',
    fontWeight: '600',
  },
  paymentValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#333',
    marginTop: 2,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FFF8E7',
  },
  paymentDeadlineText: {
    fontSize: 10.5,
    color: '#B8860B',
    fontWeight: '600',
    flex: 1,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  payNowButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  paidInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E6F7EA',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  paidInfoText: {
    flex: 1,
    fontSize: 11,
    color: '#278A4B',
    fontWeight: '700',
  },
  paymentFailedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FDEAEC',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  paymentFailedText: {
    flex: 1,
    fontSize: 11,
    color: '#DC3545',
    fontWeight: '700',
  },
  paymentExpiredBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  paymentExpiredText: {
    flex: 1,
    fontSize: 11,
    color: '#9A6B00',
    fontWeight: '700',
  },
  paymentPendingBox: {
    backgroundColor: '#FFF8E7',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F7E6B5',
  },
  paymentPendingText: {
    fontSize: 11,
    color: '#9A6B00',
    fontWeight: '700',
    textAlign: 'center',
  },
  paymentPendingSubtext: {
    fontSize: 11,
    color: '#8A6D1F',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 3,
  },
  receiptButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  receiptButtonText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.bg,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  totalHint: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  totalPrice: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.success,
  },
});