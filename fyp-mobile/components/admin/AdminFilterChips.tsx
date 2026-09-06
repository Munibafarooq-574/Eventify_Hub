// components/admin/AdminFilterChips.tsx
//
// Generic horizontal filter chip row, reused by Bookings, Payments,
// Refunds, and Disputes screens so the filter UI stays visually
// consistent across the panel.

import React from "react";
import { ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { AdminColors } from "../../constants/AdminColors";

interface FilterOption<T extends string> {
  key: T;
  label: string;
}

interface AdminFilterChipsProps<T extends string> {
  options: FilterOption<T>[];
  active: T;
  onChange: (key: T) => void;
}

export default function AdminFilterChips<T extends string>({
  options,
  active,
  onChange,
}: AdminFilterChipsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const isActive = option.key === active;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: AdminColors.card,
    borderWidth: 1,
    borderColor: AdminColors.border,
  },
  chipActive: {
    backgroundColor: AdminColors.primary,
    borderColor: AdminColors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: AdminColors.textMuted,
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});