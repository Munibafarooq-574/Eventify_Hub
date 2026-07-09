import Register from "@/services/register";
import { getSecureData, saveSecureData } from "@/store";
import { Ionicons } from "@expo/vector-icons";
import { Asset } from "expo-asset";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";

import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Toast from "react-native-toast-message";

export default function SignUpIndex() {

// States
const [isDisabled, setIsDisabled] = useState(true);
const [isLoading, setIsLoading] = useState(false);

const [email, setEmail] = useState("");
const [name, setName] = useState("");
const [phone, setPhone] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [role, setRole] = useState("");
const [buisnessCategory, setBuisnessCategory] = useState("");

const [showPassword, setShowPassword] = useState(false);
const [showConfirmPassword, setShowConfirmPassword] = useState(false);

const [passwordStrength, setPasswordStrength] = useState("");
const [passwordSuggestion, setPasswordSuggestion] = useState("");
const [emailError, setEmailError] = useState("");
const [phoneError, setPhoneError] = useState("");
const [confirmError, setConfirmError] = useState("");

// Assets
const image = Asset.fromModule(
  require("@/assets/images/GetStarted.png")
).uri;

const google = Asset.fromModule(
  require("@/assets/images/google-icon.png")
).uri;

const facebook = Asset.fromModule(
  require("@/assets/images/facebook-icon.png")
).uri;

// Premium Animations
const fadeAnim = useRef(new Animated.Value(0)).current;
const slideAnim = useRef(new Animated.Value(50)).current;
const scaleAnim = useRef(new Animated.Value(0.85)).current;

// Screen Animation
useEffect(() => {
  Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 700,
      useNativeDriver: true,
    }),

    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }),
  ]).start();
}, []);

// Load Secure Data
useEffect(() => {
  getRole();
  getSelectedCategory();
}, []);

// Get Role
const getRole = async () => {
  const roleData = await getSecureData("role");
  setRole(roleData || "");
};

// Get Business Category
const getSelectedCategory = async () => {
  const category = await getSecureData("buisness");
  setBuisnessCategory(category || "");
};

// Email Validation
const validateEmail = (text: string) => {
  setEmail(text);

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (text.length === 0) {
    setEmailError("");
  } else if (!regex.test(text)) {
    setEmailError("Invalid email address");
  } else {
    setEmailError("");
  }
};

// Phone Validation
const validatePhone = (text: string) => {
  const cleaned = text.replace(/[^0-9]/g, "");

  setPhone(cleaned);

  if (cleaned.length === 0) {
    setPhoneError("");
  } else if (cleaned.length !== 11) {
    setPhoneError("Phone number must be 11 digits");
  } else {
    setPhoneError("");
  }
};

