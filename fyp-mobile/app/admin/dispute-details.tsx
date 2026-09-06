// app/admin/dispute-details.tsx
//
// Phase 22.6 — Dispute Details
//
// Admin reads both statements side by side and submits a resolution
// (favor organizer / favor vendor / partial). Submission is disabled
// once a dispute is already RESOLVED.

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AdminColors, statusColor } from "../../constants/AdminColors";
import { adminGetDisputeDetails } from "../../services/admin/adminGetDisputeDetails";
import { adminSubmitDisputeResolution } from "../../services/admin/adminSubmitDisputeResolution";
import { DisputeDetails, DisputeResolution } from "../../types/admin.types";

const RESOLUTION_OPTIONS: { key: DisputeResolution; label: string }[] = [
  { key: "ORGANIZER", label: "Resolve for Organizer" },
  { key: "VENDOR", label: "Resolve for Vendor" },
  { key: "PARTIAL", label: "Partial Resolution" },
];

export default function DisputeDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [details, setDetails] = useState<DisputeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedResolution, setSelectedResolution] = useState<DisputeResolution | null>(null);
  const [partialAmount, setPartialAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const response = await adminGetDisputeDetails(id);
      setDetails(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load this dispute.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = () => {
    if (!details || !selectedResolution) return;

    if (selectedResolution === "PARTIAL" && !partialAmount.trim()) {
      Alert.alert("Add an amount", "Enter the partial refund amount before submitting.");
      return;
    }

    Alert.alert(
      "Submit resolution?",
      `This will resolve the dispute in favor of ${
        selectedResolution === "ORGANIZER"
          ? "the organizer"
          : selectedResolution === "VENDOR"
          ? "the vendor"
          : "a partial split"
      }. This action can't be easily undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          style: "default",
          onPress: async () => {
            setSubmitting(true);
            try {
              const updated = await adminSubmitDisputeResolution(details.id, {
                resolution: selectedResolution,
                note: note.trim() || undefined,
                partialAmountLabel:
                  selectedResolution === "PARTIAL" ? partialAmount.trim() : undefined,
              });
              setDetails(updated);
            } catch (err) {
              Alert.alert(
                "Couldn't submit resolution",
                err instanceof Error ? err.message : "Please try again."
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color={AdminColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Dispute</Text>
        <View style={{ width: 22 }} />
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={AdminColors.primary} />
        </View>
      ) : error || !details ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error ?? "Dispute not found."}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.bookingCode}>Booking #{details.bookingCode}</Text>

          <View style={styles.vsRow}>
            <View style={styles.vsSide}>
              <Text style={styles.vsLabel}>Organizer</Text>
              <Text style={styles.vsName}>{details.organizerName}</Text>
            </View>
            <Text style={styles.vsText}>VS</Text>
            <View style={styles.vsSide}>
              <Text style={styles.vsLabel}>Vendor</Text>
              <Text style={styles.vsName}>{details.vendorName}</Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor(details.status) + "1A", alignSelf: "center" },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusColor(details.status) }]}>
              {details.status}
            </Text>
          </View>

          <Section title="Issue">
            <Text style={styles.bodyText}>{details.issue}</Text>
          </Section>

          <Section title="Organizer Statement">
            <Text style={styles.bodyText}>{details.organizerStatement}</Text>
          </Section>

          <Section title="Vendor Statement">
            <Text style={styles.bodyText}>{details.vendorStatement}</Text>
          </Section>

          <Section title="Admin Resolution">
            {details.status === "RESOLVED" ? (
              <Text style={styles.resolvedText}>
                This dispute has already been resolved.
              </Text>
            ) : (
              <>
                {RESOLUTION_OPTIONS.map((option) => {
                  const selected = selectedResolution === option.key;
                  return (
                    <Pressable
                      key={option.key}
                      style={styles.radioRow}
                      onPress={() => setSelectedResolution(option.key)}
                    >
                      <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
                        {selected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={styles.radioLabel}>{option.label}</Text>
                    </Pressable>
                  );
                })}

                {selectedResolution === "PARTIAL" && (
                  <TextInput
                    value={partialAmount}
                    onChangeText={setPartialAmount}
                    placeholder="Partial amount, e.g. Rs 10,000"
                    placeholderTextColor={AdminColors.textMuted}
                    style={styles.input}
                    keyboardType="numeric"
                  />
                )}

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Optional note for the record"
                  placeholderTextColor={AdminColors.textMuted}
                  style={[styles.input, { marginTop: 8, height: 80 }]}
                  multiline
                  textAlignVertical="top"
                />

                <Pressable
                  style={[
                    styles.submitButton,
                    !selectedResolution && styles.submitButtonDisabled,
                  ]}
                  disabled={!selectedResolution || submitting}
                  onPress={handleSubmit}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Resolution</Text>
                  )}
                </Pressable>
              </>
            )}
          </Section>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: AdminColors.background },
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
  scrollContent: { padding: 16, paddingBottom: 40 },
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
  bookingCode: {
    textAlign: "center",
    fontSize: 13,
    color: AdminColors.textMuted,
    marginBottom: 16,
  },
  vsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 16,
  },
  vsSide: { alignItems: "center" },
  vsLabel: { fontSize: 11, color: AdminColors.textMuted, fontWeight: "600" },
  vsName: { fontSize: 15, fontWeight: "700", color: AdminColors.text, marginTop: 2 },
  vsText: { fontSize: 13, fontWeight: "700", color: AdminColors.dispute },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "700" },
  section: {
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: AdminColors.textMuted,
    marginBottom: 10,
  },
  bodyText: { fontSize: 14, color: AdminColors.text, lineHeight: 20 },
  resolvedText: { fontSize: 13, color: AdminColors.textMuted, fontStyle: "italic" },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: AdminColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterActive: {
    borderColor: AdminColors.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AdminColors.primary,
  },
  radioLabel: { fontSize: 14, color: AdminColors.text },
  input: {
    borderWidth: 1,
    borderColor: AdminColors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: AdminColors.text,
    marginTop: 12,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: AdminColors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: AdminColors.border,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});