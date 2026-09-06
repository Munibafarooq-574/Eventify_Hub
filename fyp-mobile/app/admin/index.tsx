// app/admin/index.tsx
//
// Phase 22.2 — Admin Dashboard screen
//
// Handles data fetching, pull-to-refresh, loading skeleton and error
// state. The actual layout/markup lives in components/admin/AdminDashboard.

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Text,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminHeader from "../../components/admin/AdminHeader";
import AdminDashboard from "../../components/admin/AdminDashboard";
import { AdminColors } from "../../constants/AdminColors";
import { adminGetDashboard } from "../../services/admin/adminGetDashboard";
import { adminGetRevenueAnalytics, RevenueRange } from "../../services/admin/adminGetRevenueAnalytics";
import { AdminDashboardResponse } from "../../types/admin.types";

export default function AdminDashboardScreen() {
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      setError(null);
      const response = await adminGetDashboard();
      setData(response);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't load the dashboard. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleRangeChange = async (range: RevenueRange) => {
    if (!data) return;
    setChartLoading(true);
    try {
      const revenue = await adminGetRevenueAnalytics(range);
      setData({ ...data, revenue });
    } catch {
      // Keep showing the previous chart data on failure; a toast/snackbar
      // hook would go here if your app has one.
    } finally {
      setChartLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AdminHeader title="Eventify Hub" />

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={loadDashboard}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : data ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={AdminColors.primary}
            />
          }
        >
          <AdminDashboard data={data} onRangeChange={handleRangeChange} chartLoading={chartLoading} />
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

// Simple skeleton placeholder — swap for a shimmer/animated version if
// your app already has a skeleton-loading primitive elsewhere.
function DashboardSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      <View style={[styles.skeletonBlock, { width: "60%", height: 24 }]} />
      <View style={[styles.skeletonBlock, { width: "40%", height: 14, marginTop: 8 }]} />
      <View style={styles.skeletonGrid}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={[styles.skeletonBlock, styles.skeletonCard]} />
        ))}
      </View>
      <View style={[styles.skeletonBlock, { height: 180, marginTop: 8 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: AdminColors.text,
  },
  errorMessage: {
    fontSize: 13,
    color: AdminColors.textMuted,
    textAlign: "center",
    marginTop: 6,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: AdminColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  skeletonContainer: {
    padding: 16,
  },
  skeletonBlock: {
    backgroundColor: AdminColors.border,
    borderRadius: 10,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 20,
  },
  skeletonCard: {
    flexBasis: "48%",
    height: 90,
    marginBottom: 12,
  },
});