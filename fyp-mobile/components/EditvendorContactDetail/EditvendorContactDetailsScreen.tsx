//fyp-mobile/components/EditvendorContactDetail/EditvendorContactDetailsScreen.tsx

import getVendorContactDetails from '@/services/getVendorContactDetails';
import updateContactDetails from '@/services/updateContactDetails';
import { getSecureData, saveSecureData } from '@/store';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";

const EditContactDetailsScreen = () => {
  const [userId, setUserId] = useState<string>("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [brandName, setBrandName] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");
  const [instagramLink, setInstagramLink] = useState<string>("");
  const [facebookLink, setFacebookLink] = useState<string>("");
  const [bookingEmail, setBookingEmail] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [googleLink, setGoogleLink] = useState<string>("");

  const [logoUri, setLogoUri] = useState<string | null>(null); // naya locally-picked logo
  const [existingLogoUrl, setExistingLogoUrl] = useState<string>(""); // DB wala purana logo

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const animateButtonIn = () => {
    Animated.spring(buttonScale, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const animateButtonOut = () => {
    Animated.spring(buttonScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(translateAnim, { toValue: 0, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const rawUser = await getSecureData("user");
        const user = rawUser ? JSON.parse(rawUser) : null;
        if (!user) throw new Error("user not found");
        setUserId(user._id);

        const data = await getVendorContactDetails(user._id);

        setBrandName(data?.brandName || "");
        setContactNumber(data?.contactNumber || "");
        setInstagramLink(data?.instagramLink || "");
        setFacebookLink(data?.facebookLink || "");
        setBookingEmail(data?.bookingEmail || "");
        setWebsite(data?.website || "");
        setCity(data?.city || "");
        setAddress(data?.officialAddress || "");
        setGoogleLink(data?.officialGoogleLink || "");
        setExistingLogoUrl(data?.brandLogo || "");
      } catch (error) {
        console.log("Error loading contact details:", error);
        Alert.alert("Error", "Could not load your current contact details.");
      } finally {
        setInitialLoading(false);
      }
    };
    loadExisting();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      Alert.alert("Permission Denied", "Please allow access to media library to select logo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets.length > 0) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const submit = async () => {
    if (!brandName || !contactNumber || !instagramLink || !bookingEmail || !city) {
      Alert.alert("Error", "Please fill in all the required fields marked with *.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('brandName', brandName);
      formData.append('contactNumber', contactNumber);
      formData.append('instagramLink', instagramLink);
      formData.append('facebookLink', facebookLink);
      formData.append('bookingEmail', bookingEmail);
      formData.append('city', city);
      formData.append('website', website);
      formData.append('officialAddress', address);
      formData.append('officialGoogleLink', googleLink);

      // Sirf tab file bhejo jab user ne NAYA logo choose kiya ho.
      // Warna backend purana brandLogo apne aap preserve karega.
      if (logoUri) {
        const filename = logoUri.split('/').pop() || '';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;
        // React Native FormData file object type is not compatible with DOM typings in TypeScript.
        // Cast to any to avoid TS errors while keeping runtime behavior.
        (formData as any).append('file', { uri: logoUri, name: filename, type });
      }

      const response = await updateContactDetails(userId, formData);

try {
  const rawUser = await getSecureData("user");
  const user = rawUser ? JSON.parse(rawUser) : null;
  if (user) {
    user.contactDetails = response?.contactDetails || {
      brandName,
      contactNumber,
      instagramLink,
      facebookLink,
      bookingEmail,
      website,
      city,
      officialAddress: address,
      officialGoogleLink: googleLink,
      brandLogo: response?.contactDetails?.brandLogo || existingLogoUrl,
    };
    await saveSecureData("user", JSON.stringify(user));   // 👈 sahi function name
  }
} catch (e) {
  console.log("Failed to refresh cached user:", e);
}

Alert.alert("Success", "Contact details updated successfully!", [
  { text: "OK", onPress: () => router.back() },
]);
      
      Alert.alert("Success", "Contact details updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#780C60" />
      </View>
    );
  }

  const displayedLogo = logoUri || existingLogoUrl;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Animated.ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        style={{ opacity: fadeAnim, transform: [{ translateY: translateAnim }] }}
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>Business Profile</Text>
          <Text style={styles.title}>Edit Contact Details</Text>
          <Text style={styles.description}>
            Update how customers see and reach out to your business.
          </Text>
        </View>

        <TouchableOpacity style={styles.logoCard} activeOpacity={0.8} onPress={pickImage}>
          {displayedLogo ? (
            <Image source={{ uri: displayedLogo }} style={styles.logo} />
          ) : (
            <View style={styles.initialLogo}>
              <Text style={styles.initialText}>
                {brandName
                  ? brandName.trim().split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase()
                  : "BN"}
              </Text>
            </View>
          )}
          <Text style={styles.logoTitle}>Business Logo *</Text>
          <Text style={styles.logoText}>Tap to change your brand logo</Text>
        </TouchableOpacity>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Brand Name *</Text>
          <TextInput style={styles.input} placeholder="Enter Brand Name" placeholderTextColor="#999" value={brandName} onChangeText={setBrandName} />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Contact Number *</Text>
          <View style={styles.phoneInputContainer}>
            <Text style={styles.flag}>🇵🇰</Text>
            <TextInput style={styles.phoneInput} placeholder="+92 3001234567" placeholderTextColor="#999" keyboardType="phone-pad" value={contactNumber} onChangeText={setContactNumber} />
          </View>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Instagram *</Text>
          <TextInput style={styles.input} placeholder="https://instagram.com/yourpage" placeholderTextColor="#999" value={instagramLink} onChangeText={setInstagramLink} />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Facebook</Text>
          <TextInput style={styles.input} placeholder="https://facebook.com/yourpage" placeholderTextColor="#999" value={facebookLink} onChangeText={setFacebookLink} />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Booking Email *</Text>
          <TextInput style={styles.input} placeholder="example@email.com" placeholderTextColor="#999" keyboardType="email-address" autoCapitalize="none" value={bookingEmail} onChangeText={setBookingEmail} />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Website</Text>
          <TextInput style={styles.input} placeholder="https://yourwebsite.com" placeholderTextColor="#999" autoCapitalize="none" value={website} onChangeText={setWebsite} />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>City *</Text>
          <TextInput style={styles.input} placeholder="Enter City" placeholderTextColor="#999" value={city} onChangeText={setCity} />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Official Address</Text>
          <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="Office Address" placeholderTextColor="#999" multiline value={address} onChangeText={setAddress} />
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.label}>Google Maps Link</Text>
          <TextInput style={styles.input} placeholder="https://maps.google.com/..." placeholderTextColor="#999" autoCapitalize="none" value={googleLink} onChangeText={setGoogleLink} />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>

          <Animated.View style={{ flex: 1, marginLeft: 12, transform: [{ scale: buttonScale }] }}>
            <Pressable
              onPressIn={animateButtonIn}
              onPressOut={animateButtonOut}
              onPress={submit}
              disabled={submitting}
              style={[styles.saveButton, submitting && { opacity: 0.7 }]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </Pressable>
          </Animated.View>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9F3F8" },
  container: { flexGrow: 1, backgroundColor: "#F9F3F8", paddingHorizontal: 22, paddingTop: 65, paddingBottom: 120 },
  header: { marginBottom: 28, alignItems: "center" },
  subtitle: { fontSize: 15, color: "#780C60", fontWeight: "600", marginBottom: 8, textAlign: "center" },
  title: { fontSize: 30, fontWeight: "800", color: "#1F1F1F", marginBottom: 12, textAlign: "center" },
  description: { fontSize: 15, color: "#6D6D6D", lineHeight: 22, textAlign: "center", maxWidth: 320 },
  logoCard: {
    backgroundColor: "#fff", borderRadius: 24, alignItems: "center", justifyContent: "center",
    paddingVertical: 28, marginBottom: 28, shadowColor: "#780C60", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
  },
  logo: { width: 100, height: 100, borderRadius: 50, marginBottom: 16, borderWidth: 3, borderColor: "#F4D8EC" },
  logoTitle: { fontSize: 18, fontWeight: "700", color: "#222", marginBottom: 6 },
  logoText: { color: "#888", fontSize: 14 },
  initialLogo: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: "#780C60", justifyContent: "center",
    alignItems: "center", marginBottom: 16, borderWidth: 3, borderColor: "#F4D8EC",
  },
  initialText: { color: "#FFFFFF", fontSize: 34, fontWeight: "800", letterSpacing: 1 },
  inputCard: {
    backgroundColor: "#fff", borderRadius: 18, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  label: { color: "#780C60", fontSize: 13, fontWeight: "700", marginBottom: 8 },
  input: { fontSize: 16, color: "#222", paddingVertical: 4 },
  phoneInputContainer: { flexDirection: "row", alignItems: "center" },
  flag: { fontSize: 24, marginRight: 10 },
  phoneInput: { flex: 1, fontSize: 16, color: "#222" },
  buttonContainer: { flexDirection: "row", marginTop: 18, marginBottom: 10 },
  backButton: {
    flex: 1, height: 56, borderRadius: 16, borderWidth: 2, borderColor: "#780C60", justifyContent: "center",
    alignItems: "center", backgroundColor: "#fff", shadowColor: "#780C60", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08, shadowRadius: 5, elevation: 2,
  },
  backButtonText: { color: "#780C60", fontSize: 16, fontWeight: "700" },
  saveButton: {
    height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", backgroundColor: "#780C60",
    shadowColor: "#780C60", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 10,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.4 },
});

export default EditContactDetailsScreen;