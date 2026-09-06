// components/admin/AdminActionSheet.tsx
//
// Generic bottom action sheet used wherever admin needs to pick one of a
// few actions on an item (refund review, payout status, etc). Keeps this
// interaction consistent instead of every screen building its own modal.

import React from "react";
import { View, Text, Modal, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AdminColors } from "../../constants/AdminColors";

export interface ActionSheetOption {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
}

interface AdminActionSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: ActionSheetOption[];
  onSelect: (key: string) => void;
  onClose: () => void;
}

export default function AdminActionSheet({
  visible,
  title,
  subtitle,
  options,
  onSelect,
  onClose,
}: AdminActionSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

          {options.map((option) => (
            <Pressable
              key={option.key}
              style={styles.optionRow}
              onPress={() => onSelect(option.key)}
            >
              <Ionicons
                name={option.icon}
                size={18}
                color={option.destructive ? AdminColors.danger : AdminColors.primary}
              />
              <Text
                style={[
                  styles.optionLabel,
                  option.destructive && { color: AdminColors.danger },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}

          <Pressable style={styles.cancelRow} onPress={onClose}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: AdminColors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grabber: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: AdminColors.border,
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: AdminColors.text,
  },
  subtitle: {
    fontSize: 13,
    color: AdminColors.textMuted,
    marginTop: 2,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: AdminColors.text,
  },
  cancelRow: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: AdminColors.background,
    borderRadius: 12,
  },
  cancelLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: AdminColors.textMuted,
  },
});