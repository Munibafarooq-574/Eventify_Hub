//fpy-mobile/components/editprofile/EditProfileIndex.tsx
// (Organizer Edit Profile Screen)

import patchUpdateProfile from '@/services/patchUpdateProfile';
import { getUserData, saveUserData } from '@/store';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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


const PRIMARY = "#780C60";
const PRIMARY_LIGHT = "#F8E9F0";
const ACCENT = "#B84B9A";

const OrganizerEditProfileScreen: React.FC = () => {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      const user = await getUserData();
      if (!user) return;

      setName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phone_number || user.phoneNumber || '');
      setAddress(user.address || user?.contactDetails?.address || '');
      // Same shared field Vendor uses for its DP.
      setAvatar(user?.contactDetails?.brandLogo || '');
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      alert('Please allow photo access.');
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
      setAvatarChanged(true);
    }
  };

  const saveUserDetails = async () => {
    try {
      setSaving(true);
      const user = await getUserData();
      if (!user) {
        alert('User not found locally');
        setSaving(false);
        return;
      }
      const userId = user.userId || user._id;
      if (!userId) {
        alert('User ID not available');
        setSaving(false);
        return;
      }

      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('name', name);
      formData.append('email', email);
      formData.append('phoneNumber', phoneNumber);
      formData.append('address', address);

      // Only attach a file if a NEW local image was picked. Otherwise the
      // backend leaves the existing brandLogo untouched (see auth.service.ts).
      if (avatarChanged && avatar) {
        const filename = avatar.split('/').pop()!;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';
        formData.append('file', { uri: avatar, name: filename, type } as any);
      }

      const updatedUser = await patchUpdateProfile(userId, formData);
      await saveUserData(updatedUser);
      setAvatarChanged(false);
      alert('Profile updated successfully');
      router.replace('/account');
    } catch (error) {
      console.error('Failed to save user data:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container} testID="screen-container">
      <StatusBar backgroundColor={PRIMARY_LIGHT} barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={PRIMARY} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <Text style={styles.headerSubtitle}>Keep your details up to date</Text>
        </View>
        <TouchableOpacity style={styles.saveBtn} onPress={saveUserDetails} disabled={saving}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>{saving ? 'SAVING' : 'SAVE'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.avatarCard}>
          <View style={styles.avatarRing}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : "N/A"}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.avatarEditBadge} onPress={pickImage}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarName} numberOfLines={1}>{name || 'Your name'}</Text>
          <Text style={styles.avatarEmail} numberOfLines={1}>{email}</Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.formAccentBar} />
          <View style={styles.formInner}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputRow}>
                <Ionicons name="person-outline" size={16} color={PRIMARY} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Enter your name" placeholderTextColor="#B0B0B0" value={name} onChangeText={setName} />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>E-mail</Text>
              <View style={styles.inputRow}>
                <Ionicons name="mail-outline" size={16} color={PRIMARY} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Enter your email" placeholderTextColor="#B0B0B0" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputRow}>
                <Ionicons name="call-outline" size={16} color={PRIMARY} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Enter phone number" placeholderTextColor="#B0B0B0" keyboardType="phone-pad" value={phoneNumber} onChangeText={setPhoneNumber} />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Address (Optional)</Text>
              <View style={styles.inputRow}>
                <Ionicons name="location-outline" size={16} color={PRIMARY} style={styles.inputIcon} />
                <TextInput testID="input-address" style={styles.input} placeholder="Enter your address" placeholderTextColor="#B0B0B0" value={address} onChangeText={setAddress} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PRIMARY_LIGHT },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 18 },
  headerIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: PRIMARY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 4 },
  saveButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 130 },
  avatarCard: { backgroundColor: '#FFFFFF', borderRadius: 20, alignItems: 'center', paddingVertical: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  avatarRing: { width: 106, height: 106, borderRadius: 53, borderWidth: 2, borderColor: PRIMARY_LIGHT, justifyContent: 'center', alignItems: 'center', padding: 3 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: PRIMARY, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 42, fontWeight: 'bold' },
  avatarEditBadge: { position: 'absolute', bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  avatarName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginTop: 12 },
  avatarEmail: { fontSize: 12, color: '#8A8A8A', marginTop: 2 },
  sectionRow: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  formCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2, overflow: 'hidden' },
  formAccentBar: { width: 4, backgroundColor: ACCENT },
  formInner: { flex: 1, padding: 16 },
  inputContainer: { marginBottom: 14, flex: 1 },
  label: { fontSize: 12, fontWeight: '700', color: '#8A8A8A', marginBottom: 6 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ECECEC', borderRadius: 12, backgroundColor: PRIMARY_LIGHT, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1A1A1A' },
});

export default OrganizerEditProfileScreen;