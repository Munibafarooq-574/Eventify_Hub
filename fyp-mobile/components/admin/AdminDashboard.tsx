// components/admin/AdminDashboard.tsx
//
// Pure presentation component for the dashboard body. All data fetching
// and state (loading/error/refresh) lives in app/admin/index.tsx so this
// component stays easy to reuse/test.

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AdminColors } from "../../constants/AdminColors";
import { AdminDashboardResponse } from "../../types/admin.types";
import AdminStatCard from "./AdminStatCard";
import AdminQuickAction from "./AdminQuickAction";
import RevenueChart from "./RevenueChart";
import PopularServices from "./PopularServices";
import RecentBookings from "./RecentBookings";

interface AdminDashboardProps {
  data: AdminDashboardResponse;
  onRangeChange: (range: "7d" | "30d" | "12m") => void;
  chartLoading?: boolean;
}

export default function AdminDashboard({
  data,
  onRangeChange,
  chartLoading,
}: AdminDashboardProps) {
  return (
    <View>
      <Text style={styles.greeting}>Good Morning, {data.greetingName} 👋</Text>
      <Text style={styles.subGreeting}>Here's what's happening today</Text>

      <View style={styles.statsGrid}>
        {data.stats.map((stat) => (
          <AdminStatCard key={stat.key} stat={stat} />
        ))}
      </View>

      <RevenueChart data={data.revenue} onRangeChange={onRangeChange} loading={chartLoading} />

      <PopularServices services={data.popularServices} />

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <AdminQuickAction />

      <RecentBookings bookings={data.recentBookings} />
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: AdminColors.text,
    marginTop: 4,
  },
  subGreeting: {
    fontSize: 13,
    color: AdminColors.textMuted,
    marginTop: 2,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: AdminColors.text,
    marginBottom: 12,
  },
});