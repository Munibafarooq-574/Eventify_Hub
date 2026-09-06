// components/admin/AdminBookingCard.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminColors, statusColor } from "../../constants/AdminColors";
import { BookingListItem } from "../../types/admin.types";

interface AdminBookingCardProps {
  booking: BookingListItem;
  onPress: () => void;
}

export default function AdminBookingCard({ booking, onPress }: AdminBookingCardProps) {
  const isParentOrder = booking.entityType === "ORDER";

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <View
          style={[
            styles.entityBadge,
            { backgroundColor: isParentOrder ? AdminColors.primaryMuted : AdminColors.background },
          ]}
        >
          <Text
            style={[
              styles.entityBadgeText,
              { color: isParentOrder ? AdminColors.primary : AdminColors.textMuted },
            ]}
          >
            {isParentOrder ? "ORDER" : "VENDOR ORDER"}
          </Text>
        </View>
        <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
      </View>

      <Text style={styles.serviceName} numberOfLines={1}>
        {booking.serviceName}
      </Text>
      <Text style={styles.vendorName} numberOfLines={1}>
        Vendor: {booking.vendorName}
        {isParentOrder && booking.vendorOrderCount
          ? ` +${booking.vendorOrderCount - 1} more`
          : ""}
      </Text>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.date}>{booking.eventDate}</Text>
          <Text style={styles.amount}>{booking.amountLabel}</Text>
        </View>

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

      <View style={styles.viewDetailsRow}>
        <Text style={styles.viewDetailsText}>View Details</Text>
        <Ionicons name="chevron-forward" size={14} color={AdminColors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  entityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  entityBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  bookingCode: {
    fontSize: 12,
    color: AdminColors.textMuted,
    fontWeight: "500",
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: AdminColors.text,
  },
  vendorName: {
    fontSize: 13,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
  },
  date: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    color: AdminColors.text,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  viewDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "600",
    color: AdminColors.primary,
  },
});