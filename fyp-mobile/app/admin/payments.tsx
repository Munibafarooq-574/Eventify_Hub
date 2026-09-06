// app/admin/payments.tsx
//
// Phase 22.4 — Payments
//
// Shows total collected + a filterable, paginated list of individual
// payments (down payments, remaining payments, full payments).

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminHeader from "../../components/admin/AdminHeader";
import AdminFilterChips from "../../components/admin/AdminFilterChips";
import AdminPaymentCard from "../../components/admin/AdminPaymentCard";
import EmptyState from "../../components/admin/EmptyState";
import { AdminColors } from "../../constants/AdminColors";
import { adminGetPayments } from "../../services/admin/adminGetPayments";
import { PaymentFilterKey, PaymentListItem } from "../../types/admin.types";

const FILTERS: { key: PaymentFilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PAID", label: "Paid" },
  { key: "PENDING", label: "Pending" },
  { key: "FAILED", label: "Failed" },
];

export default function PaymentsScreen() {
  const [filter, setFilter] = useState<PaymentFilterKey>("ALL");
  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [totalCollectedLabel, setTotalCollectedLabel] = useState("Rs 0");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      try {
        setError(null);
        const response = await adminGetPayments({
          filter,
          cursor: opts.reset ? null : cursor,
        });
        setPayments((prev) => (opts.reset ? response.items : [...prev, ...response.items]));
        setTotalCollectedLabel(response.totalCollectedLabel);
        setCursor(response.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load payments.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter, cursor]
  );

  useEffect(() => {
    setLoading(true);
    fetchPayments({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPayments({ reset: true });
  };

  const handleLoadMore = () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    fetchPayments();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AdminHeader title="Payments" />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{totalCollectedLabel}</Text>
        <Text style={styles.summaryLabel}>Total Collected</Text>
      </View>

      <View style={styles.filterWrap}>
        <AdminFilterChips options={FILTERS} active={filter} onChange={setFilter} />
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={AdminColors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchPayments({ reset: true })}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => <AdminPaymentCard payment={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={AdminColors.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={handleLoadMore}
          ListEmptyComponent={
            <EmptyState
              icon="card-outline"
              title="No payments found"
              message="Payments will appear here as bookings are paid for."
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={AdminColors.primary} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  summaryCard: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: AdminColors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryValue: {
    fontSize: 26,
    fontWeight: "700",
    color: AdminColors.text,
  },
  summaryLabel: {
    fontSize: 13,
    color: AdminColors.textMuted,
    marginTop: 2,
  },
  filterWrap: {
    marginBottom: 4,
    paddingLeft: 16,
  },
  listContent: {
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
});