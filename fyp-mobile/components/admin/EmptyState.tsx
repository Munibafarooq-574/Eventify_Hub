// components/admin/EmptyState.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminColors } from "../../constants/AdminColors";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
}

export default function EmptyState({
  icon = "file-tray-outline",
  title,
  message,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={40} color={AdminColors.textMuted} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
    color: AdminColors.text,
  },
  message: {
    marginTop: 4,
    fontSize: 13,
    color: AdminColors.textMuted,
    textAlign: "center",
  },
});