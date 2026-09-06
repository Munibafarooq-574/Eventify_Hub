// components/admin/AdminStatCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminColors } from "../../constants/AdminColors";
import { AdminStat } from "../../types/admin.types";

interface AdminStatCardProps {
  stat: AdminStat;
}

export default function AdminStatCard({ stat }: AdminStatCardProps) {
  const isUp = stat.trendDirection === "up";
  const isDown = stat.trendDirection === "down";
  const trendColor = isUp ? AdminColors.success : isDown ? AdminColors.danger : AdminColors.textMuted;

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: (stat.accentColor ?? AdminColors.primary) + "1A" },
        ]}
      >
        <Ionicons
          name={stat.icon as any}
          size={18}
          color={stat.accentColor ?? AdminColors.primary}
        />
      </View>

      <Text style={styles.value} numberOfLines={1}>
        {stat.value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {stat.label}
      </Text>

      {stat.trendDirection !== "flat" && (
        <View style={styles.trendRow}>
          <Ionicons
            name={isUp ? "arrow-up" : "arrow-down"}
            size={12}
            color={trendColor}
          />
          <Text style={[styles.trendText, { color: trendColor }]}>
            {stat.trendValue}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: AdminColors.text,
  },
  label: {
    fontSize: 13,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  trendText: {
    fontSize: 12,
    fontWeight: "600",
  },
});