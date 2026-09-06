// components/admin/AdminDisputeCard.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminColors, statusColor } from "../../constants/AdminColors";
import { DisputeListItem } from "../../types/admin.types";

interface AdminDisputeCardProps {
  dispute: DisputeListItem;
  onPress: () => void;
}

export default function AdminDisputeCard({ dispute, onPress }: AdminDisputeCardProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="warning-outline" size={16} color={AdminColors.dispute} />
          <Text style={styles.bookingCode}>Booking #{dispute.bookingCode}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor(dispute.status) + "1A" },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColor(dispute.status) }]}>
            {dispute.status}
          </Text>
        </View>
      </View>

      <Text style={styles.parties}>
        {dispute.organizerName} vs {dispute.vendorName}
      </Text>

      <Text style={styles.issueLabel}>Issue:</Text>
      <Text style={styles.issueText} numberOfLines={2}>
        {dispute.issueSummary}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.raisedBy}>Raised by: {dispute.raisedBy === "ORGANIZER" ? "Organizer" : "Vendor"}</Text>
        <View style={styles.reviewRow}>
          <Text style={styles.reviewText}>Review Dispute</Text>
          <Ionicons name="chevron-forward" size={14} color={AdminColors.primary} />
        </View>
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
    borderLeftWidth: 3,
    borderLeftColor: AdminColors.dispute,
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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  parties: {
    fontSize: 14,
    fontWeight: "700",
    color: AdminColors.text,
    marginBottom: 8,
  },
  issueLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: AdminColors.textMuted,
  },
  issueText: {
    fontSize: 13,
    color: AdminColors.text,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  raisedBy: {
    fontSize: 11,
    color: AdminColors.textMuted,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewText: {
    fontSize: 12,
    fontWeight: "600",
    color: AdminColors.primary,
  },
});