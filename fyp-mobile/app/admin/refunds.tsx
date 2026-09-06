// app/admin/refunds.tsx
//
// Phase 22.5 — Refunds
//
// Reviewing a refund opens an action sheet with the four backend-aligned
// actions (Approve / Reject / Mark Processing / Mark Paid). The list item
// is patched in place with the server's response so there's no full
// refetch after every action.

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
import AdminRefundCard from "../../components/admin/AdminRefundCard";
import AdminActionSheet, { ActionSheetOption } from "../../components/admin/AdminActionSheet";
import EmptyState from "../../components/admin/EmptyState";
import { AdminColors } from "../../constants/AdminColors";
import { adminGetRefunds } from "../../services/admin/adminGetRefunds";
import { adminUpdateRefundStatus } from "../../services/admin/adminUpdateRefundStatus";
import { RefundAction, RefundFilterKey, RefundListItem } from "../../types/admin.types";

const FILTERS: { key: RefundFilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "PROCESSING", label: "Processing" },
  { key: "PAID", label: "Paid" },
  { key: "REJECTED", label: "Rejected" },
];

const REVIEW_OPTIONS: ActionSheetOption[] = [
  { key: "APPROVE", label: "Approve Refund", icon: "checkmark-circle-outline" },
  { key: "MARK_PROCESSING", label: "Mark Processing", icon: "sync-outline" },
  { key: "MARK_PAID", label: "Mark Paid", icon: "cash-outline" },
  { key: "REJECT", label: "Reject Refund", icon: "close-circle-outline", destructive: true },
];

export default function RefundsScreen() {
  const [filter, setFilter] = useState<RefundFilterKey>("ALL");
  const [refunds, setRefunds] = useState<RefundListItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeRefund, setActiveRefund] = useState<RefundListItem | null>(null);
  const [updating, setUpdating] = useState(false);

  const fetchRefunds = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      try {
        setError(null);
        const response = await adminGetRefunds({
          filter,
          cursor: opts.reset ? null : cursor,
        });
        setRefunds((prev) => (opts.reset ? response.items : [...prev, ...response.items]));
        setPendingCount(response.pendingCount);
        setCursor(response.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load refunds.");
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
    fetchRefunds({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRefunds({ reset: true });
  };

  const handleLoadMore = () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    fetchRefunds();
  };

  const handleSelectAction = async (key: string) => {
    if (!activeRefund) return;
    const actionMap: Record<string, RefundAction> = {
      APPROVE: "APPROVE",
      REJECT: "REJECT",
      MARK_PROCESSING: "MARK_PROCESSING",
      MARK_PAID: "MARK_PAID",
    };
    const action = actionMap[key];
    const refundId = activeRefund.id;
    setActiveRefund(null);
    setUpdating(true);
    try {
      const updated = await adminUpdateRefundStatus(refundId, action);
      setRefunds((prev) => prev.map((r) => (r.id === refundId ? updated : r)));
    } catch (err) {
      Alert.alert(
        "Couldn't update refund",
        err instanceof Error ? err.message : "Please try again."
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AdminHeader title="Refunds" />

      {pendingCount > 0 && (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingDot} />
          <Text style={styles.pendingText}>{pendingCount} Pending</Text>
        </View>
      )}

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
          <Pressable style={styles.retryButton} onPress={() => fetchRefunds({ reset: true })}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={refunds}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <AdminRefundCard refund={item} onReview={() => setActiveRefund(item)} />
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
              icon="return-down-back-outline"
              title="No refund requests"
              message="Refund requests from organizers will show up here."
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
        visible={!!activeRefund}
        title={activeRefund ? `Booking #${activeRefund.bookingCode}` : ""}
        subtitle={activeRefund ? `Refund amount: ${activeRefund.amountLabel}` : undefined}
        options={REVIEW_OPTIONS}
        onSelect={handleSelectAction}
        onClose={() => setActiveRefund(null)}
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
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginTop: 12,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: AdminColors.danger,
  },
  pendingText: {
    fontSize: 13,
    fontWeight: "600",
    color: AdminColors.danger,
  },
  filterWrap: {
    marginTop: 12,
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