import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
} from "react-native";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { saveSecureData } from "@/store";

export default function SelectRoleScreen() {
  const [selectedRole, setSelectedRole] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

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
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const toggleModal = () => {
    setModalVisible(!modalVisible);
  };

  const handleConfirm = async () => {
    console.log("Selected Role:", selectedRole);
    await saveSecureData("role", selectedRole);
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={28}
          color="#780C60"
        />
      </TouchableOpacity>

      {/* Header */}

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
        <Ionicons
          name="person-circle"
          size={95}
          color="#780C60"
        />

        <Text style={styles.title}>
          Select Your Role
        </Text>

        <Text style={styles.subtitle}>
          Choose how you want to join Eventify Hub.
        </Text>
      </Animated.View>

      {/* Label */}

      <Text style={styles.label}>
        Join As
      </Text>

      {/* Role Card */}

      <TouchableOpacity
        style={styles.roleCard}
        onPress={toggleModal}
      >
        <Text style={styles.roleText}>
          {selectedRole || "Choose Role"}
        </Text>

        <Ionicons
          name="chevron-down"
          size={22}
          color="#780C60"
        />
      </TouchableOpacity>

      {/* Modal */}

      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>
              Choose Role
            </Text>

            {/* Organizer */}

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                setSelectedRole("Organizer");
                setModalVisible(false);
              }}
            >
              <Ionicons
                name="calendar"
                size={22}
                color="#780C60"
              />

              <Text style={styles.optionText}>
                Organizer
              </Text>
            </TouchableOpacity>

            {/* Vendor */}

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                setSelectedRole("Vendor");
                setModalVisible(false);
              }}
            >
              <Ionicons
                name="storefront"
                size={22}
                color="#780C60"
              />

              <Text style={styles.optionText}>
                Vendor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancel}>
                Cancel
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* Continue Button */}

      <TouchableOpacity
        style={[
          styles.confirmButton,
          !selectedRole && { opacity: 0.5 },
        ]}
        disabled={!selectedRole}
        onPress={async () => {
          await handleConfirm();

          if (selectedRole === "Organizer") {
            router.push("/signup");
          } else if (selectedRole === "Vendor") {
            router.push("/bussinessselection");
          } else {
            alert("Please select a role.");
          }
        }}
      >
        <Text style={styles.confirmButtonText}>
          Continue →
        </Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7ECF5",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 60,
  },

  // Back Button

  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 10,

    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",

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

  // Title

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginTop: 15,
  },

  // Subtitle

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    color: "#777",
    textAlign: "center",
    width: "85%",
    lineHeight: 22,
  },

  // Label

  label: {
    alignSelf: "flex-start",
    marginTop: 55,
    marginLeft: 8,
    marginBottom: 12,

    fontSize: 16,
    fontWeight: "600",
    color: "#444",
  },

  // Role Card

  roleCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",

    borderRadius: 18,

    paddingVertical: 18,
    paddingHorizontal: 20,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,

    elevation: 6,
  },

  roleText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },

  // Continue Button

  confirmButton: {
    width: "100%",
    marginTop: 55,

    backgroundColor: "#780C60",

    paddingVertical: 18,

    borderRadius: 18,

    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.30,
    shadowRadius: 10,

    elevation: 10,
  },

  confirmButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Modal Background

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },

  // Modal Card

  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",

    borderRadius: 22,

    paddingHorizontal: 22,
    paddingVertical: 25,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.18,
    shadowRadius: 10,

    elevation: 10,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#780C60",
    marginBottom: 20,
    textAlign: "center",
  },

  // Modal Options

  option: {
    flexDirection: "row",
    alignItems: "center",

    paddingVertical: 18,
    paddingHorizontal: 10,

    borderRadius: 15,
    marginBottom: 10,

    backgroundColor: "#FAFAFA",
  },

  optionText: {
    marginLeft: 15,
    fontSize: 17,
    color: "#333",
    fontWeight: "500",
  },

  cancel: {
    textAlign: "center",
    marginTop: 20,

    fontSize: 16,
    fontWeight: "600",
    color: "#E15A45",
  },
});