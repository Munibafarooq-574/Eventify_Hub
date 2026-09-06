// app/admin/commission.tsx
//
// Phase 22.7 — Commission Management

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AdminHeader from "../../components/admin/AdminHeader";
import TopRevenueVendors from "../../components/admin/TopRevenueVendors";
import { AdminColors } from "../../constants/AdminColors";
import { adminGetCommission } from "../../services/admin/adminGetCommission";
import { CommissionResponse } from "../../types/admin.types";

export default function CommissionScreen() {
  const [data, setData] = useState<CommissionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const response = await adminGetCommission();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load commission data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const isUp = data?.trendDirection === "up";
  const isDown = data?.trendDirection === "down";
  const trendColor = isUp ? AdminColors.success : isDown ? AdminColors.danger : AdminColors.textMuted;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AdminHeader title="Commission" />

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={AdminColors.primary} />
        </View>
      ) : error || !data ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error ?? "No commission data available."}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
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
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Total Commission</Text>
            <Text style={styles.heroValue}>{data.totalCommissionLabel}</Text>

            {data.trendDirection !== "flat" && (
              <View style={styles.trendRow}>
                <Ionicons
                  name={isUp ? "arrow-up" : "arrow-down"}
                  size={13}
                  color={trendColor}
                />
                <Text style={[styles.trendText, { color: trendColor }]}>
                  {data.trendValue} this month
                </Text>
              </View>
            )}
          </View>

          <View style={styles.breakdownCard}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Booking Revenue</Text>
              <Text style={styles.breakdownValue}>{data.bookingRevenueLabel}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Commission</Text>
              <Text style={styles.breakdownValue}>{data.commissionLabel}</Text>
            </View>
            <View style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.breakdownLabel}>Commission Rate</Text>
              <View style={styles.rateBadge}>
                <Text style={styles.rateBadgeText}>{data.commissionRatePercent}%</Text>
              </View>
            </View>
          </View>

          <TopRevenueVendors vendors={data.topVendors} />
        </ScrollView>
      )}
    </SafeAreaView>
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
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  errorTitle: { fontSize: 16, fontWeight: "700", color: AdminColors.text },
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
  retryButtonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  heroCard: {
    backgroundColor: AdminColors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  heroLabel: {
    fontSize: 13,
    color: AdminColors.textMuted,
  },
  heroValue: {
    fontSize: 30,
    fontWeight: "700",
    color: AdminColors.text,
    marginTop: 4,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  trendText: {
    fontSize: 13,
    fontWeight: "600",
  },
  breakdownCard: {
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
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  breakdownLabel: {
    fontSize: 14,
    color: AdminColors.textMuted,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: "700",
    color: AdminColors.text,
  },
  rateBadge: {
    backgroundColor: AdminColors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rateBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: AdminColors.primary,
  },
});