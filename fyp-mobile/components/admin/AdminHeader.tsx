// components/admin/AdminHeader.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";
import { DrawerActions } from "@react-navigation/native";
import { AdminColors } from "../../constants/AdminColors";

interface AdminHeaderProps {
  title?: string;
  onNotificationsPress?: () => void;
}

export default function AdminHeader({
  title = "Eventify Hub Admin",
  onNotificationsPress,
}: AdminHeaderProps) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        hitSlop={12}
        style={styles.iconButton}
      >
        <Ionicons name="menu-outline" size={24} color={AdminColors.text} />
      </Pressable>

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <Pressable onPress={onNotificationsPress} hitSlop={12} style={styles.iconButton}>
        <Ionicons name="notifications-outline" size={22} color={AdminColors.text} />
        {/* Notification dot — wire to real unread count */}
        <View style={styles.badge} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: AdminColors.card,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: AdminColors.text,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AdminColors.danger,
  },
});