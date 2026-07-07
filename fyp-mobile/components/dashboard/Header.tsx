
import searchVendors from '@/services/searchVendors';
import { getSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const Header: React.FC = () => {
  const [username, setUsername] = useState(""); // State for username

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = async (text: string) => {
    if (text.trim().length < 2) return;

    const results = await searchVendors(text);
    console.log(results);
    setResults(results);
    setShowDropdown(true);
  };


  useEffect(() => {
    fetchUsername(); // Fetch username on component mount
  }, []);

  const fetchUsername = async () => {
    const storedUsername = (await getSecureData("user")) || "Guest"; // Retrieve username or set default
    setUsername(JSON.parse(storedUsername).name);
  };

  return (
    <View style={styles.container}>
      {/* Location and Notification */}
      <View style={styles.header}>
        {/* <View style={styles.locationContainer}>
          <Ionicons name="location-outline" size={18} color="#7B2869" />
          <Text style={styles.locationText}>House 30, ISB</Text>
          <Ionicons name="chevron-down-outline" size={16} color="#7B2869" />
        </View> */}
        {/* Cart Icon */}


        <TouchableOpacity
          onPress={() => router.push('/cartmanagment')}
          style={styles.cartIconButton}
        >
          <Ionicons name="cart-outline" size={24} color="#7B2869" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationIcon}
          onPress={() => router.push('/bottomnotification')}>
          <Ionicons name="notifications" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeContainer}>
        <View>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.username}>{username}</Text> Display the username
        </View>
        <TouchableOpacity
          style={styles.planButton}
          activeOpacity={0.7} // Add touch opacity
          onPress={() => router.push('/EventDetailsForm')} // Add navigation logic
        >
          <Text style={styles.planButtonText}>Plan an Event</Text>
        </TouchableOpacity>
      </View>

      <View>
        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={20} color="#9E9E9E" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors and venues"
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              handleSearch(text);
            }}
          />
        </View>

        {/* Dropdown */}
        {showDropdown && results.length > 0 && (
          <View style={styles.dropdownContainer}>
            {results.map((item: any) => (
              <TouchableOpacity
                key={item._id}
                style={styles.dropdownItem}
                onPress={() => {
                  setSearchQuery(item.name);
                  setShowDropdown(false);
                  router.push(`/vendorprofiledetails?id=${item._id}`)
                }}
              >
                <Text>{item.name} ({item.contactDetails?.brandName})</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    height: 50
  },
  searchInput: {
    flex: 1,
    paddingLeft: 8,
    color: '#000',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 2, // places it just below search bar
    borderRadius: 8,
    elevation: 5, // shadow for Android
    shadowColor: '#000', // shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    maxHeight: 200,
    zIndex: 10, // important if using dropdown over other elements
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  container: {
    padding: 16,
    backgroundColor: '#F8EAF2',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingLeft: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7B2869',
    marginHorizontal: 4,
  },
  notificationIcon: {
    padding: 8,
    //backgroundColor: '#7B2869',
  },
  welcomeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000',
    paddingLeft: 10,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    paddingLeft: 10,
  },
  planButton: {
    backgroundColor: '#7B2869',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  planButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // searchBarContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   backgroundColor: '#FFF',
  //   borderRadius: 20,
  //   paddingHorizontal: 12,
  //   height: 50,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 1 },
  //   shadowOpacity: 0.1,
  //   shadowRadius: 2,
  //   elevation: 3,
  // },
  // searchInput: {
  //   flex: 1,
  //   marginLeft: 8,
  //   fontSize: 14,
  //   color: '#000',
  // },
  cartIconButton: {
    padding: 8,
    marginRight: 4,
  },
});

export default Header;
