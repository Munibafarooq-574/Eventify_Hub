// components/admin/TopRevenueVendors.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AdminColors } from "../../constants/AdminColors";
import { TopRevenueVendor } from "../../types/admin.types";

interface TopRevenueVendorsProps {
  vendors: TopRevenueVendor[];
}

export default function TopRevenueVendors({ vendors }: TopRevenueVendorsProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Top Revenue Vendors</Text>

      {vendors.length === 0 ? (
        <Text style={styles.mutedText}>No vendor revenue data yet.</Text>
      ) : (
        vendors.map((vendor, index) => (
          <View key={vendor.name} style={styles.row}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {vendor.name}
            </Text>
            <Text style={styles.revenue}>{vendor.revenueLabel}</Text>
          </View>
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
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: AdminColors.text,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: AdminColors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  rankText: {
    fontSize: 11,
    fontWeight: "700",
    color: AdminColors.primary,
  },
  name: {
    flex: 1,
    fontSize: 14,
    color: AdminColors.text,
  },
  revenue: {
    fontSize: 14,
    fontWeight: "700",
    color: AdminColors.text,
  },
  mutedText: {
    color: AdminColors.textMuted,
    fontSize: 13,
  },
});