// Password Strength
const checkPasswordStrength = (text: string) => {
  setPassword(text);

  if (text.length < 6) {
    setPasswordStrength("Weak");
    setPasswordSuggestion(
      "Use at least 8 characters, one uppercase letter, one number, and one special character."
    );
  } 
  else if (
    text.length >= 6 &&
    /[A-Z]/.test(text) &&
    /\d/.test(text) &&
    !/[!@#$%^&*]/.test(text)
  ) {
    setPasswordStrength("Medium");
    setPasswordSuggestion(
      "Add a special character (e.g. @, #, !) to make your password stronger."
    );
  } 
  else if (
    text.length >= 8 &&
    /[A-Z]/.test(text) &&
    /[a-z]/.test(text) &&
    /\d/.test(text) &&
    /[!@#$%^&*]/.test(text)
  ) {
    setPasswordStrength("Strong");
    setPasswordSuggestion("Great! Your password is strong.");
  } 
  else {
    setPasswordStrength("Weak");
    setPasswordSuggestion(
      "Include uppercase, lowercase, numbers, and special characters."
    );
  }
};

// Confirm Password
const validateConfirmPassword = (text: string) => {
  setConfirmPassword(text);

  if (text === "") {
    setConfirmError("");
  } else if (text !== password) {
    setConfirmError("Passwords do not match");
  } else {
    setConfirmError("");
  }
};

// Enable Button
useEffect(() => {
  if (
    name &&
    email &&
    phone &&
    password &&
    confirmPassword &&
    !emailError &&
    !phoneError &&
    !confirmError
  ) {
    setIsDisabled(false);
  } else {
    setIsDisabled(true);
  }
}, [
  name,
  email,
  phone,
  password,
  confirmPassword,
  emailError,
  phoneError,
  confirmError,
]);

// Register Function
const handleRegister = async () => {
  try {
    setIsLoading(true);
    setIsDisabled(true);

    const response = await Register(
      email,
      password,
      name,
      role,
      buisnessCategory,
      phone
    );

    await saveSecureData("token", response.token);
    await saveSecureData(
      "user",
      JSON.stringify(response.user)
    );

    setIsLoading(false);

    if (response.user.role === "Vendor") {
      router.push("/vendorcontactdetails");
    } else {
      router.push("/dashboard");
    }
  } catch (e: any) {
    setIsLoading(false);
    setIsDisabled(false);

    Toast.show({
      type: "error",
      text1: "Registration Failed",
      text2: e.toString(),
    });
  }
};

// Reset Fields
const reset = () => {
  setName("");
  setEmail("");
  setPhone("");
  setPassword("");
  setConfirmPassword("");
};

return (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === "ios" ? "padding" : "height"}
  >
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Toast />

      {/* Back Button */}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={26}
          color="#780C60"
        />
      </TouchableOpacity>

      {/* Animated Header */}

      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          alignItems: "center",
          width: "100%",
        }}
      >
        <Image
          source={{ uri: image }}
          style={styles.logo}
        />

        <Text style={styles.title}>
          Create Account
        </Text>

        <Text style={styles.subtitle}>
          Join Eventify Hub and start creating
          unforgettable events.
        </Text>
      </Animated.View>

      {/* Name */}

      <Text style={styles.label}>
        Full Name
      </Text>

      <View style={styles.inputCard}>
        <Ionicons
          name="person-outline"
          size={20}
          color="#780C60"
        />

        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#999"
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Email */}

      <Text style={styles.label}>
        Email Address
      </Text>

      <View style={styles.inputCard}>
        <Ionicons
          name="mail-outline"
          size={20}
          color="#780C60"
        />

        <TextInput
          style={styles.input}
          placeholder="example@email.com"
          placeholderTextColor="#999"
          value={email}
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={validateEmail}
        />
      </View>

      {emailError !== "" && (
        <Text style={styles.errorText}>
          {emailError}
        </Text>
      )}

      {/* Phone */}

      <Text style={styles.label}>
        Phone Number
      </Text>

      <View style={styles.inputCard}>
        <Ionicons
          name="call-outline"
          size={20}
          color="#780C60"
        />

        <TextInput
          style={styles.input}
          placeholder="03XXXXXXXXX"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          maxLength={11}
          value={phone}
          onChangeText={validatePhone}
        />
      </View>

      {phoneError !== "" && (
        <Text style={styles.errorText}>
          {phoneError}
        </Text>
      )}

            {/* Password */}

      <Text style={styles.label}>
        Password
      </Text>

      <View style={styles.inputCard}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color="#780C60"
        />

        <TextInput
          style={styles.input}
          placeholder="Enter password"
          placeholderTextColor="#999"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={checkPasswordStrength}
        />

        <TouchableOpacity
          onPress={() =>
            setShowPassword(!showPassword)
          }
        >
          <Ionicons
            name={
              showPassword
                ? "eye-off-outline"
                : "eye-outline"
            }
            size={22}
            color="#780C60"
          />
        </TouchableOpacity>
      </View>

      {passwordStrength !== "" && (
  <Text
    style={[
      styles.passwordStrength,
      passwordStrength === "Weak" && { color: "#FF3B30" },
      passwordStrength === "Medium" && { color: "#FF9500" },
      passwordStrength === "Strong" && { color: "#34C759" },
    ]}
  >
    Password Strength : {passwordStrength}
    </Text>
      )}

    {passwordSuggestion !== "" && (
    <Text style={styles.passwordSuggestion}>
    {passwordSuggestion}
   </Text>
    )}

      {/* Confirm Password */}

      <Text style={styles.label}>
        Confirm Password
      </Text>

      <View style={styles.inputCard}>
        <Ionicons
          name="shield-checkmark-outline"
          size={20}
          color="#780C60"
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor="#999"
          secureTextEntry={!showConfirmPassword}
          value={confirmPassword}
          onChangeText={validateConfirmPassword}
        />

        <TouchableOpacity
          onPress={() =>
            setShowConfirmPassword(
              !showConfirmPassword
            )
          }
        >
          <Ionicons
            name={
              showConfirmPassword
                ? "eye-off-outline"
                : "eye-outline"
            }
            size={22}
            color="#780C60"
          />
        </TouchableOpacity>
      </View>

      {confirmError !== "" && (
        <Text style={styles.errorText}>
          {confirmError}
        </Text>
      )}

      {/* Terms */}

      <Text style={styles.termsText}>
        By creating your account, you agree to our{" "}

        <Text
      style={styles.highlight}
      onPress={() => router.push("/termsofservices")}
      >
      Terms of Service
      </Text>

        {" "}and{" "}

        <Text
          style={styles.highlight}
          onPress={() =>
            router.push("/privacypolicy")
          }
        >
          Privacy Policy
        </Text>

      </Text>

      {/* Create Account Button */}

      <TouchableOpacity
        style={[
          styles.registerButton,
          isDisabled &&
            styles.disabledButton,
        ]}
        disabled={isDisabled}
        onPress={handleRegister}
      >
        {isLoading ? (
          <ActivityIndicator
            color="#FFF"
          />
        ) : (
          <>
            <Text
              style={styles.registerButtonText}
            >
              Create Account
            </Text>

            <Ionicons
              name="arrow-forward"
              size={20}
              color="#FFF"
              style={{ marginLeft: 8 }}
            />
          </>
        )}
      </TouchableOpacity>

      <Toast />

    </ScrollView>

  </KeyboardAvoidingView>
);
}
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#F8E9F0",
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Back Button

  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 20,

    width: 45,
    height: 45,
    borderRadius: 22.5,

    backgroundColor: "#FFF",

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 5,

    elevation: 6,
  },

  // Logo

  logo: {
    width: 110,
    height: 110,
    resizeMode: "contain",
    marginTop: 40,
    marginBottom: 15,
  },

  // Title

  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#780C60",
    marginTop: 10,
  },

  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 35,
    paddingHorizontal: 20,
    lineHeight: 22,
  },

  // Labels

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginLeft: 5,
    marginTop: 8,
  },

  // Input Card

  inputCard: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#FFF",

    borderRadius: 18,

    paddingHorizontal: 15,
    paddingVertical: 5,

    marginBottom: 15,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,

    elevation: 4,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    paddingVertical: 15,
    paddingHorizontal: 12,
  },

  // Validation

  errorText: {
    color: "#E53935",
    fontSize: 13,
    marginBottom: 10,
    marginLeft: 8,
  },

  passwordStrength: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 15,
    marginLeft: 8,
  },

  passwordSuggestion: {
  fontSize: 13,
  color: "#666",
  marginTop: -8,
  marginBottom: 15,
  marginLeft: 8,
  lineHeight: 18,
},
  // Terms

  termsText: {
    marginTop: 15,
    textAlign: "center",
    color: "#666",
    fontSize: 13,
    lineHeight: 22,
  },

  highlight: {
    color: "#E15A45",
    fontWeight: "700",
  },

  // Register Button

  registerButton: {
    backgroundColor: "#780C60",

    borderRadius: 18,

    marginTop: 30,

    paddingVertical: 17,

    flexDirection: "row",

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.35,
    shadowRadius: 8,

    elevation: 10,
  },

  registerButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
  },

  disabledButton: {
    backgroundColor: "#B5B5B5",
    opacity: 0.7,
  },

  // Optional Divider

  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 25,
  },

  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#DDD",
  },

  separatorText: {
    marginHorizontal: 10,
    color: "#888",
    fontSize: 13,
  },

  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFF",

    borderRadius: 15,

    paddingVertical: 15,

    marginBottom: 15,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,

    elevation: 3,
  },

  socialIcon: {
    width: 22,
    height: 22,
    marginRight: 10,
  },

  socialButtonText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
});