// components/admin/AdminQuickAction.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AdminColors } from "../../constants/AdminColors";

export interface QuickActionItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  accentColor?: string;
}

const DEFAULT_ACTIONS: QuickActionItem[] = [
  { label: "View Bookings", icon: "calendar-outline", route: "/admin/bookings", accentColor: AdminColors.primary },
  { label: "Review Refunds", icon: "return-down-back-outline", route: "/admin/refunds", accentColor: AdminColors.pending },
  { label: "Resolve Disputes", icon: "shield-outline", route: "/admin/disputes", accentColor: AdminColors.dispute },
  { label: "Process Payouts", icon: "cash-outline", route: "/admin/payouts", accentColor: AdminColors.processing },
];

interface AdminQuickActionProps {
  actions?: QuickActionItem[];
}

export default function AdminQuickAction({ actions = DEFAULT_ACTIONS }: AdminQuickActionProps) {
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable
          key={action.route}
          style={styles.card}
          onPress={() => router.push(action.route as any)}
        >
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: (action.accentColor ?? AdminColors.primary) + "1A" },
            ]}
          >
            <Ionicons name={action.icon} size={20} color={action.accentColor ?? AdminColors.primary} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    flexBasis: "48%",
    backgroundColor: AdminColors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: AdminColors.text,
  },
});