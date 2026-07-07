

import { deleteSecureData, getSecureData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';

const AccountScreen: React.FC = () => {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);

  const [username, setUsername] = useState(""); // State for username
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetchUserDetails(); // Fetch username and email on component mount
  }, []);

  const fetchUserDetails = async () => {
    const storedUser = (await getSecureData("user")) || "Guest"; // Retrieve user data
    const parsedUser = JSON.parse(storedUser);
    setUsername(parsedUser.name);
    setEmail(parsedUser.email); // Set the email fetched from the stored data
  };

  const handleMenuPress = (menuTitle: string) => {
    switch (menuTitle) {
      case 'Edit Profile':
        console.log("Navigating to Edit Profile...");
        router.push('/vendoreditprofile');
        break;
      // case 'Notifications':
      //   router.push('/notificationacc');
      //   break;
      case 'Frequently Asked Questions':
        router.push('/faqs');
        break;
      case 'Contact Us':
        //openWhatsApp(); // Open WhatsApp
        router.push('/contactus');
        break;
      case 'Sign Out':
        setModalVisible(true); // Show confirmation modal
        break;
      default:
        console.log(`No route found for: ${menuTitle}`);
    }
  };

  const openWhatsApp = () => {
    const phoneNumber = '923331283810'; // Replace with your WhatsApp phone number
    const message = 'Hello, I need assistance.'; // Default message
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        Alert.alert('Info', supported.toString());
        Alert.alert('Info', url);
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert('Error', 'WhatsApp is not installed on this device you abc.');
        }
      })
      .catch((err) => console.error('An error occurred', err));
  };

  // const confirmLogout = () => {
  //   setModalVisible(false);
  //   console.log('Signing out...');
  //   router.push('/account');
  // };
  const confirmLogout = async () => {
    setModalVisible(false);
    try {
      await deleteSecureData("user");
      await deleteSecureData("cartData");
      console.log("Secure data deleted");
    } catch (error) {
      console.error("Failed to delete secure data:", error);
    }
    router.push('/intro'); // Navigate to login/intro page
  };


  const cancelLogout = () => {
    setModalVisible(false);
  };

  const menuOptions = [
    { title: 'Edit Profile' },
   // { title: 'Notifications' },
    { title: 'Frequently Asked Questions' },
    { title: 'Contact Us' },
    { title: 'Sign Out' },
  ];

  // Get the first letter of the username for the avatar
  const avatarInitial = username ? username.charAt(0).toUpperCase() : "N/A";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarInitial}</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.profileName}>{username}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
          </View>
        </View>

        {/* Menu Options */}
        <View style={styles.menuContainer}>
          {menuOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuOption}
              onPress={() => handleMenuPress(option.title)}
            >
              <Text style={styles.menuText}>{option.title}</Text>
              <Text style={styles.arrow}>{">"}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Terms and Privacy */}
        <View style={styles.termsContainer}>
          <TouchableOpacity onPress={() => router.push("/termsofservices")}>
            <Text style={styles.termsText}>Terms of Service</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>|</Text>
          <TouchableOpacity onPress={() => router.push("/privacypolicy")}>
            <Text style={styles.termsText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNavigationFinal />

      {/* Logout Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={cancelLogout}
        testID="logout-modal" // ✅ Add this testID
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={cancelLogout}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              {/* <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  confirmLogout();
                  router.push("/intro"); // Navigate to /intro
                }}
              >
                <Text style={styles.confirmButtonText}>Log Out</Text>
              </TouchableOpacity> */}
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmButtonText}>Log Out</Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8E9F0',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
    marginTop: 100,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#780C60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 60,
    fontWeight: 'bold',
  },
  textContainer: {
    marginLeft: 20,
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  profileEmail: {
    fontSize: 14,
    color: '#848484',
    marginTop: 5,
  },
  menuContainer: {
    backgroundColor: '#F8E9F0',
    borderRadius: 15,
    marginHorizontal: 20,
    paddingVertical: 10,
  },
  menuOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuText: {
    fontSize: 16,
    color: '#000',
  },
  arrow: {
    fontSize: 16,
    color: '#848484',
  },
  termsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  termsText: {
    fontSize: 14,
    color: '#780C60',
    marginHorizontal: 5,
  },
  separator: {
    fontSize: 14,
    color: '#848484',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    marginRight: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    marginLeft: 10,
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#780C60',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#000',
  },
  confirmButtonText: {
    color: '#fff',
  },
  homeButtonIconContainer: {
    backgroundColor: '#780C60',
    width: 55,   // bigger than 30
    height: 55,  // bigger than 30
    borderRadius: 27.5, // half of width/height for perfect circle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },

  // Increase size of home button's icon image
  homeButtonIconImage: {
    width: 55,  // bigger than 37
    height: 55, // bigger than 37
    marginBottom: 0, // remove bottom margin if you want it more centered vertically
  },

  homeButton: {
    transform: [{ translateY: -20 }], // move it more upward (from -10 to -15)

  },
});

export default AccountScreen;
function fetchUserDetails() {
  throw new Error('Function not implemented.');
}
