// components/admin/AdminRefundCard.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { AdminColors, statusColor } from "../../constants/AdminColors";
import { RefundListItem } from "../../types/admin.types";

interface AdminRefundCardProps {
  refund: RefundListItem;
  onReview: () => void;
}

export default function AdminRefundCard({ refund, onReview }: AdminRefundCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.bookingCode}>Booking #{refund.bookingCode}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor(refund.status) + "1A" },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColor(refund.status) }]}>
            {refund.status}
          </Text>
        </View>
      </View>

      <Text style={styles.label}>Refund Amount</Text>
      <Text style={styles.amount}>{refund.amountLabel}</Text>

      <Text style={[styles.label, { marginTop: 10 }]}>Reason</Text>
      <Text style={styles.reason}>{refund.reason}</Text>

      <Text style={styles.requestedAt}>Requested {refund.requestedAt}</Text>

      {refund.status !== "PAID" && refund.status !== "REJECTED" && (
        <Pressable style={styles.reviewButton} onPress={onReview}>
          <Text style={styles.reviewButtonText}>Review</Text>
        </Pressable>
      )}
    </View>
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
    marginBottom: 10,
  },
  bookingCode: {
    fontSize: 13,
    fontWeight: "600",
    color: AdminColors.text,
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
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    color: AdminColors.textMuted,
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: AdminColors.text,
    marginTop: 2,
  },
  reason: {
    fontSize: 13,
    color: AdminColors.text,
    marginTop: 2,
  },
  requestedAt: {
    fontSize: 11,
    color: AdminColors.textMuted,
    marginTop: 10,
  },
  reviewButton: {
    marginTop: 12,
    backgroundColor: AdminColors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  reviewButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});