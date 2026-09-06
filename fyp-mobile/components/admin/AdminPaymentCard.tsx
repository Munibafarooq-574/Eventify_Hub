// components/admin/AdminPaymentCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AdminColors, statusColor } from "../../constants/AdminColors";
import { PaymentListItem, PaymentType } from "../../types/admin.types";

const TYPE_LABEL: Record<PaymentType, string> = {
  DOWN_PAYMENT: "DOWN PAYMENT",
  REMAINING: "REMAINING PAYMENT",
  FULL_PAYMENT: "FULL PAYMENT",
};

interface AdminPaymentCardProps {
  payment: PaymentListItem;
}

export default function AdminPaymentCard({ payment }: AdminPaymentCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.bookingCode}>{payment.bookingCode}</Text>
          <Text style={styles.serviceName}>{payment.serviceName}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor(payment.status) + "1A" },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColor(payment.status) }]}>
            {payment.status}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.amount}>{payment.amountLabel}</Text>
          <Text style={styles.typeLabel}>{TYPE_LABEL[payment.type]}</Text>
        </View>
        <Text style={styles.date}>{payment.date}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AdminColors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bookingCode: {
    fontSize: 12,
    color: AdminColors.textMuted,
    fontWeight: "500",
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: AdminColors.text,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: AdminColors.border,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: AdminColors.text,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: AdminColors.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  date: {
    fontSize: 12,
    color: AdminColors.textMuted,
  },
});