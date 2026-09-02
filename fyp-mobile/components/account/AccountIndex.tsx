//fpy-mobile/components/account/AccountIndex.tsx
//(Organizer Account Screen)

import { deleteSecureData, deleteUserData, getUserData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomNavigationFinal from '../dashboard/BottomNavigationFinal';

const PRIMARY = "#780C60";
const PRIMARY_LIGHT = "#F8E9F0";
const ACCENT = "#B84B9A";

const AccountScreen: React.FC = () => {
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [role, setRole] = useState("");

  useFocusEffect(
    useCallback(() => {
      fetchUserDetails();
    }, [])
  );

  const fetchUserDetails = async () => {
    try {
      const user = await getUserData();
      if (!user) {
        setUsername("Guest");
        setEmail("");
        setAvatar("");
        setRole("");
        return;
      }
      setUsername(user?.name || "Guest");
      setEmail(user?.email || "");
      // Same field the Vendor side uses — it lives on the shared User
      // schema (contactDetails.brandLogo), so it works for Organizer too.
      setAvatar(user?.contactDetails?.brandLogo || "");
      setRole(user?.role || "");
    } catch (error) {
      console.error("Error fetching user details:", error);
      setUsername("Guest");
      setEmail("");
      setAvatar("");
    }
  };

  const handleMenuPress = (menuTitle: string) => {
    switch (menuTitle) {
      case 'Edit Profile':
        router.push('/editprofile');
        break;
      case 'Frequently Asked Questions':
        router.push('/faqs');
        break;
      case 'Contact Us':
        router.push('/contactus');
        break;
      case 'Sign Out':
        setModalVisible(true);
        break;
      default:
        console.log(`No route found for: ${menuTitle}`);
    }
  };

  const confirmLogout = async () => {
    setModalVisible(false);
    try {
      await deleteSecureData("token");
      await deleteUserData();
      await deleteSecureData("cartData");
      console.log("Logout data deleted successfully");
    } catch (error) {
      console.error("Failed to clear logout data:", error);
    }
    router.replace('/intro');
  };

  const cancelLogout = () => setModalVisible(false);

  const menuOptions = [
    {
      title: 'Edit Profile',
      subtitle: 'Update your name, photo & details',
      icon: 'person-outline' as const,
      danger: false,
    },
    {
      title: 'Frequently Asked Questions',
      subtitle: 'Get quick answers to common queries',
      icon: 'help-circle-outline' as const,
      danger: false,
    },
    {
      title: 'Contact Us',
      subtitle: "We're here if you need any help",
      icon: 'chatbubble-ellipses-outline' as const,
      danger: false,
    },
    {
      title: 'Sign Out',
      subtitle: 'Log out of your organizer account',
      icon: 'log-out-outline' as const,
      danger: true,
    },
  ];

  const avatarInitial = username ? username.charAt(0).toUpperCase() : "N/A";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Account</Text>
          <Text style={styles.headerSubtitle}>Manage your profile & preferences</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarRing}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarInitial}</Text>
              </View>
            )}
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.profileName} numberOfLines={1}>{username || 'Guest'}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
            <TouchableOpacity style={styles.editBadge} onPress={() => handleMenuPress('Edit Profile')}>
              <Ionicons name="create-outline" size={13} color={PRIMARY} />
              <Text style={styles.editBadgeText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Settings</Text>
        </View>

        <View style={styles.menuList}>
          {menuOptions.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuCard}
              activeOpacity={0.75}
              onPress={() => handleMenuPress(option.title)}
            >
              <View style={styles.menuAccentBar} />
              <View style={[styles.menuIconWrap, option.danger && styles.menuIconWrapDanger]}>
                <Ionicons name={option.icon} size={20} color={option.danger ? '#D64545' : PRIMARY} />
              </View>
              <View style={styles.menuDetails}>
                <Text style={[styles.menuText, option.danger && styles.menuTextDanger]}>{option.title}</Text>
                <Text style={styles.menuSubtitle} numberOfLines={1}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C6C6C6" />
            </TouchableOpacity>
          ))}
        </View>

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

      <Modal animationType="slide" transparent visible={isModalVisible} onRequestClose={cancelLogout} testID="logout-modal">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="log-out-outline" size={28} color="#D64545" />
            </View>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to log out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelLogout}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={confirmLogout}>
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
  container: { flex: 1, backgroundColor: PRIMARY_LIGHT },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 110 },
  header: { marginTop: 60, marginBottom: 18, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 12, color: '#8A8A8A', marginTop: 2 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 10, elevation: 3,
  },
  avatarRing: {
    width: 84, height: 84, borderRadius: 42, borderWidth: 2, borderColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center', padding: 3,
  },
  avatar: {
    width: 74, height: 74, borderRadius: 37, backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  avatarText: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  textContainer: { marginLeft: 16, flex: 1 },
  profileName: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  profileEmail: { fontSize: 13, color: '#8A8A8A', marginTop: 3 },
  editBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: PRIMARY_LIGHT,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, marginTop: 10,
  },
  editBadgeText: { color: PRIMARY, fontSize: 12, fontWeight: '700', marginLeft: 4 },
  sectionRow: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  menuList: { gap: 12 },
  menuCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14,
    borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, overflow: 'hidden',
  },
  menuAccentBar: { width: 4, alignSelf: 'stretch', backgroundColor: ACCENT, borderRadius: 4, marginRight: 12 },
  menuIconWrap: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  menuIconWrapDanger: { backgroundColor: '#FCEAEA' },
  menuDetails: { flex: 1 },
  menuText: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  menuTextDanger: { color: '#D64545' },
  menuSubtitle: { fontSize: 12, color: '#9B9B9B', marginTop: 3 },
  termsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 26, marginBottom: 10 },
  termsText: { fontSize: 13, color: PRIMARY, marginHorizontal: 5, fontWeight: '600' },
  separator: { fontSize: 13, color: '#B8B8B8' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '82%', backgroundColor: '#fff', padding: 24, borderRadius: 18, alignItems: 'center' },
  modalIconCircle: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FCEAEA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6, color: '#1A1A1A' },
  modalMessage: { fontSize: 13, color: '#8A8A8A', textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 },
  cancelButton: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#F0F0F0', alignItems: 'center' },
  confirmButton: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: PRIMARY, alignItems: 'center' },
  cancelButtonText: { color: '#333', fontWeight: '700' },
  confirmButtonText: { color: '#fff', fontWeight: '700' },
});

export default AccountScreen;