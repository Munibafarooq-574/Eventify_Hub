import createConversation from '@/services/createConversation';
import getVendorOrders from '@/services/getVendorOrders';
import { getSecureData, saveSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';

const MyEventsScreen = () => {
  const [events, setEvents] = useState<any[]>([]);  // Adjust the type to your data
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch events from the API when the component mounts
    const fetchData = async () => {
      try {
        const user = JSON.parse(await getSecureData("user") || "");
        if (!user) {
          throw "user not found";
        }
        const fetchedEvents = await getVendorOrders("Organizer", user._id);  // Fetch events using the getOrders function
        console.log(fetchedEvents);
        setEvents(fetchedEvents);  // Update state with fetched events
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);  // Stop loading once data is fetched
      }
    };

    fetchData();
  }, []);  // Empty dependency array to run only once when the component mounts

  // Loading state while fetching data
  // if (loading) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <Text>Loading Events...</Text>
  //     </View>
  //   );
  // }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8EAF2' }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity testID="back-button" onPress={() => router.back()}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>My Events</Text>

          <TouchableOpacity onPress={() => router.push('/cartmanagment')} style={styles.cartIconButton}>
            <Ionicons name="cart-outline" size={24} color="#7B2869" />
          </TouchableOpacity>
        </View>

        {/* Events List */}
        {events.map((event) => {
          // const totalPrice = event.reduce((sum: any, v: { price: any; }) => sum + v.price, 0);
          const totalPrice = 0;
          const statusColor =
            event.status === 'Upcoming'
              ? '#007AFF'
              : event.status === 'Completed'
                ? '#28a745'
                : '#dc3545';

          return (
            <View key={event._id} style={styles.card}>
              {/* <Image source={{ uri: event.image }} style={styles.image} /> */}
              <Text style={styles.eventName}>{event.eventName}</Text>
              {/* <Text style={styles.info}>📍 {event.location}</Text> */}
              <Text style={styles.info}>📅 {new Date(event.eventDate).toLocaleDateString()}</Text>
              <Text style={[styles.status, { color: statusColor }]}>Status: {event.status}</Text>
              <Text style={styles.sectionTitle}>Vendors:</Text>
              {event.vendorOrders.map((vendor: any, index: number) => (
                <View key={index} style={styles.vendorBox}>
                  <Text style={styles.vendorText}>{vendor?.vendorId?.name}</Text>
                  <Text style={styles.packageText}>
                    Package: {vendor.serviceName} - Rs. {vendor.price}
                  </Text>
                  <TouchableOpacity
                    style={styles.messageButton}
                    onPress={async () => {
                      try {
                        const user = JSON.parse(await getSecureData("user") || "");
                        if (!user) {
                          throw "User not found";
                        }

                        // Call backend to check for an existing conversation or create a new one
                        const { chatId } = await createConversation(user._id, vendor?.vendorId?._id);
                        await saveSecureData("chatId", chatId);
                        router.push(`/message`);
                        // Navigate to the conversation screen
                        // router.push(`/conversation/${chatId}`);
                      } catch (error) {
                        console.error('Error initiating conversation:', error);
                      }
                    }}
                  >
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={styles.totalPrice}>Total Event Price: Rs. {event.totalAmount}</Text>
            </View>
          );
        })}
      </ScrollView>

      <BottomNavigationFinal />
    </View>
  );
};

export default MyEventsScreen;

const styles = StyleSheet.create({
  messageButton: {
    marginTop: 6,
    backgroundColor: '#7B2869',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backText: {
    fontSize: 16,
    color: '#000',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  cartIconButton: {
    padding: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    marginHorizontal: 16,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 10,
  },
  eventName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
  },
  info: {
    fontSize: 14,
    color: '#444',
    marginVertical: 2,
  },
  status: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  vendorBox: {
    marginVertical: 4,
  },
  vendorText: {
    fontSize: 14,
    color: '#333',
  },
  packageText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 10,
  },
  totalPrice: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 80,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    position: 'absolute',
    bottom: 0,
    width: '100%',
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
});
