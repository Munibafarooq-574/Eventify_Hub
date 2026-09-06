// app/admin/disputes.tsx
//
// Phase 22.6 — Disputes

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
import { useRouter } from "expo-router";
import AdminHeader from "../../components/admin/AdminHeader";
import AdminFilterChips from "../../components/admin/AdminFilterChips";
import AdminDisputeCard from "../../components/admin/AdminDisputeCard";
import EmptyState from "../../components/admin/EmptyState";
import { AdminColors } from "../../constants/AdminColors";
import { adminGetDisputes } from "../../services/admin/adminGetDisputes";
import { DisputeFilterKey, DisputeListItem } from "../../types/admin.types";

const FILTERS: { key: DisputeFilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "REVIEWING", label: "Reviewing" },
  { key: "RESOLVED", label: "Resolved" },
];

export default function DisputesScreen() {
  const router = useRouter();

  const [filter, setFilter] = useState<DisputeFilterKey>("ALL");
  const [disputes, setDisputes] = useState<DisputeListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDisputes = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      try {
        setError(null);
        const response = await adminGetDisputes({
          filter,
          cursor: opts.reset ? null : cursor,
        });
        setDisputes((prev) => (opts.reset ? response.items : [...prev, ...response.items]));
        setCursor(response.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load disputes.");
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
    fetchDisputes({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDisputes({ reset: true });
  };

  const handleLoadMore = () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    fetchDisputes();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AdminHeader title="Disputes" />

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
          <Pressable style={styles.retryButton} onPress={() => fetchDisputes({ reset: true })}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={disputes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <AdminDisputeCard
              dispute={item}
              onPress={() =>
                router.push({
                  pathname: "/admin/dispute-details",
                  params: { id: item.id },
                } as any)
              }
            />
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
              icon="shield-checkmark-outline"
              title="No disputes"
              message="Disputes raised by organizers or vendors will show up here."
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
});