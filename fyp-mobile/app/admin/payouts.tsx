// app/admin/payouts.tsx
//
// Phase 22.5 — Payouts
//
// "View" opens an action sheet to advance a payout's status
// (Processing -> Paid). Swap for a dedicated payout-details screen later
// if you need more than the breakdown already shown on the card.

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminHeader from "../../components/admin/AdminHeader";
import AdminFilterChips from "../../components/admin/AdminFilterChips";
import AdminPayoutCard from "../../components/admin/AdminPayoutCard";
import AdminActionSheet, { ActionSheetOption } from "../../components/admin/AdminActionSheet";
import EmptyState from "../../components/admin/EmptyState";
import { AdminColors } from "../../constants/AdminColors";
import { adminGetPayouts } from "../../services/admin/adminGetPayouts";
import { adminUpdatePayoutStatus } from "../../services/admin/adminUpdatePayoutStatus";
import { PayoutAction, PayoutFilterKey, PayoutListItem } from "../../types/admin.types";

const FILTERS: { key: PayoutFilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "PROCESSING", label: "Processing" },
  { key: "PAID", label: "Paid" },
];

const STATUS_OPTIONS: ActionSheetOption[] = [
  { key: "MARK_PROCESSING", label: "Mark Processing", icon: "sync-outline" },
  { key: "MARK_PAID", label: "Mark Paid", icon: "cash-outline" },
];

export default function PayoutsScreen() {
  const [filter, setFilter] = useState<PayoutFilterKey>("ALL");
  const [payouts, setPayouts] = useState<PayoutListItem[]>([]);
  const [totalPendingLabel, setTotalPendingLabel] = useState("Rs 0");
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePayout, setActivePayout] = useState<PayoutListItem | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchPayouts = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      try {
        setError(null);
        const response = await adminGetPayouts({
          filter,
          cursor: opts.reset ? null : cursor,
        });
        setPayouts((prev) => (opts.reset ? response.items : [...prev, ...response.items]));
        setTotalPendingLabel(response.totalPendingLabel);
        setCursor(response.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load payouts.");
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
    fetchPayouts({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPayouts({ reset: true });
  };

  const handleLoadMore = () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    fetchPayouts();
  };

  const handleSelectAction = async (key: string) => {
    if (!activePayout) return;
    const action = key as PayoutAction;
    const payoutId = activePayout.id;
    setActivePayout(null);
    setUpdating(true);
    try {
      const updated = await adminUpdatePayoutStatus(payoutId, action);
      setPayouts((prev) => prev.map((p) => (p.id === payoutId ? updated : p)));
    } catch (err) {
      Alert.alert(
        "Couldn't update payout",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AdminHeader title="Vendor Payouts" />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryValue}>{totalPendingLabel}</Text>
        <Text style={styles.summaryLabel}>Total Pending</Text>
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
          <Pressable style={styles.retryButton} onPress={() => fetchPayouts({ reset: true })}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <AdminPayoutCard payout={item} onPress={() => setActivePayout(item)} />
          )}
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
              icon="cash-outline"
              title="No payouts found"
              message="Vendor payouts will appear here once bookings are completed."
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={AdminColors.primary} />
            ) : null
          }
        />
      )}

      <AdminActionSheet
        visible={!!activePayout}
        title={activePayout ? activePayout.vendorName : ""}
        subtitle={activePayout ? `Payout: ${activePayout.payoutLabel}` : undefined}
        options={STATUS_OPTIONS}
        onSelect={handleSelectAction}
        onClose={() => setActivePayout(null)}
      />

      {updating && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator color={AdminColors.primary} />
        </View>
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
  updatingOverlay: {
  ...StyleSheet.absoluteFill,
  backgroundColor: "rgba(255,255,255,0.5)",
  alignItems: "center",
  justifyContent: "center",
},
});