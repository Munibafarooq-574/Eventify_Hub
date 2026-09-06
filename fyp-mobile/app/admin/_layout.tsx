// app/admin/_layout.tsx
//
// Phase 22.1 — Admin Layout + Navigation
//
// Uses a drawer navigator (better fit than a desktop-style sidebar on
// mobile). Each screen renders its own AdminHeader with a menu button
// that opens this drawer.
//
// Requires: expo-router, @react-navigation/drawer, react-native-gesture-handler,
// react-native-reanimated (already required by expo-router's Stack too).

import React from "react";
import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { AdminColors } from "../../constants/AdminColors";

export default function AdminLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <AdminSidebar {...props} />}
        screenOptions={{
          headerShown: false, // each screen renders its own AdminHeader
          drawerType: "front",
          drawerStyle: { width: "78%", backgroundColor: AdminColors.card },
          overlayColor: "rgba(17, 24, 39, 0.4)",
        }}
      >
        <Drawer.Screen name="index" options={{ title: "Dashboard" }} />
        <Drawer.Screen name="bookings" options={{ title: "Bookings" }} />
        <Drawer.Screen name="booking-details" options={{ title: "Booking Details", swipeEnabled: false }} />
        <Drawer.Screen name="payments" options={{ title: "Payments" }} />
        <Drawer.Screen name="refunds" options={{ title: "Refunds" }} />
        <Drawer.Screen name="payouts" options={{ title: "Payouts" }} />
        <Drawer.Screen name="disputes" options={{ title: "Disputes" }} />
        <Drawer.Screen name="dispute-details" options={{ title: "Dispute Details", swipeEnabled: false }} />
        <Drawer.Screen name="commission" options={{ title: "Commission" }} />
        <Drawer.Screen name="analytics" options={{ title: "Analytics" }} />
      </Drawer>
    </GestureHandlerRootView>
  );
}