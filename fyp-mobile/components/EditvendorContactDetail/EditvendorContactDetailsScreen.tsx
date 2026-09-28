// fyp-mobile/components/EditvendorContactDetail/EditvendorContactDetailsScreen.tsx

import getActiveCities, {
  ActiveCity,
} from "@/services/getActiveCities";
import getVendorContactDetails from "@/services/getVendorContactDetails";
import updateContactDetails from "@/services/updateContactDetails";
import { getUserData, saveUserData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, Stack } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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

const EditContactDetailsScreen = () => {
  const [userId, setUserId] = useState<string>("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [brandName, setBrandName] = useState<string>("");
  const [contactNumber, setContactNumber] =
    useState<string>("");
  const [instagramLink, setInstagramLink] =
    useState<string>("");
  const [facebookLink, setFacebookLink] =
    useState<string>("");
  const [bookingEmail, setBookingEmail] =
    useState<string>("");
  const [website, setWebsite] = useState<string>("");

  // DB-driven location fields
  const [cities, setCities] = useState<ActiveCity[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);

  const [businessCityId, setBusinessCityId] =
    useState("");
  const [businessCitySearch, setBusinessCitySearch] =
    useState("");
  const [businessCityOpen, setBusinessCityOpen] =
    useState(false);

  const [
    serviceLocationCityIds,
    setServiceLocationCityIds,
  ] = useState<string[]>([]);

  const [serviceCitySearch, setServiceCitySearch] =
    useState("");
  const [serviceCitiesOpen, setServiceCitiesOpen] =
    useState(false);

  const [address, setAddress] = useState<string>("");
  const [googleLink, setGoogleLink] =
    useState<string>("");

  // Naya locally-picked logo
  const [logoUri, setLogoUri] =
    useState<string | null>(null);

  // DB wala existing logo
  const [existingLogoUrl, setExistingLogoUrl] =
    useState<string>("");

  const fadeAnim = useRef(
    new Animated.Value(0),
  ).current;

  const translateAnim = useRef(
    new Animated.Value(40),
  ).current;

  const buttonScale = useRef(
    new Animated.Value(1),
  ).current;

  const backScale = useRef(
    new Animated.Value(1),
  ).current;

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

  const animateBackIn = () => {
    Animated.spring(backScale, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const animateBackOut = () => {
    Animated.spring(backScale, {
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

  // Load all active DB cities
  useEffect(() => {
    const loadCities = async () => {
      try {
        setCitiesLoading(true);

        const data = await getActiveCities();

        setCities(
          Array.isArray(data) ? data : [],
        );
      } catch (error) {
        console.log(
          "Cities load error:",
          error,
        );

        Alert.alert(
          "Error",
          "Could not load cities.",
        );
      } finally {
        setCitiesLoading(false);
      }
    };

    loadCities();
  }, []);

  // Load existing vendor contact/location data
  useEffect(() => {
    const loadExisting = async () => {
      try {
        const user = await getUserData();

        if (!user) {
          throw new Error("user not found");
        }

        setUserId(user._id);

        const data =
          await getVendorContactDetails(
            user._id,
          );

        setBrandName(
          data?.brandName || "",
        );

        setContactNumber(
          data?.contactNumber || "",
        );

        setInstagramLink(
          data?.instagramLink || "",
        );

        setFacebookLink(
          data?.facebookLink || "",
        );

        setBookingEmail(
          data?.bookingEmail || "",
        );

        setWebsite(
          data?.website || "",
        );

        setBusinessCityId(
          data?.businessCityId || "",
        );

        setServiceLocationCityIds(
          Array.isArray(
            data?.serviceLocationCityIds,
          )
            ? data.serviceLocationCityIds
            : [],
        );

        setAddress(
          data?.businessAddress ||
            data?.officialAddress ||
            "",
        );

        setGoogleLink(
          data?.officialGoogleLink || "",
        );

        setExistingLogoUrl(
          data?.brandLogo || "",
        );
      } catch (error) {
        console.log(
          "Error loading contact details:",
          error,
        );

        Alert.alert(
          "Error",
          "Could not load your current contact details.",
        );
      } finally {
        setInitialLoading(false);
      }
    };

    loadExisting();
  }, []);

  const filteredBusinessCities =
    cities.filter((city) => {
      const query =
        businessCitySearch
          .trim()
          .toLowerCase();

      if (!query) {
        return true;
      }

      return [
        city.name,
        city.stateProvinceName,
        city.stateProvinceCode,
        city.countryName,
        city.countryCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

  const filteredServiceCities =
    cities.filter((city) => {
      const query =
        serviceCitySearch
          .trim()
          .toLowerCase();

      if (!query) {
        return true;
      }

      return [
        city.name,
        city.stateProvinceName,
        city.stateProvinceCode,
        city.countryName,
        city.countryCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

  const selectedBusinessCity =
    cities.find(
      (city) =>
        city._id === businessCityId,
    );

  const toggleServiceCity = (
    cityId: string,
  ) => {
    setServiceLocationCityIds(
      (current) =>
        current.includes(cityId)
          ? current.filter(
              (id) => id !== cityId,
            )
          : [...current, cityId],
    );
  };

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (
      permissionResult.status !==
      "granted"
    ) {
      Alert.alert(
        "Permission Denied",
        "Please allow access to media library to select logo.",
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync(
        {
          mediaTypes:
            ImagePicker.MediaTypeOptions
              .Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        },
      );

    if (
      !result.canceled &&
      result.assets.length > 0
    ) {
      setLogoUri(
        result.assets[0].uri,
      );
    }
  };

  const submit = async () => {
  if (
    !brandName.trim() ||
    !contactNumber.trim() ||
    !instagramLink.trim() ||
    !bookingEmail.trim() ||
    !businessCityId
  ) {
    Alert.alert(
      "Error",
      "Please fill in all the required fields marked with *.",
    );
    return;
  }

  const trimmedContactNumber = contactNumber.trim();

  if (!/^\+?[0-9]{7,15}$/.test(trimmedContactNumber)) {
    Alert.alert(
      "Error",
      "Enter a valid phone number with 7 to 15 digits. You may include a leading + country code.",
    );
    return;
  }

  if (serviceLocationCityIds.length === 0) {
    Alert.alert(
      "Error",
      "Please select at least one Service City.",
    );
    return;
  }

  setSubmitting(true);

    try {
      const formData = new FormData();

      formData.append(
        "brandName",
        brandName.trim(),
      );

      formData.append(
        "contactNumber",
        contactNumber.trim(),
      );

      formData.append(
        "instagramLink",
        instagramLink.trim(),
      );

      formData.append(
        "facebookLink",
        facebookLink.trim(),
      );

      formData.append(
        "bookingEmail",
        bookingEmail.trim(),
      );

      formData.append(
        "businessCityId",
        businessCityId,
      );

      serviceLocationCityIds.forEach(
        (cityId) => {
          formData.append(
            "serviceLocationCityIds",
            cityId,
          );
        },
      );

      formData.append(
        "website",
        website.trim(),
      );

      formData.append(
        "officialAddress",
        address.trim(),
      );

      formData.append(
        "officialGoogleLink",
        googleLink.trim(),
      );

      // Sirf tab file bhejo jab
      // vendor ne naya logo choose kiya ho.
      if (logoUri) {
        const filename =
          logoUri.split("/").pop() ||
          "business-logo.jpg";

        const match =
          /\.(\w+)$/.exec(filename);

        const type = match
          ? `image/${match[1]}`
          : "image/jpeg";

        (formData as any).append(
          "file",
          {
            uri: logoUri,
            name: filename,
            type,
          },
        );
      }

      const response =
        await updateContactDetails(
          userId,
          formData,
        );

      // Refresh locally cached user
      try {
        const user =
          await getUserData();

        if (user) {
          user.contactDetails =
            response?.contactDetails || {
              brandName:
                brandName.trim(),

              contactNumber:
                contactNumber.trim(),

              instagramLink:
                instagramLink.trim(),

              facebookLink:
                facebookLink.trim(),

              bookingEmail:
                bookingEmail.trim(),

              website:
                website.trim(),

              officialAddress:
                address.trim(),

              officialGoogleLink:
                googleLink.trim(),

              brandLogo:
                response
                  ?.contactDetails
                  ?.brandLogo ||
                existingLogoUrl,
            };

          user.businessCityId =
            businessCityId;

          user.businessAddress =
            address.trim();

          user.serviceLocationCityIds =
            serviceLocationCityIds;

          await saveUserData(user);
        }
      } catch (error) {
        console.log(
          "Failed to refresh cached user:",
          error,
        );
      }

      Alert.alert(
        "Success",
        "Contact details updated successfully!",
        [
          {
            text: "OK",
            onPress: () =>
              router.back(),
          },
        ],
      );
    } catch (error: any) {
      console.log(
        "Contact details update error:",
        error?.response?.data ||
          error?.message ||
          error,
      );

      const backendMessage =
        error?.response?.data?.message
          ?.message?.[0] ||
        error?.response?.data?.message
          ?.message ||
        error?.response?.data?.message ||
        "Something went wrong. Please try again.";

      Alert.alert(
        "Error",
        typeof backendMessage ===
          "string"
          ? backendMessage
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />

        <View
          style={
            styles.loadingContainer
          }
        >
          <ActivityIndicator
            size="large"
            color="#780C60"
          />
        </View>
      </>
    );
  }

  const displayedLogo =
    logoUri || existingLogoUrl;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <KeyboardAvoidingView
        style={{
          flex: 1,
          backgroundColor:
            "#FBF3F9",
        }}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <View style={styles.topBar}>
          <Animated.View
            style={{
              transform: [
                {
                  scale:
                    backScale,
                },
              ],
            }}
          >
            <Pressable
              onPressIn={
                animateBackIn
              }
              onPressOut={
                animateBackOut
              }
              onPress={() =>
                router.back()
              }
              style={
                styles.iconBackButton
              }
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color="#780C60"
              />
            </Pressable>
          </Animated.View>
        </View>

        <Animated.ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.container
          }
          style={{
            opacity: fadeAnim,
            transform: [
              {
                translateY:
                  translateAnim,
              },
            ],
          }}
        >
          <View
            style={styles.header}
          >
            <Text
              style={styles.title}
            >
              Let's Polish Your
              Profile
            </Text>

            <Text
              style={
                styles.description
              }
            >
              Update how customers
              see and reach out to
              your business.
            </Text>

            <View
              style={styles.badge}
            >
              <Ionicons
                name="briefcase-outline"
                size={14}
                color="#780C60"
              />

              <Text
                style={
                  styles.badgeText
                }
              >
                Business Profile
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={
              styles.logoCard
            }
            activeOpacity={0.85}
            onPress={pickImage}
          >
            <View
              style={
                styles.logoRing
              }
            >
              {displayedLogo ? (
                <Image
                  source={{
                    uri: displayedLogo,
                  }}
                  style={
                    styles.logo
                  }
                />
              ) : (
                <View
                  style={
                    styles.initialLogo
                  }
                >
                  <Text
                    style={
                      styles.initialText
                    }
                  >
                    {brandName
                      ? brandName
                          .trim()
                          .split(" ")
                          .map(
                            (word) =>
                              word[0],
                          )
                          .join("")
                          .substring(
                            0,
                            2,
                          )
                          .toUpperCase()
                      : "BN"}
                  </Text>
                </View>
              )}

              <View
                style={
                  styles.editBadge
                }
              >
                <Ionicons
                  name="camera"
                  size={14}
                  color="#fff"
                />
              </View>
            </View>

            <Text
              style={
                styles.logoTitle
              }
            >
              Business Logo *
            </Text>

            <Text
              style={
                styles.logoText
              }
            >
              Tap to change your
              brand logo
            </Text>
          </TouchableOpacity>

          {/* Brand Name */}

          <View
            style={
              styles.inputCard
            }
          >
            <Text
              style={styles.label}
            >
              Brand Name *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Enter Brand Name"
              placeholderTextColor="#B79CB0"
              value={brandName}
              onChangeText={
                setBrandName
              }
            />
          </View>

          {/* Contact Number */}

          <View
            style={
              styles.inputCard
            }
          >
            <Text
              style={styles.label}
            >
              Contact Number *
            </Text>

            <View
  style={
    styles.phoneInputContainer
  }
>
  <TextInput
    style={
      styles.phoneInput
    }
    placeholder="+1 2025550123"
    placeholderTextColor="#B79CB0"
    keyboardType="phone-pad"
    value={
      contactNumber
    }
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

          {/* Instagram */}

          <View
            style={
              styles.inputCard
            }
          >
            <Text
              style={styles.label}
            >
              Instagram *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="https://instagram.com/yourpage"
              placeholderTextColor="#B79CB0"
              autoCapitalize="none"
              value={
                instagramLink
              }
              onChangeText={
                setInstagramLink
              }
            />
          </View>

          {/* Facebook */}

          <View
            style={
              styles.inputCard
            }
          >
            <Text
              style={styles.label}
            >
              Facebook
            </Text>

            <TextInput
              style={styles.input}
              placeholder="https://facebook.com/yourpage"
              placeholderTextColor="#B79CB0"
              autoCapitalize="none"
              value={
                facebookLink
              }
              onChangeText={
                setFacebookLink
              }
            />
          </View>

          {/* Booking Email */}

          <View
            style={
              styles.inputCard
            }
          >
            <Text
              style={styles.label}
            >
              Booking Email *
            </Text>

            <TextInput
              style={styles.input}
              placeholder="example@email.com"
              placeholderTextColor="#B79CB0"
              keyboardType="email-address"
              autoCapitalize="none"
              value={
                bookingEmail
              }
              onChangeText={
                setBookingEmail
              }
            />
          </View>

          {/* Website */}

          <View
            style={
              styles.inputCard
            }
          >
            <Text
              style={styles.label}
            >
              Website
            </Text>

            <TextInput
              style={styles.input}
              placeholder="https://yourwebsite.com"
              placeholderTextColor="#B79CB0"
              autoCapitalize="none"
              value={website}
              onChangeText={
                setWebsite
              }
            />
          </View>

          {/* Business City */}

          <View
            style={
              styles.inputCard
            }
          >
            <Text
              style={styles.label}
            >
              Business City *
            </Text>

            <TouchableOpacity
              style={
                styles.citySelector
              }
              activeOpacity={0.8}
              onPress={() => {
                setBusinessCityOpen(
                  (current) =>
                    !current,
                );

                setServiceCitiesOpen(
                  false,
                );
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

              <Text
                style={
                  styles.cityArrow
                }
              >
                {businessCityOpen
                  ? "▲"
                  : "▼"}
              </Text>
            </TouchableOpacity>

            {businessCityOpen && (
              <View
                style={
                  styles.cityDropdown
                }
              >
                <TextInput
                  style={
                    styles.citySearchInput
                  }
                  placeholder="Search city, state or country"
                  placeholderTextColor="#B79CB0"
                  value={
                    businessCitySearch
                  }
                  onChangeText={
                    setBusinessCitySearch
                  }
                />

                <ScrollView
                  style={styles.cityOptionsScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator
                >
                {filteredBusinessCities.map(
                  (item) => (
                    <TouchableOpacity
                      key={item._id}
                      style={
                        styles.cityOption
                      }
                      onPress={() => {
                        setBusinessCityId(
                          item._id,
                        );

                        setBusinessCitySearch(
                          "",
                        );

                        setBusinessCityOpen(
                          false,
                        );
                      }}
                    >
                      <Text
                        style={
                          styles.cityOptionTitle
                        }
                      >
                        {item.name}
                      </Text>

                      <Text
                        style={
                          styles.cityOptionSubtitle
                        }
                      >
                        {
                          item.stateProvinceName
                        }
                        ,{" "}
                        {
                          item.countryName
                        }
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </ScrollView>
                {!citiesLoading &&
                  filteredBusinessCities.length ===
                    0 && (
                    <Text
                      style={
                        styles.noCitiesText
                      }
                    >
                      No cities
                      found.
                    </Text>
                  )}
              </View>
            )}
          </View>

          {/* Service Cities */}

          <View
            style={
              styles.inputCard
            }
          >
            <Text
              style={styles.label}
            >
              Service Cities *
            </Text>

            <Text
              style={
                styles.fieldHint
              }
            >
              Select all cities where
              you provide services.
            </Text>

            {serviceLocationCityIds.length >
              0 && (
              <View
                style={
                  styles.selectedCitiesWrap
                }
              >
                {serviceLocationCityIds.map(
                  (cityId) => {
                    const selectedCity =
                      cities.find(
                        (item) =>
                          item._id ===
                          cityId,
                      );

                    if (
                      !selectedCity
                    ) {
                      return null;
                    }

                    return (
                      <TouchableOpacity
                        key={cityId}
                        style={
                          styles.selectedCityChip
                        }
                        onPress={() =>
                          toggleServiceCity(
                            cityId,
                          )
                        }
                      >
                        <Text
                          style={
                            styles.selectedCityChipText
                          }
                        >
                          {
                            selectedCity.name
                          }{" "}
                          ×
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </View>
            )}

            <TouchableOpacity
              style={
                styles.citySelector
              }
              activeOpacity={0.8}
              onPress={() => {
                setServiceCitiesOpen(
                  (current) =>
                    !current,
                );

                setBusinessCityOpen(
                  false,
                );
              }}
            >
              <Text
                style={
                  styles.citySelectorText
                }
              >
                {citiesLoading
                  ? "Loading cities..."
                  : "Add Service Cities"}
              </Text>

              <Text
                style={
                  styles.cityArrow
                }
              >
                {serviceCitiesOpen
                  ? "▲"
                  : "▼"}
              </Text>
            </TouchableOpacity>

            {serviceCitiesOpen && (
              <View
                style={
                  styles.cityDropdown
                }
              >
                <TextInput
                  style={
                    styles.citySearchInput
                  }
                  placeholder="Search city, state or country"
                  placeholderTextColor="#B79CB0"
                  value={
                    serviceCitySearch
                  }
                  onChangeText={
                    setServiceCitySearch
                  }
                />
              <ScrollView
                style={styles.cityOptionsScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
              >
                {filteredServiceCities.map(
                  (item) => {
                    const selected =
                      serviceLocationCityIds.includes(
                        item._id,
                      );

                    return (
                      <TouchableOpacity
                        key={item._id}
                        style={[
                          styles.cityOption,
                          selected &&
                            styles.cityOptionSelected,
                        ]}
                        onPress={() =>
                          toggleServiceCity(
                            item._id,
                          )
                        }
                      >
                        <View
                          style={{
                            flex: 1,
                          }}
                        >
                          <Text
                            style={
                              styles.cityOptionTitle
                            }
                          >
                            {item.name}
                          </Text>

                          <Text
                            style={
                              styles.cityOptionSubtitle
                            }
                          >
                            {
                              item.stateProvinceName
                            }
                            ,{" "}
                            {
                              item.countryName
                            }
                          </Text>
                        </View>

                        <Text
                          style={
                            styles.cityCheck
                          }
                        >
                          {selected
                            ? "✓"
                            : ""}
                        </Text>
                      </TouchableOpacity>
                    );
                  },
                )}
              </ScrollView>
                {!citiesLoading &&
                  filteredServiceCities.length ===
                    0 && (
                    <Text
                      style={
                        styles.noCitiesText
                      }
                    >
                      No cities
                      found.
                    </Text>
                  )}
              </View>
            )}
          </View>

          {/* Official Address */}

          <View
            style={
              styles.inputCard
            }
          >
            <Text
              style={styles.label}
            >
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
              placeholderTextColor="#B79CB0"
              multiline
              value={address}
              onChangeText={
                setAddress
              }
            />
          </View>

          {/* Google Maps Link */}

          <View
            style={
              styles.inputCard
            }
          >
            <Text
              style={styles.label}
            >
              Google Maps Link
            </Text>

            <TextInput
              style={styles.input}
              placeholder="https://maps.google.com/..."
              placeholderTextColor="#B79CB0"
              autoCapitalize="none"
              value={
                googleLink
              }
              onChangeText={
                setGoogleLink
              }
            />
          </View>

          {/* Buttons */}

          <View
            style={
              styles.buttonContainer
            }
          >
            <TouchableOpacity
              style={
                styles.cancelButton
              }
              activeOpacity={0.85}
              onPress={() =>
                router.back()
              }
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>

            <Animated.View
              style={{
                flex: 1,
                marginLeft: 12,
                transform: [
                  {
                    scale:
                      buttonScale,
                  },
                ],
              }}
            >
              <Pressable
                onPressIn={
                  animateButtonIn
                }
                onPressOut={
                  animateButtonOut
                }
                onPress={submit}
                disabled={
                  submitting
                }
                style={[
                  styles.saveButton,
                  submitting && {
                    opacity: 0.75,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator
                    color="#fff"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#fff"
                      style={{
                        marginRight: 8,
                      }}
                    />

                    <Text
                      style={
                        styles.saveButtonText
                      }
                    >
                      Save Changes
                    </Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          </View>

          <View
            style={{
              height: 40,
            }}
          />
        </Animated.ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FBF3F9",
  },

  container: {
    flexGrow: 1,
    backgroundColor: "#FBF3F9",
    paddingHorizontal: 22,
    paddingTop: 90,
    paddingBottom: 120,
  },

  topBar: {
    position: "absolute",
    top:
      Platform.OS === "ios"
        ? 54
        : 30,
    left: 20,
    zIndex: 10,
  },

  iconBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },

  header: {
    marginBottom: 26,
    alignItems: "center",
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2A1128",
    marginBottom: 10,
    textAlign: "center",
  },

  description: {
    fontSize: 14.5,
    color: "#7A6B78",
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 300,
    marginBottom: 14,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4D8EC",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },

  badgeText: {
    color: "#780C60",
    fontSize: 12.5,
    fontWeight: "700",
    marginLeft: 4,
    letterSpacing: 0.3,
  },

  logoCard: {
    backgroundColor: "#fff",
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
    marginBottom: 26,
    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },

  logoRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#F4D8EC",
  },

  logoTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2A1128",
    marginBottom: 5,
  },

  logoText: {
    color: "#9A8A97",
    fontSize: 13.5,
  },

  initialLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#780C60",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#F4D8EC",
  },

  initialText: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 1,
  },

  editBadge: {
    position: "absolute",
    bottom: 12,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#780C60",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  inputCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 14,
    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },

  label: {
    color: "#780C60",
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.2,
  },

  input: {
    fontSize: 15.5,
    color: "#2A1128",
    paddingVertical: 4,
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
    color: "#2A1128",
    marginRight: 10,
  },

  cityPlaceholderText: {
    color: "#B79CB0",
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
  maxHeight: 260,
},
  citySearchInput: {
    fontSize: 14,
    color: "#2A1128",
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
    color: "#2A1128",
    fontSize: 14,
    fontWeight: "600",
  },

  cityOptionSubtitle: {
    color: "#7A6B78",
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
    color: "#7A6B78",
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
    color: "#7A6B78",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 14,
  },

  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  flag: {
    fontSize: 22,
    marginRight: 10,
  },

  phoneInput: {
    flex: 1,
    fontSize: 15.5,
    color: "#2A1128",
  },

  buttonContainer: {
    flexDirection: "row",
    marginTop: 20,
    marginBottom: 10,
  },

  cancelButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#780C60",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },

  cancelButtonText: {
    color: "#780C60",
    fontSize: 16,
    fontWeight: "700",
  },

  saveButton: {
    flexDirection: "row",
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
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});

export default EditContactDetailsScreen;