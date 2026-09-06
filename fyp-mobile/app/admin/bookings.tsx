// app/admin/bookings.tsx
//
// Phase 22.3 — Booking Management
//
// Lists both parent Orders and individual VendorOrders (see
// BookingListItem.entityType in types/admin.ts) with search + status
// filtering, pull-to-refresh, and cursor-based "load more".

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AdminHeader from "../../components/admin/AdminHeader";
import AdminFilterChips from "../../components/admin/AdminFilterChips";
import AdminBookingCard from "../../components/admin/AdminBookingCard";
import EmptyState from "../../components/admin/EmptyState";
import { AdminColors } from "../../constants/AdminColors";
import { adminGetBookings } from "../../services/admin/getAdminBookings";
import { BookingFilterKey, BookingListItem } from "../../types/admin.types";

const FILTERS: { key: BookingFilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

export default function BookingsScreen() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<BookingFilterKey>("ALL");
  const [bookings, setBookings] = useState<BookingListItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = useCallback(
    async (opts: { reset?: boolean } = {}) => {
      try {
        setError(null);
        const response = await adminGetBookings({
          filter,
          search,
          cursor: opts.reset ? null : cursor,
        });
        setBookings((prev) => (opts.reset ? response.items : [...prev, ...response.items]));
        setCursor(response.nextCursor ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load bookings.");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter, search, cursor]
  );

  // Reload from scratch whenever the filter or search term changes
  useEffect(() => {
    setLoading(true);
    fetchBookings({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings({ reset: true });
  };

  const handleLoadMore = () => {
    if (!cursor || loadingMore || loading) return;
    setLoadingMore(true);
    fetchBookings();
  };

  const openDetails = (booking: BookingListItem) => {
    router.push({
      pathname: "/admin/booking-details",
      params: { id: booking.id, type: booking.entityType },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <AdminHeader title="Bookings" />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={AdminColors.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search booking..."
          placeholderTextColor={AdminColors.textMuted}
          style={styles.searchInput}
        />
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
          <Pressable style={styles.retryButton} onPress={() => fetchBookings({ reset: true })}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => `${item.entityType}-${item.id}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <AdminBookingCard booking={item} onPress={() => openDetails(item)} />
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
              icon="calendar-outline"
              title="No bookings found"
              message={
                search
                  ? `No results for "${search}".`
                  : "Bookings will show up here once organizers start booking vendors."
              }
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: AdminColors.card,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: AdminColors.text,
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
});