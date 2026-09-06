// components/admin/PopularServices.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AdminColors } from "../../constants/AdminColors";
import { PopularServiceItem } from "../../types/admin.types";

interface PopularServicesProps {
  services: PopularServiceItem[];
}

export default function PopularServices({ services }: PopularServicesProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Popular Services</Text>

      {services.length === 0 ? (
        <Text style={styles.mutedText}>No bookings yet this period.</Text>
      ) : (
        services.map((service) => (
          <View key={service.name} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text style={styles.icon}>{service.icon}</Text>
              <Text style={styles.name}>{service.name}</Text>
              <Text style={styles.percentage}>{service.percentage}%</Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(service.percentage, 100)}%` },
                ]}
              />
            </View>
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
    marginBottom: 12,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
  },
  name: {
    flex: 1,
    fontSize: 13,
    color: AdminColors.text,
  },
  percentage: {
    fontSize: 13,
    fontWeight: "600",
    color: AdminColors.textMuted,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: AdminColors.background,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: AdminColors.primary,
  },
  mutedText: {
    color: AdminColors.textMuted,
    fontSize: 13,
  },
});