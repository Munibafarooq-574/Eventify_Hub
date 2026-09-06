// app/admin/booking-details.tsx
//
// Phase 22.3 — Booking Details
//
// Reads `id` and `type` (BookingEntityType) from the route params so the
// service knows whether to fetch an Order or a VendorOrder.

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AdminColors, statusColor } from "../../constants/AdminColors";
import AdminBookingTimeline from "../../components/admin/AdminBookingTimeline";
import { adminGetBookingDetails } from "../../services/admin/adminGetBookingDetails";
import { BookingDetails, BookingEntityType } from "../../types/admin.types";

export default function BookingDetailsScreen() {
  const router = useRouter();
  const { id, type } = useLocalSearchParams<{ id: string; type: BookingEntityType }>();

  const [details, setDetails] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await adminGetBookingDetails(id, (type as BookingEntityType) ?? "VENDOR_ORDER");
      setDetails(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this booking.");
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={AdminColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={AdminColors.primary} />
        </View>
      ) : error || !details ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error ?? "Booking not found."}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.serviceName}>{details.serviceName}</Text>
              <Text style={styles.bookingCode}>Booking #{details.bookingCode}</Text>
            </View>
            <View
              style={[
                styles.entityBadge,
                {
                  backgroundColor:
                    details.entityType === "ORDER"
                      ? AdminColors.primaryMuted
                      : AdminColors.background,
                },
              ]}
            >
              <Text
                style={[
                  styles.entityBadgeText,
                  {
                    color:
                      details.entityType === "ORDER"
                        ? AdminColors.primary
                        : AdminColors.textMuted,
                  },
                ]}
              >
                {details.entityType === "ORDER" ? "ORDER" : "VENDOR ORDER"}
              </Text>
            </View>
          </View>

          <Section title="ORGANIZER">
            <Row icon="person-outline" text={details.organizer.name} />
            <Row icon="mail-outline" text={details.organizer.email} />
            {details.organizer.phone && (
              <Row icon="call-outline" text={details.organizer.phone} />
            )}
          </Section>

          <Section title="VENDOR">
            <Row icon="storefront-outline" text={details.vendor.name} />
            <Row icon="pricetag-outline" text={details.vendor.category} />
          </Section>

          <Section title="EVENT">
            <Row icon="calendar-outline" text={details.event.date} />
            <Row
              icon="time-outline"
              text={`${details.event.startTime} – ${details.event.endTime}`}
            />
          </Section>

          <Section title="PAYMENT">
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Total</Text>
              <Text style={styles.paymentValue}>{details.payment.totalLabel}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Down Payment</Text>
              <Text style={styles.paymentValue}>{details.payment.downPaymentLabel}</Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Remaining</Text>
              <Text style={styles.paymentValue}>{details.payment.remainingLabel}</Text>
            </View>
            <View style={styles.paidChip}>
              <Ionicons
                name={details.payment.downPaymentPaid ? "checkmark-circle" : "time-outline"}
                size={14}
                color={details.payment.downPaymentPaid ? AdminColors.success : AdminColors.pending}
              />
              <Text
                style={[
                  styles.paidChipText,
                  {
                    color: details.payment.downPaymentPaid
                      ? AdminColors.success
                      : AdminColors.pending,
                  },
                ]}
              >
                {details.payment.downPaymentPaid ? "Down Payment Paid" : "Down Payment Pending"}
              </Text>
            </View>
          </Section>

          <Section title="STATUS">
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor(details.status) + "1A" },
              ]}
            >
              <Text style={[styles.statusBadgeText, { color: statusColor(details.status) }]}>
                {details.status}
              </Text>
            </View>
          </Section>

          <Section title="BOOKING TIMELINE">
            <AdminBookingTimeline steps={details.timeline} />
          </Section>

          {details.entityType === "ORDER" && details.relatedVendorOrders && details.relatedVendorOrders.length > 0 && (
            <Section title="VENDOR ORDERS IN THIS ORDER">
              {details.relatedVendorOrders.map((vo) => (
                <Pressable
                  key={vo.id}
                  style={styles.vendorOrderRow}
                  onPress={() =>
                    router.push({
                      pathname: "/admin/booking-details",
                      params: { id: vo.id, type: "VENDOR_ORDER" },
                    } as any)
                  }
                >
                  <View>
                    <Text style={styles.vendorOrderService}>{vo.serviceName}</Text>
                    <Text style={styles.vendorOrderVendor}>{vo.vendorName}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusColor(vo.status) + "1A" },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusColor(vo.status) }]}>
                      {vo.status}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Section>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={AdminColors.textMuted} />
      <Text style={styles.infoRowText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AdminColors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: AdminColors.card,
    borderBottomWidth: 1,
    borderBottomColor: AdminColors.border,
  },
  backButton: { width: 22 },
  headerTitle: { fontSize: 16, fontWeight: "600", color: AdminColors.text },
  scrollContent: { padding: 16, paddingBottom: 32 },
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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  serviceName: { fontSize: 19, fontWeight: "700", color: AdminColors.text },
  bookingCode: { fontSize: 13, color: AdminColors.textMuted, marginTop: 2 },
  entityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  entityBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  section: {
    backgroundColor: AdminColors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: AdminColors.textMuted,
    marginBottom: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  infoRowText: { fontSize: 14, color: AdminColors.text },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  paymentLabel: { fontSize: 13, color: AdminColors.textMuted },
  paymentValue: { fontSize: 13, fontWeight: "600", color: AdminColors.text },
  paidChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  paidChipText: { fontSize: 12, fontWeight: "600" },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  vendorOrderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  vendorOrderService: { fontSize: 14, fontWeight: "600", color: AdminColors.text },
  vendorOrderVendor: { fontSize: 12, color: AdminColors.textMuted, marginTop: 2 },
});