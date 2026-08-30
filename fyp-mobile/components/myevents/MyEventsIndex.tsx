//fyp-mobile/components/myevents/MyEventsIndex.tsx
import createConversation from '@/services/createConversation';
import getVendorOrders from '@/services/getVendorOrders';
import { getUserData, getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';

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
  accepted: { bg: '#E7F0FF', text: '#007AFF', icon: 'checkmark-outline' },
  completed: { bg: '#E6F7EA', text: '#28a745', icon: 'checkmark-circle-outline' },
  rejected: { bg: '#FDEAEC', text: '#dc3545', icon: 'close-circle-outline' },
  cancelled: { bg: '#FDEAEC', text: '#dc3545', icon: 'close-circle-outline' },
};

const MyEventsScreen = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      ]
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
      vendor?.vendorId?.contactDetails?.brandName ||   // brand name (agar backend business info bhi populate karta ho)
      vendor?.vendorId?.name ||                         // fallback personal name
      'Conversation';

    await saveSecureData('chatId', chatId);
    await saveSecureData('receiverId', vendor?.vendorId?._id);
    await saveSecureData('receiverName', displayName);   // 🆕 yeh line add karo
    await saveSecureData('receiverAvatar', vendor?.vendorId?.contactDetails?.brandLogo || ''); // optional, consistency ke liye

    router.push(`/message`);
  } catch (error) {
    console.error('Error initiating conversation:', error);
  }
};

  return (
    <View style={{ flex: 1, backgroundColor: '#F8EAF2' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          style={styles.headerIconButton}
        >
          <Ionicons name="chevron-back" size={22} color="#7B2869" />
        </TouchableOpacity>

        <Text style={styles.title}>My Events</Text>

        <TouchableOpacity
          onPress={() => router.push('/cartmanagment')}
          style={styles.headerIconButton}
        >
          <Ionicons name="cart-outline" size={22} color="#7B2869" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7B2869" />
        }
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#7B2869" />
            <Text style={styles.centerStateText}>Loading your events...</Text>
          </View>
        ) : errorMsg ? (
          <View style={styles.centerState}>
            <Ionicons name="alert-circle-outline" size={56} color="#dc3545" />
            <Text style={styles.emptyTitle}>Couldn't load events</Text>
            <Text style={styles.centerStateText}>{errorMsg}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setLoading(true);
                fetchData();
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.centerState}>
            <Ionicons name="calendar-outline" size={56} color="#C9A2BC" />
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.centerStateText}>
              Events you organize will show up here once created.
            </Text>
          </View>
        ) : (
          events.map((event) => {
            const statusInfo = statusStyleMap[event.status] || statusStyleMap.Upcoming;
            const isDeleting = deletingId === event._id;

            return (
              <View key={event._id} style={[styles.card, isDeleting && styles.cardDeleting]}>
                {/* Card top row */}
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventName}>{event.eventName}</Text>
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={14} color="#777" />
                      <Text style={styles.info}>
                        {new Date(event.eventDate).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    disabled={isDeleting}
                    onPress={() => handleDelete(event._id, event.eventName)}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#dc3545" />
                    ) : (
                      <Ionicons name="trash-outline" size={18} color="#dc3545" />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Vendors</Text>

              {event.vendorOrders.map((vendor: any, index: number) => {
        const vStatus =
          vendorStatusStyleMap[vendor.status] || vendorStatusStyleMap.pending;

        return (
          <View key={index} style={styles.vendorCard}>
                    <View style={styles.vendorAvatar}>
                      <Ionicons name="person-outline" size={16} color="#7B2869" />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.vendorText}>
  {vendor?.vendorId?.contactDetails?.brandName || vendor?.vendorId?.name}
</Text>
                      <Text style={styles.packageText}>
                        {vendor.serviceName} · Rs. {vendor.price}
                      </Text>
                      <View
  style={[
    styles.statusPill,
    { backgroundColor: vStatus.bg, marginTop: 4 },
  ]}
>
  <Ionicons
    name={vStatus.icon}
    size={12}
    color={vStatus.text}
  />
  <Text
    style={[
      styles.statusPillText,
      { color: vStatus.text, fontSize: 11 },
    ]}
  >
    {vendor.status}
  </Text>
</View>
                    </View>

                    <TouchableOpacity
                      style={styles.messageButton}
                      onPress={() => handleMessage(vendor)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color="#fff" />
                      <Text style={styles.messageButtonText}>Message</Text>
                    </TouchableOpacity>
                     </View>
  );
})}

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total Event Price</Text>
                  <Text style={styles.totalPrice}>Rs. {event.totalAmount}</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNavigationFinal />
    </View>
  );
};

export default MyEventsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F8EAF2',
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3D1233',
    textAlign: 'center',
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 90,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4A2140',
    marginTop: 14,
  },
  centerStateText: {
    fontSize: 13,
    color: '#8B7188',
    textAlign: 'center',
    marginTop: 6,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#7B2869',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 16,
    elevation: 3,
    shadowColor: '#7B2869',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cardDeleting: {
    opacity: 0.5,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  info: {
    fontSize: 13,
    color: '#777',
    marginLeft: 4,
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginTop: 10,
    gap: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0E4EE',
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
    marginBottom: 8,
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF4F8',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  vendorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1DDEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  vendorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  packageText: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B2869',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0E4EE',
  },
  totalLabel: {
    fontSize: 13,
    color: '#777',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
});