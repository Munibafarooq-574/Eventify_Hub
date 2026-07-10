
import postContactDetails from '@/services/postContactDetails';
import { getSecureData } from '@/store';
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
} from "react-native";

const ContactDetailsScreen = () => {
  const [brandName, setBrandName] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");
  const [instagramLink, setInstagramLink] = useState<string>("");
  const [facebookLink, setFacebookLink] = useState<string>("");
  const [bookingEmail, setBookingEmail] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [city, setCity] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [googleLink, setGoogleLink] = useState<string>("");

  const [logoUri, setLogoUri] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
const translateAnim = useRef(new Animated.Value(40)).current;
const buttonScale = useRef(new Animated.Value(1)).current;

const animateButtonIn = () => {
  Animated.spring(buttonScale, {
    toValue: 0.96,
    useNativeDriver: true,
  }).start();
};

const animateButtonOut = () => {
  Animated.spring(buttonScale, {
    toValue: 1,
    friction: 4,
    useNativeDriver: true,
  }).start();
};

useEffect(() => {
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),

    Animated.timing(translateAnim, {
      toValue: 0,
      duration: 700,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
  ]).start();
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
    try {
      const user = JSON.parse(await getSecureData("user") || "");
      const formData = new FormData();
      formData.append('userId', user._id);
      formData.append('brandName', brandName);
      formData.append('contactNumber', contactNumber);
      formData.append('instagramLink', instagramLink);
      formData.append('facebookLink', facebookLink);
      formData.append('bookingEmail', bookingEmail);
      formData.append('city', city);
      formData.append('website', website);
      formData.append('officialAddress', address);
      formData.append('officialGoogleLink', googleLink);

      if (logoUri) {
        const filename = logoUri.split('/').pop()!;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image`;

        formData.append('file', {
          uri: logoUri,
          name: filename,
          type,
        } as any); // `as any` to suppress TypeScript error
      }
      await postContactDetails(user._id, formData);
      const categoryName = await getSecureData("buisnessName");
      console.log(categoryName);
      if (categoryName === "Venues") {
        console.log("bdvenue")
        router.push("/bdvenue")
      }
      else if (categoryName === "Caterings") {
        console.log("bdcatering")
        router.push("/bdcatering")
      }
      else if (categoryName === "Photography") {
        console.log("bdphotographer")
        router.push("/bdphotographer")
      }
      else if (categoryName === "Makeup") {
        console.log("bdsalon")
        router.push("/bdsalon")
      }
      else if (categoryName === "Mehndi") {
        console.log("bdmehndi")
        router.push("/bdmehndi")
      }
      else if (categoryName === "DJ & Sound") {
        console.log("bdsounds")
        router.push("/bdsounds")
      }
      else if (categoryName === "Cakes") {
        console.log("bdcakes")
        router.push("/bdcakes")
      }
      Alert.alert("Success", "Contact details saved successfully!");
      // router.push("/bdphotographer");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
  <Animated.ScrollView
    testID="scrollView"
    keyboardShouldPersistTaps="handled"
  keyboardDismissMode="interactive"
    showsVerticalScrollIndicator={false}
    contentContainerStyle={styles.container}
    style={{
      opacity: fadeAnim,
      transform: [
        {
          translateY: translateAnim,
        },
      ],
    }}
  >
      {/* Added testID for testing ScrollView accessibility in UI tests */}
      <View style={styles.header}>
  <Text style={styles.subtitle}>
    Business Profile
  </Text>

  <Text style={styles.title}>
    Contact Details
  </Text>

  <Text style={styles.description}>
    Help customers connect with your business by
    adding your contact information.
  </Text>
</View>
      <TouchableOpacity
  style={styles.logoCard}
  activeOpacity={0.8}
  onPress={pickImage}
>
  {logoUri ? (
    <Image
      source={{ uri: logoUri }}
      style={styles.logo}
    />
  ) : (
    <View style={styles.initialLogo}>
      <Text style={styles.initialText}>
        {brandName
          ? brandName
              .trim()
              .split(" ")
              .map(word => word[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : "BN"}
      </Text>
    </View>
  )}

  <Text style={styles.logoTitle}>
    Business Logo
  </Text>

  <Text style={styles.logoText}>
    Tap to upload your brand logo
  </Text>
</TouchableOpacity>

      <View style={styles.inputCard}>
  <Text style={styles.label}>
    Brand Name *
  </Text>

  <TextInput
    style={styles.input}
    placeholder="Enter Brand Name"
    placeholderTextColor="#999"
    value={brandName}
    onChangeText={setBrandName}
  />
</View>

      <View style={styles.inputCard}>
  <Text style={styles.label}>
    Contact Number *
  </Text>

  <View style={styles.phoneInputContainer}>
    <Text style={styles.flag}>🇵🇰</Text>

    <TextInput
      style={styles.phoneInput}
      placeholder="+92 3001234567"
      placeholderTextColor="#999"
      keyboardType="phone-pad"
      value={contactNumber}
      onChangeText={setContactNumber}
    />
  </View>
</View>

      <View style={styles.inputCard}>
  <Text style={styles.label}>
    Instagram *
  </Text>

  <TextInput
    style={styles.input}
    placeholder="https://instagram.com/yourpage"
    placeholderTextColor="#999"
    value={instagramLink}
    onChangeText={setInstagramLink}
  />
</View>

      <View style={styles.inputCard}>
  <Text style={styles.label}>
    Facebook
  </Text>

  <TextInput
    style={styles.input}
    placeholder="https://facebook.com/yourpage"
    placeholderTextColor="#999"
    value={facebookLink}
    onChangeText={setFacebookLink}
  />
</View>

<View style={styles.inputCard}>
  <Text style={styles.label}>
    Booking Email *
  </Text>

  <TextInput
    style={styles.input}
    placeholder="example@email.com"
    placeholderTextColor="#999"
    keyboardType="email-address"
    autoCapitalize="none"
    value={bookingEmail}
    onChangeText={setBookingEmail}
  />
</View>

<View style={styles.inputCard}>
  <Text style={styles.label}>
    Website
  </Text>

  <TextInput
    style={styles.input}
    placeholder="https://yourwebsite.com"
    placeholderTextColor="#999"
    autoCapitalize="none"
    value={website}
    onChangeText={setWebsite}
  />
</View>

<View style={styles.inputCard}>
  <Text style={styles.label}>
    City *
  </Text>

  <TextInput
    style={styles.input}
    placeholder="Enter City"
    placeholderTextColor="#999"
    value={city}
    onChangeText={setCity}
  />
</View>

<View style={styles.inputCard}>
  <Text style={styles.label}>
    Official Address
  </Text>

  <TextInput
    style={[styles.input, { minHeight: 60 }]}
    placeholder="Office Address"
    placeholderTextColor="#999"
    multiline
    value={address}
    onChangeText={setAddress}
  />
</View>

<View style={styles.inputCard}>
  <Text style={styles.label}>
    Google Maps Link
  </Text>

  <TextInput
    style={styles.input}
    placeholder="https://maps.google.com/..."
    placeholderTextColor="#999"
    autoCapitalize="none"
    value={googleLink}
    onChangeText={setGoogleLink}
  />
</View>

<View style={styles.buttonContainer}>

  <TouchableOpacity
    style={styles.backButton}
    activeOpacity={0.85}
    onPress={() => router.back()}
  >
    <Text style={styles.backButtonText}>
      Back
    </Text>
  </TouchableOpacity>

  <Animated.View
    style={{
      flex: 1,
      marginLeft: 12,
      transform: [{ scale: buttonScale }],
    }}
  >
    <Pressable
      onPressIn={animateButtonIn}
      onPressOut={animateButtonOut}
      onPress={submit}
      style={styles.saveButton}
    >
      <Text style={styles.saveButtonText}>
        Save & Continue
      </Text>
    </Pressable>
  </Animated.View>

</View>

<View style={{ height: 40 }} />

</Animated.ScrollView>

</KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
  flexGrow: 1,
  backgroundColor: "#F9F3F8",
  paddingHorizontal: 22,
  paddingTop: 65,
  paddingBottom: 120,
},

  header: {
  marginBottom: 28,
  alignItems: "center",
},

subtitle: {
  fontSize: 15,
  color: "#780C60",
  fontWeight: "600",
  marginBottom: 8,
  textAlign: "center",
},

title: {
  fontSize: 34,
  fontWeight: "800",
  color: "#1F1F1F",
  marginBottom: 12,
  textAlign: "center",
},

description: {
  fontSize: 16,
  color: "#6D6D6D",
  lineHeight: 24,
  textAlign: "center",
  maxWidth: 320,
},
  logoCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    marginBottom: 28,

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 12,

    elevation: 8,
  },

  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "#F4D8EC",
  },

  logoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 6,
  },

  logoText: {
    color: "#888",
    fontSize: 14,
  },

  initialLogo: {
  width: 100,
  height: 100,
  borderRadius: 50,
  backgroundColor: "#780C60",
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 16,
  borderWidth: 3,
  borderColor: "#F4D8EC",
},

initialText: {
  color: "#FFFFFF",
  fontSize: 34,
  fontWeight: "800",
  letterSpacing: 1,
},

  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,

    elevation: 3,
  },

  label: {
    color: "#780C60",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },

  input: {
    fontSize: 16,
    color: "#222",
    paddingVertical: 4,
  },

  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  flag: {
    fontSize: 24,
    marginRight: 10,
  },

  phoneInput: {
    flex: 1,
    fontSize: 16,
    color: "#222",
  },

  buttonContainer: {
    flexDirection: "row",
    marginTop: 18,
    marginBottom: 10,
  },

  backButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#780C60",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,

    elevation: 2,
  },

  backButtonText: {
    color: "#780C60",
    fontSize: 16,
    fontWeight: "700",
  },

  saveButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",

    backgroundColor: "#780C60",

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,

    elevation: 10,
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});

export default ContactDetailsScreen;
