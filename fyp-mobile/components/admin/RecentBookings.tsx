// components/admin/RecentBookings.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { AdminColors, statusColor } from "../../constants/AdminColors";
import { RecentBookingItem } from "../../types/admin.types";
import EmptyState from "./EmptyState";

interface RecentBookingsProps {
  bookings: RecentBookingItem[];
}

export default function RecentBookings({ bookings }: RecentBookingsProps) {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Recent Bookings</Text>
        <Pressable onPress={() => router.push("/admin/bookings" as any)}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      {bookings.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No bookings yet"
          message="New bookings will show up here as they come in."
        />
      ) : (
        bookings.map((booking) => (
          <Pressable
            key={booking.id}
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: "/admin/booking-details",
                params: { id: booking.id },
              } as any)
            }
          >
            <View style={styles.rowLeft}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {booking.serviceName}
              </Text>
              <Text style={styles.vendorName} numberOfLines={1}>
                {booking.vendorName} · {booking.date}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.amount}>{booking.amountLabel}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusColor(booking.status) + "1A" },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor(booking.status) }]}>
                  {booking.status}
                </Text>
              </View>
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AdminColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: AdminColors.text,
  },
  viewAll: {
    fontSize: 13,
    color: AdminColors.primary,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "600",
    color: AdminColors.text,
  },
  vendorName: {
    fontSize: 12,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  rowRight: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 14,
    fontWeight: "600",
    color: AdminColors.text,
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
});