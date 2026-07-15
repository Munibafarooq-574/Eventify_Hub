import getAllCategories from '@/services/getAllCategories';
import patchUpdateProfile from '@/services/patchUpdateProfile'; // import your API function
import { getSecureData, saveSecureData } from '@/store';
//import Ionicons from '@expo/vector-icons';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import BottomNavigationFinal from "../dashboard/BottomNavigationFinal";

import { useGlobalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
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

const PRIMARY = "#780C60";
const PRIMARY_LIGHT = "#F8E9F0";
const ACCENT = "#B84B9A";

const EditProfileScreen: React.FC = () => {
  const router = useRouter();

  // State for form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatar, setAvatar] = useState('');
  const [address, setAddress] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [refundPolicy, setRefundPolicy] = useState<string>("");
  const [description, setDescription] = useState('');
  const [citiesCovered, setCitiesCovered] = useState('');
  const { id } = useGlobalSearchParams();
  const [vendorData, setVendorData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);


  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      const userStr = await getSecureData('user');
      // const categories = JSON.parse(await getSecureData(""))
      const categories = await getAllCategories();

      if (userStr) {
        const user = JSON.parse(userStr);
        const category = categories.find((x: any) => x._id === user.buisnessCategory);
        let objectLiteral = "";
        if (category) {
          if (category.name === "Venues") {
            objectLiteral = "venueBusinessDetails";
          } else if (category.name === "Caterings") {
            objectLiteral = "cateringBusinessDetails";
          } else if (category.name === "Photography") {
            objectLiteral = "photographerBusinessDetails";
          } else if (category.name === "Makeup") {
            objectLiteral = "salonBusinessDetails";
          } else if (category.name === "Mehndi") {

          } else if (category.name === "DJ & Sound") {

          } else if (category.name === "Cakes") {

          }
        }

        setName(user.name || '');
        setEmail(user.email || '');
        setPhoneNumber(user.phoneNumber || user.phone || user.phone_number || '');
        setAddress(user.contactDetails.address || '');
        setAvatar(user?.contactDetails?.brandLogo || '');
        setSelectedStaff(user[objectLiteral]?.staff || '');
        setRefundPolicy(user[objectLiteral]?.refundPolicy || '');
        setDescription(user[objectLiteral]?.description || '');
        setCitiesCovered(user[objectLiteral]?.cityCovered || '');

      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const pickImage = async () => {
  const permission =
    await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    alert("Please allow photo access.");
    return;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (!result.canceled) {
    setAvatar(result.assets[0].uri);
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

  contactDetails: {
    ...user.contactDetails,
    brandLogo: avatar,
  },
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
      <StatusBar backgroundColor={PRIMARY_LIGHT} barStyle="dark-content" />

      {/* Plain header, no colored bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={PRIMARY} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Text style={styles.headerSubtitle}>Keep your details up to date</Text>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={saveUserDetails}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>SAVE</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarRing}>
  {avatar ? (
    <Image
      source={{ uri: avatar }}
      style={styles.avatar}
    />
  ) : (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>
        {name ? name.charAt(0).toUpperCase() : "N/A"}
      </Text>
    </View>
  )}

      <TouchableOpacity
       style={styles.avatarEditBadge}
        onPress={pickImage}
        >
           <Ionicons
          name="camera"
          size={14}
         color="#FFFFFF"
         />
      </TouchableOpacity>
        </View>
          <Text style={styles.avatarName} numberOfLines={1}>
            {name || 'Your name'}
          </Text>
          <Text style={styles.avatarEmail} numberOfLines={1}>
            {email}
          </Text>
        </View>

        {/* Section title */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
        </View>

        {/* Form card */}
        <View style={styles.formCard}>
          <View style={styles.formAccentBar} />
          <View style={styles.formInner}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={16} color={PRIMARY} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor="#B0B0B0"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={16} color={PRIMARY} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#B0B0B0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Country</Text>
              <View style={[styles.inputRow, styles.inputRowDisabled]}>
                <Ionicons name="flag-outline" size={16} color="#9B9B9B" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputDisabled]}
                  placeholder="Pakistan"
                  placeholderTextColor="#666"
                  editable={false}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, { flex: 0.32 }]}>
                <Text style={styles.label}>Code</Text>
                <View style={[styles.inputRow, styles.flagRow]}>
                  <Image
                    source={{
                      uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Flag_of_Pakistan.svg/1024px-Flag_of_Pakistan.svg.png",
                    }}
                    style={styles.flagIcon}
                  />
                  <Text style={styles.codeText}>+92</Text>
                </View>
              </View>
              <View style={[styles.inputContainer, { flex: 0.68, marginLeft: 10 }]}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="call-outline" size={16} color={PRIMARY} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter phone number"
                    placeholderTextColor="#B0B0B0"
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address (Optional)</Text>
              <View style={styles.inputRow}>
                <Ionicons name="location-outline" size={16} color={PRIMARY} style={styles.inputIcon} />
                <TextInput
                  testID="input-address" //add test id
                  style={styles.input}
                  placeholder="Enter your address"
                  placeholderTextColor="#B0B0B0"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            </View>

            {/* <Text style={styles.label}>Cities Covered</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter cities you cover"
              value={citiesCovered}
              onChangeText={setCitiesCovered}
            />




            <Text style={styles.label}>Staff</Text>
            <View style={styles.staffContainer}>
              {[
                { label: "MALE", icon: "male" },
                { label: "FEMALE", icon: "female" },
                { label: "TRANSGENDER", icon: "transgender-alt" },
              ].map((staff) => (
                <TouchableOpacity
                  key={staff.label}
                  style={[
                    styles.staffOption,
                    selectedStaff === staff.label && styles.staffSelected,
                  ]}
                  onPress={() => setSelectedStaff(staff.label)}
                >
                  <FontAwesome5
                    name={staff.icon}
                    size={20}
                    style={[
                      styles.staffIcon,
                      selectedStaff === staff.label && styles.staffSelectedIcon,
                    ]} />
                  <Text
                    style={[
                      styles.staffText,
                      selectedStaff === staff.label && styles.staffSelectedText,
                    ]}
                  >
                    {staff.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Refund Policy*</Text>
            <View style={styles.covidContainer}>
              {["REFUNDABLE", "NON-REFUNDABLE", "PARTIALLY REFUNDABLE"].map(
                (policy) => (
                  <TouchableOpacity
                    key={policy}
                    style={[
                      styles.covidOption,
                      refundPolicy === policy && styles.covidSelected,
                    ]}
                    onPress={() => setRefundPolicy(policy)}
                  >
                    <Text
                      style={[
                        styles.covidText,
                        refundPolicy === policy && styles.covidSelectedText,
                      ]}
                    >
                      {policy}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>  */}

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
    backgroundColor: PRIMARY_LIGHT,
  },

  // Plain header — no colored bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 18,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8A8A8A',
    marginTop: 2,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  content: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },

  // Avatar card
  avatarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarRing: {
    width: 106,
    height: 106,
    borderRadius: 53,
    borderWidth: 2,
    borderColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 3,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: 12,
  },
  avatarEmail: {
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 2,
  },

  // Section title
  sectionRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  // Form card
  formCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  formAccentBar: {
    width: 4,
    backgroundColor: ACCENT,
  },
  formInner: {
    flex: 1,
    padding: 16,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginBottom: 14,
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8A8A',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 12,
  },
  inputRowDisabled: {
    backgroundColor: '#F2F2F2',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A1A',
  },
  inputDisabled: {
    color: '#6E6E6E',
  },
  flagRow: {
    justifyContent: 'center',
    paddingVertical: 10,
  },
  flagIcon: {
    width: 24,
    height: 16,
    resizeMode: 'contain',
    marginRight: 6,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
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
    backgroundColor: PRIMARY,
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
  homeButtonIconContainer: {
    backgroundColor: PRIMARY,
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  homeButtonIconImage: {
    width: 55,
    height: 55,
    marginBottom: 0,
  },
  homeButton: {
    transform: [{ translateY: -20 }],
  },
  staffContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  staffOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B085A6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FBEFF7',
    marginHorizontal: 5,
  },
  staffSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  staffIcon: {
    color: PRIMARY,
    fontSize: 20,
    marginRight: 2,
  },
  staffSelectedIcon: {
    color: '#FFF',
  },
  staffText: {
    fontSize: 8,
    color: PRIMARY,
    fontWeight: '600',
  },
  staffSelectedText: {
    color: '#FFF',
  },
  covidContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  covidOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B085A6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FBEFF7',
    marginHorizontal: 5,
  },
  covidSelected: {
    backgroundColor: PRIMARY,
    borderColor: PRIMARY,
  },
  covidText: {
    fontSize: 8,
    color: PRIMARY,
    fontWeight: '600',
  },
  covidSelectedText: {
    color: '#FFF',
  },
});

export default EditProfileScreen;