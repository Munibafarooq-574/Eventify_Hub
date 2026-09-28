// fyp-mobile/components/vendorcontactdetails/VendorContactDetailsIndex.tsx

import postContactDetails from "@/services/postContactDetails";
import getActiveCities, {
  ActiveCity,
} from "@/services/getActiveCities";
import { getSecureData } from "@/store";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const ContactDetailsScreen = () => {
  const [brandName, setBrandName] = useState<string>("");
  const [contactNumber, setContactNumber] = useState<string>("");
  const [instagramLink, setInstagramLink] = useState<string>("");
  const [facebookLink, setFacebookLink] = useState<string>("");
  const [bookingEmail, setBookingEmail] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [cities, setCities] = useState<ActiveCity[]>([]);
const [citiesLoading, setCitiesLoading] = useState(false);

const [businessCityId, setBusinessCityId] = useState("");
const [businessCitySearch, setBusinessCitySearch] = useState("");
const [businessCityOpen, setBusinessCityOpen] = useState(false);

const [
  serviceLocationCityIds,
  setServiceLocationCityIds,
] = useState<string[]>([]);

const [serviceCitySearch, setServiceCitySearch] =
  useState("");
const [serviceCitiesOpen, setServiceCitiesOpen] =
  useState(false);

const [address, setAddress] = useState<string>("");
  const [googleLink, setGoogleLink] = useState<string>("");

  const [logoUri, setLogoUri] = useState<string | null>(null);

  const [snackbarMessage, setSnackbarMessage] = useState<string>("");
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  const snackbarAnim = useRef(new Animated.Value(0)).current;
  const snackbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSnackbar = (message: string) => {
    if (snackbarTimerRef.current) {
      clearTimeout(snackbarTimerRef.current);
    }

    setSnackbarMessage(message);
    setSnackbarVisible(true);

    snackbarAnim.stopAnimation();
    snackbarAnim.setValue(0);

    Animated.timing(snackbarAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    snackbarTimerRef.current = setTimeout(() => {
      Animated.timing(snackbarAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setSnackbarVisible(false);
      });
    }, 3200);
  };

  useEffect(() => {
  const loadCities = async () => {
    try {
      setCitiesLoading(true);

      const data = await getActiveCities();

      setCities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log("Cities load error:", error);
      showSnackbar("Unable to load cities.");
    } finally {
      setCitiesLoading(false);
    }
  };

  loadCities();
}, []);

const filteredBusinessCities = cities.filter((city) => {
  const query = businessCitySearch.trim().toLowerCase();

  if (!query) return true;

  const searchable = [
    city.name,
    city.stateProvinceName,
    city.stateProvinceCode,
    city.countryName,
    city.countryCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
});

const filteredServiceCities = cities.filter((city) => {
  const query = serviceCitySearch.trim().toLowerCase();

  if (!query) return true;

  const searchable = [
    city.name,
    city.stateProvinceName,
    city.stateProvinceCode,
    city.countryName,
    city.countryCode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(query);
});

const selectedBusinessCity = cities.find(
  (city) => city._id === businessCityId,
);

const toggleServiceCity = (cityId: string) => {
  setServiceLocationCityIds((current) =>
    current.includes(cityId)
      ? current.filter((id) => id !== cityId)
      : [...current, cityId],
  );
};
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

  useEffect(() => {
    return () => {
      if (snackbarTimerRef.current) {
        clearTimeout(snackbarTimerRef.current);
      }
    };
  }, []);


  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Please allow access to media library to select logo."
      );
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
    const trimmedBrandName = brandName.trim();
    const trimmedContactNumber = contactNumber.trim();
    const trimmedInstagram = instagramLink.trim();
    const trimmedFacebook = facebookLink.trim();
    const trimmedBookingEmail = bookingEmail.trim();
    const trimmedWebsite = website.trim();
    const trimmedAddress = address.trim();
    const trimmedGoogleLink = googleLink.trim();

    const isValidEmail = (value: string) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const isValidUrl = (value: string) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    };

    const isInstagramUrl = (value: string) => {
      if (!isValidUrl(value)) return false;

      try {
        const hostname = new URL(value).hostname.toLowerCase();
        return (
          hostname === "instagram.com" ||
          hostname === "www.instagram.com" ||
          hostname.endsWith(".instagram.com")
        );
      } catch {
        return false;
      }
    };

    const isFacebookUrl = (value: string) => {
      if (!isValidUrl(value)) return false;

      try {
        const hostname = new URL(value).hostname.toLowerCase();
        return (
          hostname === "facebook.com" ||
          hostname === "www.facebook.com" ||
          hostname.endsWith(".facebook.com") ||
          hostname === "fb.com" ||
          hostname === "www.fb.com"
        );
      } catch {
        return false;
      }
    };

    if (!logoUri) {
      showSnackbar("Business Logo is required.");
      return;
    }

    if (!trimmedBrandName) {
      showSnackbar("Brand Name is required.");
      return;
    }

    if (!trimmedContactNumber) {
      showSnackbar("Contact Number is required.");
      return;
    }

    if (!/^\+?[0-9]{7,15}$/.test(trimmedContactNumber)) {
  showSnackbar(
    "Enter a valid phone number with 7 to 15 digits. You may include a leading + country code."
  );
  return;
}

    const hasInstagram = trimmedInstagram.length > 0;
    const hasFacebook = trimmedFacebook.length > 0;

    if (!hasInstagram && !hasFacebook) {
      showSnackbar("Add at least one: Instagram or Facebook.");
      return;
    }

    if (hasInstagram && !isInstagramUrl(trimmedInstagram)) {
      showSnackbar(
        "Enter a valid Instagram URL, e.g. https://instagram.com/yourpage"
      );
      return;
    }

    if (hasFacebook && !isFacebookUrl(trimmedFacebook)) {
      showSnackbar(
        "Enter a valid Facebook URL, e.g. https://facebook.com/yourpage"
      );
      return;
    }

    if (!trimmedBookingEmail) {
      showSnackbar("Booking Email is required.");
      return;
    }

    if (!isValidEmail(trimmedBookingEmail)) {
      showSnackbar("Enter a valid Booking Email.");
      return;
    }

      if (!businessCityId) {
    showSnackbar("Business City is required.");
    return;
  }

  if (serviceLocationCityIds.length === 0) {
    showSnackbar(
      "Select at least one Service City.",
    );
    return;
  }

    if (trimmedWebsite && !isValidUrl(trimmedWebsite)) {
      showSnackbar(
        "Enter a valid Website URL, e.g. https://yourwebsite.com"
      );
      return;
    }

    if (trimmedGoogleLink && !isValidUrl(trimmedGoogleLink)) {
      showSnackbar(
        "Enter a valid Google Maps URL beginning with http:// or https://"
      );
      return;
    }

    try {
      const storedUser = await getSecureData("user");

      if (!storedUser) {
        showSnackbar("User information not found. Please log in again.");
        return;
      }

      const user = JSON.parse(storedUser);

      if (!user?._id) {
        showSnackbar("User information is invalid. Please log in again.");
        return;
      }

      const formData = new FormData();

      formData.append("userId", user._id);
      formData.append("brandName", trimmedBrandName);
      formData.append("contactNumber", trimmedContactNumber);

      if (hasInstagram) {
        formData.append("instagramLink", trimmedInstagram);
      }

      if (hasFacebook) {
        formData.append("facebookLink", trimmedFacebook);
      }

      formData.append("bookingEmail", trimmedBookingEmail);

    formData.append(
      "businessCityId",
      businessCityId,
    );

    serviceLocationCityIds.forEach((cityId) => {
      formData.append(
        "serviceLocationCityIds",
        cityId,
      );
    });

      if (trimmedWebsite) {
        formData.append("website", trimmedWebsite);
      }

      if (trimmedAddress) {
        formData.append("officialAddress", trimmedAddress);
      }

      if (trimmedGoogleLink) {
        formData.append("officialGoogleLink", trimmedGoogleLink);
      }

      const filename = logoUri.split("/").pop() || "business-logo.jpg";
      const match = /\.(\w+)$/.exec(filename);

      const type = match ? `image/${match[1]}` : "image/jpeg";

      formData.append(
        "file",
        {
          uri: logoUri,
          name: filename,
          type,
        } as any
      );

    await postContactDetails(user._id, formData);

const businessDetailsType =
  (await getSecureData("businessDetailsType")) || "GENERIC";

const businessDetailsRoutes: Record<string, string> = {
  PHOTOGRAPHY: "/bdphotographer",
  MAKEUP: "/bdsalon",
  VENUE: "/bdvenue",
  CATERING: "/bdcatering",
  CAKE: "/bdcakes",
  MEHNDI: "/bdmehndi",
  SOUND: "/bdsounds",
  GENERIC: "/bdgeneric",
};

const route = businessDetailsRoutes[businessDetailsType];

if (!route) {
  Alert.alert(
    "Error",
    "Business details form not found for your category."
  );
  return;
}

router.replace(route as any);

    } catch (error: any) {
      console.log(
        "Contact details submit error:",
        error?.response?.data || error?.message || error
      );

      const backendMessage =
        error?.response?.data?.message?.message?.[0] ||
        error?.response?.data?.message?.message ||
        error?.response?.data?.message ||
        "Something went wrong. Please try again.";

      showSnackbar(
        typeof backendMessage === "string"
          ? backendMessage
          : "Something went wrong. Please try again."
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
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

        {/* Business Logo */}

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
                      .map((word) => word[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()
                  : "BN"}
              </Text>
            </View>
          )}

          <Text style={styles.logoTitle}>
            Business Logo *
          </Text>

          <Text style={styles.logoText}>
            Tap to upload your brand logo
          </Text>
        </TouchableOpacity>

        {/* Brand Name */}

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

        {/* Contact Number */}

        <View style={styles.inputCard}>
          <Text style={styles.label}>
            Contact Number *
          </Text>

          <View style={styles.phoneInputContainer}>
  <TextInput
    style={styles.phoneInput}
    placeholder="+1 2025550123"
    placeholderTextColor="#999"
    keyboardType="phone-pad"
    value={contactNumber}
    maxLength={16}
    onChangeText={(text) => {
      const normalized = text
        .replace(/[^0-9+]/g, "")
        .replace(/(?!^)\+/g, "");

      setContactNumber(normalized);
    }}
  />
</View>
        </View>

        {/* Social Media section note */}

        <View style={styles.socialNoteBox}>
          <Text style={styles.socialNoteText}>
            Add at least one — Instagram or Facebook *
          </Text>
        </View>

        {/* Instagram - at least one of Instagram/Facebook required */}

        <View style={styles.inputCard}>
          <Text style={styles.label}>
            Instagram
          </Text>

          <TextInput
            style={styles.input}
            placeholder="https://instagram.com/yourpage"
            placeholderTextColor="#999"
            value={instagramLink}
            onChangeText={setInstagramLink}
            autoCapitalize="none"
          />
        </View>

        {/* Facebook - at least one of Instagram/Facebook required */}

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
            autoCapitalize="none"
          />
        </View>

        {/* Booking Email */}

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

        {/* Website */}

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

        {/* Business City */}

<View style={styles.inputCard}>
  <Text style={styles.label}>
    Business City *
  </Text>

  <TouchableOpacity
    style={styles.citySelector}
    activeOpacity={0.8}
    onPress={() => {
      setBusinessCityOpen((current) => !current);
      setServiceCitiesOpen(false);
    }}
  >
    <Text
      style={[
        styles.citySelectorText,
        !selectedBusinessCity &&
          styles.cityPlaceholderText,
      ]}
    >
      {selectedBusinessCity
        ? `${selectedBusinessCity.name}, ${selectedBusinessCity.stateProvinceName}, ${selectedBusinessCity.countryCode}`
        : citiesLoading
          ? "Loading cities..."
          : "Select Business City"}
    </Text>

    <Text style={styles.cityArrow}>
      {businessCityOpen ? "▲" : "▼"}
    </Text>
  </TouchableOpacity>

  {businessCityOpen && (
    <View style={styles.cityDropdown}>
      <TextInput
        style={styles.citySearchInput}
        placeholder="Search city, state or country"
        placeholderTextColor="#999"
        value={businessCitySearch}
        onChangeText={setBusinessCitySearch}
      />

      <ScrollView
  style={styles.cityOptionsScroll}
  nestedScrollEnabled
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator
>
  {filteredBusinessCities.map((item) => (
    <TouchableOpacity
      key={item._id}
      style={styles.cityOption}
      onPress={() => {
        setBusinessCityId(item._id);
        setBusinessCitySearch("");
        setBusinessCityOpen(false);
      }}
    >
      <Text style={styles.cityOptionTitle}>
        {item.name}
      </Text>

      <Text style={styles.cityOptionSubtitle}>
        {item.stateProvinceName},{" "}
        {item.countryName}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
      {!citiesLoading &&
        filteredBusinessCities.length === 0 && (
          <Text style={styles.noCitiesText}>
            No cities found.
          </Text>
        )}
    </View>
  )}
</View>

{/* Service Cities */}

<View style={styles.inputCard}>
  <Text style={styles.label}>
    Service Cities *
  </Text>

  <Text style={styles.fieldHint}>
    Select all cities where you provide services.
  </Text>

  {serviceLocationCityIds.length > 0 && (
    <View style={styles.selectedCitiesWrap}>
      {serviceLocationCityIds.map((cityId) => {
        const selectedCity = cities.find(
          (item) => item._id === cityId,
        );

        if (!selectedCity) return null;

        return (
          <TouchableOpacity
            key={cityId}
            style={styles.selectedCityChip}
            onPress={() => toggleServiceCity(cityId)}
          >
            <Text style={styles.selectedCityChipText}>
              {selectedCity.name} ×
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  )}

  <TouchableOpacity
    style={styles.citySelector}
    activeOpacity={0.8}
    onPress={() => {
      setServiceCitiesOpen((current) => !current);
      setBusinessCityOpen(false);
    }}
  >
    <Text style={styles.citySelectorText}>
      {citiesLoading
        ? "Loading cities..."
        : "Add Service Cities"}
    </Text>

    <Text style={styles.cityArrow}>
      {serviceCitiesOpen ? "▲" : "▼"}
    </Text>
  </TouchableOpacity>

  {serviceCitiesOpen && (
    <View style={styles.cityDropdown}>
      <TextInput
        style={styles.citySearchInput}
        placeholder="Search city, state or country"
        placeholderTextColor="#999"
        value={serviceCitySearch}
        onChangeText={setServiceCitySearch}
      />

     <ScrollView
  style={styles.cityOptionsScroll}
  nestedScrollEnabled
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator
>
  {filteredServiceCities.map((item) => {
    const selected =
      serviceLocationCityIds.includes(item._id);

    return (
      <TouchableOpacity
        key={item._id}
        style={[
          styles.cityOption,
          selected && styles.cityOptionSelected,
        ]}
        onPress={() =>
          toggleServiceCity(item._id)
        }
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.cityOptionTitle}>
            {item.name}
          </Text>

          <Text style={styles.cityOptionSubtitle}>
            {item.stateProvinceName},{" "}
            {item.countryName}
          </Text>
        </View>

        <Text style={styles.cityCheck}>
          {selected ? "✓" : ""}
        </Text>
      </TouchableOpacity>
    );
  })}
</ScrollView>

      {!citiesLoading &&
        filteredServiceCities.length === 0 && (
          <Text style={styles.noCitiesText}>
            No cities found.
          </Text>
        )}
    </View>
  )}
</View>

        {/* Official Address */}

        <View style={styles.inputCard}>
          <Text style={styles.label}>
            Official Address
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                minHeight: 60,
              },
            ]}
            placeholder="Office Address"
            placeholderTextColor="#999"
            multiline
            value={address}
            onChangeText={setAddress}
          />
        </View>

        {/* Google Maps */}

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

        {/* Buttons */}

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
              transform: [
                {
                  scale: buttonScale,
                },
              ],
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

      {snackbarVisible && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.snackbar,
            {
              opacity: snackbarAnim,
              transform: [
                {
                  translateY: snackbarAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </Animated.View>
      )}
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

  socialNoteBox: {
    backgroundColor: "#FBEFF7",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F0D6E7",
  },

  socialNoteText: {
    color: "#780C60",
    fontSize: 12.5,
    fontWeight: "700",
    textAlign: "center",
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

  snackbar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: Platform.OS === "ios" ? 34 : 24,
    backgroundColor: "#808080",
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 999,
  },

  snackbarText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center",
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  citySelector: {
  minHeight: 46,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 8,
},

citySelectorText: {
  flex: 1,
  fontSize: 15,
  color: "#222",
  marginRight: 10,
},

cityPlaceholderText: {
  color: "#999",
},

cityArrow: {
  color: "#780C60",
  fontSize: 12,
  fontWeight: "700",
},

cityDropdown: {
  marginTop: 10,
  maxHeight: 280,
  borderWidth: 1,
  borderColor: "#E8D6E3",
  borderRadius: 14,
  overflow: "hidden",
},

cityOptionsScroll: {
  maxHeight: 220,
},

citySearchInput: {
  fontSize: 14,
  color: "#222",
  paddingHorizontal: 14,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#EEE",
},

cityOption: {
  minHeight: 52,
  paddingHorizontal: 14,
  paddingVertical: 9,
  borderBottomWidth: 1,
  borderBottomColor: "#F1F1F1",
  flexDirection: "row",
  alignItems: "center",
},

cityOptionSelected: {
  backgroundColor: "#FBEFF7",
},

cityOptionTitle: {
  color: "#222",
  fontSize: 14,
  fontWeight: "600",
},

cityOptionSubtitle: {
  color: "#777",
  fontSize: 12,
  marginTop: 2,
},

cityCheck: {
  color: "#780C60",
  fontSize: 18,
  fontWeight: "800",
  marginLeft: 10,
},

fieldHint: {
  color: "#777",
  fontSize: 12,
  marginBottom: 8,
},

selectedCitiesWrap: {
  flexDirection: "row",
  flexWrap: "wrap",
  marginBottom: 6,
},

selectedCityChip: {
  backgroundColor: "#FBEFF7",
  borderWidth: 1,
  borderColor: "#E8C5DC",
  borderRadius: 20,
  paddingHorizontal: 11,
  paddingVertical: 7,
  marginRight: 7,
  marginBottom: 7,
},

selectedCityChipText: {
  color: "#780C60",
  fontSize: 12,
  fontWeight: "700",
},

noCitiesText: {
  color: "#777",
  fontSize: 13,
  textAlign: "center",
  paddingVertical: 14,
},
});

export default ContactDetailsScreen;