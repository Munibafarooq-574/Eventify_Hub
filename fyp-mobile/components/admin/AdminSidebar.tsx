// components/admin/AdminSidebar.tsx
//
// Drawer content for the admin panel. Passed as the `drawerContent`
// prop to the Drawer navigator in app/admin/_layout.tsx.

import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { DrawerContentComponentProps } from "@react-navigation/drawer";
import { AdminColors } from "../../constants/AdminColors";

interface NavItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: "home-outline", route: "/admin" },
  { label: "Bookings", icon: "calendar-outline", route: "/admin/bookings" },
  { label: "Payments", icon: "card-outline", route: "/admin/payments" },
  { label: "Refunds", icon: "return-down-back-outline", route: "/admin/refunds" },
  { label: "Payouts", icon: "cash-outline", route: "/admin/payouts" },
  { label: "Disputes", icon: "shield-outline", route: "/admin/disputes" },
  { label: "Commission", icon: "pricetag-outline", route: "/admin/commission" },
  { label: "Analytics", icon: "bar-chart-outline", route: "/admin/analytics" },
];

export default function AdminSidebar(props: DrawerContentComponentProps) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.brandTitle}>EVENTIFY HUB</Text>
        <Text style={styles.brandSubtitle}>Admin Panel</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.route;
          return (
            <Pressable
              key={item.route}
              onPress={() => {
                router.push(item.route as any);
                props.navigation.closeDrawer();
              }}
              style={[styles.item, active && styles.itemActive]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? AdminColors.primary : AdminColors.textMuted}
              />
              <Text style={[styles.itemLabel, active && styles.itemLabelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.item}
          onPress={() => router.push("/admin/settings" as any)}
        >
          <Ionicons name="settings-outline" size={20} color={AdminColors.textMuted} />
          <Text style={styles.itemLabel}>Settings</Text>
        </Pressable>
        <Pressable
          style={styles.item}
          onPress={() => {
            // Wire this to your existing sign-out / auth clear logic
          }}
        >
          <Ionicons name="log-out-outline" size={20} color={AdminColors.danger} />
          <Text style={[styles.itemLabel, { color: AdminColors.danger }]}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AdminColors.card,
  },
  brand: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    color: AdminColors.primary,
  },
  brandSubtitle: {
    fontSize: 13,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  list: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  itemActive: {
    backgroundColor: AdminColors.primaryMuted,
  },
  itemLabel: {
    fontSize: 15,
    color: AdminColors.text,
  },
  itemLabelActive: {
    color: AdminColors.primary,
    fontWeight: "600",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    paddingVertical: 12,
    paddingBottom: 24,
  },
});