import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import AdminCategoryRequests from "../../components/admin/AdminCategoryRequests";
import { AdminColors } from "../../constants/AdminColors";

export default function AdminCategoryRequestsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={AdminColors.text}
          />
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>
            Category Requests
          </Text>

          <Text style={styles.subtitle}>
            Review vendor category requests
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <AdminCategoryRequests />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F9",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  title: {
    fontSize: 18,
    fontWeight: "800",
    color: AdminColors.text,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 11,
    color: AdminColors.textMuted,
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
});