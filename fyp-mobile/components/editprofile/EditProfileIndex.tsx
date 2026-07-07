
import patchUpdateProfile from '@/services/patchUpdateProfile'; // import your API function
import { getSecureData, saveSecureData } from '@/store';
//import Ionicons from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';


import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const EditProfileScreen: React.FC = () => {
  const router = useRouter();

  // State for form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      const userStr = await getSecureData('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setName(user.name || '');
        setEmail(user.email || '');
        setPhoneNumber(user.phoneNumber || user.phone || user.phone_number || '');
        setAddress(user.address || '');
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const saveUserDetails = async () => {
    try {
      const userStr = await getSecureData('user');
      if (!userStr) {
        alert('User not found locally');
        return;
      }
      const user = JSON.parse(userStr);
      const userId = user.userId || user._id;

      if (!userId) {
        alert('User ID not available');
        return;
      }

      const updateData = {
        name,
        email,
        phoneNumber,
        address,
        userId,
      };

      const updatedUser = await patchUpdateProfile(userId, updateData);
      await saveSecureData('user', JSON.stringify(updatedUser));
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Failed to save user data:', error);
      alert('Failed to save profile. Please try again.');
    }
  };

  return (
    <View style={styles.container} testID="screen-container">
      <StatusBar backgroundColor="#F8E9F0" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>{"<"} Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity onPress={saveUserDetails}>
          <Text style={styles.saveButton}>SAVE</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {name ? name.charAt(0).toUpperCase() : 'N/A'}
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              placeholder="Pakistan"
              placeholderTextColor="#000000"
              editable={false}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, { flex: 0.3 }]}>
              <Text style={styles.label}>+92</Text>
              <View style={[styles.input, styles.flagContainer]}>
                <Image
                  source={{
                    uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Flag_of_Pakistan.svg/1024px-Flag_of_Pakistan.svg.png",
                  }}
                  style={styles.flagIcon}
                />
              </View>
            </View>
            <View style={[styles.inputContainer, { flex: 0.7, marginLeft: 10 }]}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your address"
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigationFinal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8E9F0',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    color: '#780C60',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    color: 'green',
    fontSize: 16,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
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
  form: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginBottom: 15,
    flex: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#fff',
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
    paddingHorizontal: 10,
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
  flagContainer: {
    backgroundColor: '#fff',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    width: 50,
  },
  flagIcon: {
    width: 30,
    height: 20,
    resizeMode: 'contain',
  },
  // homeButtonIconContainer: {
  //   backgroundColor: '#780C60',
  //   width: 40,
  //   height: 40,
  //   borderRadius: 20,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   marginBottom: 5,
  // },
  // homeButton: {
  //   // Optional additional styling
  // },
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

export default EditProfileScreen;
