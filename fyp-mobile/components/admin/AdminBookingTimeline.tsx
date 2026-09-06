// components/admin/AdminBookingTimeline.tsx
//
// If your app already has a BookingTimeline component from Phase 18,
// reuse that one instead — this is a lightweight standalone version so
// the admin booking-details screen isn't blocked on it.

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminColors } from "../../constants/AdminColors";
import { BookingTimelineStep } from "../../types/admin.types";

interface AdminBookingTimelineProps {
  steps: BookingTimelineStep[];
}

export default function AdminBookingTimeline({ steps }: AdminBookingTimelineProps) {
  return (
    <View>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isDone = step.status === "done";
        const isCurrent = step.status === "current";

        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.indicatorColumn}>
              <View
                style={[
                  styles.dot,
                  isDone && styles.dotDone,
                  isCurrent && styles.dotCurrent,
                ]}
              >
                {isDone && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
              </View>
              {!isLast && (
                <View style={[styles.line, isDone && styles.lineDone]} />
              )}
            </View>
            <Text
              style={[
                styles.label,
                (isDone || isCurrent) && styles.labelActive,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  indicatorColumn: {
    alignItems: "center",
    width: 24,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AdminColors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: {
    backgroundColor: AdminColors.success,
  },
  dotCurrent: {
    backgroundColor: AdminColors.card,
    borderWidth: 2,
    borderColor: AdminColors.primary,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: AdminColors.border,
  },
  lineDone: {
    backgroundColor: AdminColors.success,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: AdminColors.textMuted,
    paddingBottom: 20,
    paddingLeft: 10,
  },
  labelActive: {
    color: AdminColors.text,
    fontWeight: "600",
  },
});