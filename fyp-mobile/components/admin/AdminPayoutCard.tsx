// components/admin/AdminPayoutCard.tsx
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { AdminColors, statusColor } from "../../constants/AdminColors";
import { PayoutListItem } from "../../types/admin.types";

interface AdminPayoutCardProps {
  payout: PayoutListItem;
  onPress: () => void;
}

export default function AdminPayoutCard({ payout, onPress }: AdminPayoutCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.vendorName}>{payout.vendorName}</Text>
          <Text style={styles.category}>{payout.category}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor(payout.status) + "1A" },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColor(payout.status) }]}>
            {payout.status}
          </Text>
        </View>
      </View>

      <View style={styles.breakdown}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Earned</Text>
          <Text style={styles.breakdownValue}>{payout.earnedLabel}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Commission</Text>
          <Text style={styles.breakdownValue}>{payout.commissionLabel}</Text>
        </View>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabelBold}>Payout</Text>
          <Text style={styles.breakdownValueBold}>{payout.payoutLabel}</Text>
        </View>
      </View>

      <Pressable style={styles.viewButton} onPress={onPress}>
        <Text style={styles.viewButtonText}>View</Text>
      </Pressable>
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
    alignItems: "flex-start",
    marginBottom: 10,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: "700",
    color: AdminColors.text,
  },
  category: {
    fontSize: 12,
    color: AdminColors.textMuted,
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
  breakdown: {
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
    paddingTop: 10,
    gap: 6,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    fontSize: 13,
    color: AdminColors.textMuted,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: "600",
    color: AdminColors.text,
  },
  breakdownLabelBold: {
    fontSize: 13,
    fontWeight: "700",
    color: AdminColors.text,
  },
  breakdownValueBold: {
    fontSize: 14,
    fontWeight: "700",
    color: AdminColors.primary,
  },
  viewButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: AdminColors.text,
  },
});