// fyp-mobile/components/paymentconfirmation/PaymentConfirmationIndex.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';

const formatCurrency = (value: number) => `Rs. ${Math.round(value || 0).toLocaleString('en-PK')}`;

// Turns "689a1f..." into a short, readable reference like "EH-689A1F".
const toOrderRef = (id?: string) => {
  if (!id) return `EH-${Date.now().toString(36).toUpperCase()}`;
  return `EH-${id.slice(-8).toUpperCase()}`;
};

const PaymentConfirmationScreen = () => {
  const { vendorOrderId, amount, method } = useLocalSearchParams<{
    vendorOrderId?: string;
    amount?: string;
    method?: string;
  }>();

  const [saving, setSaving] = useState(false);

  const amountPaid = Number(amount || 0);
  const orderRef = useMemo(() => toOrderRef(vendorOrderId), [vendorOrderId]);
  const paidAt = useMemo(() => new Date(), []);

  const dateLabel = paidAt.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeLabel = paidAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const details = [
    { label: 'Order Reference', value: orderRef },
    { label: 'Amount Paid', value: formatCurrency(amountPaid) },
    { label: 'Payment Method', value: method || 'N/A' },
    { label: 'Date & Time', value: `${dateLabel} · ${timeLabel}` },
    { label: 'Status', value: 'Successful' },
  ];

  const handleSaveReceipt = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: -apple-system, Arial, sans-serif; padding: 24px; color: #1A1A1A; }
              .brand { font-size: 20px; font-weight: 800; color: ${PRIMARY}; margin-bottom: 4px; }
              .muted { color: #8A8A8A; font-size: 12px; margin-bottom: 20px; }
              .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F0DDEA; }
              .label { color: #8A8A8A; font-size: 13px; }
              .value { font-weight: 700; font-size: 13px; }
              .total { font-size: 18px; font-weight: 800; color: ${PRIMARY}; }
            </style>
          </head>
          <body>
            <div class="brand">Eventify Hub</div>
            <div class="muted">Payment Receipt</div>
            ${details
              .map(
                (d) => `
              <div class="row">
                <span class="label">${d.label}</span>
                <span class="value ${d.label === 'Amount Paid' ? 'total' : ''}">${d.value}</span>
              </div>`,
              )
              .join('')}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Share.share({ url: uri, message: 'Here is your Eventify Hub payment receipt.' });
    } catch (error) {
      console.error('Error saving receipt:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color={PRIMARY} />
      </TouchableOpacity>

      {/* Success icon */}
      <View style={styles.successCircleOuter}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={44} color="#FFFFFF" />
        </View>
      </View>

      <Text style={styles.title}>Payment Successful</Text>
      <Text style={styles.subtitle}>
        Your booking is confirmed. A confirmation has also been sent to the vendor.
      </Text>

      {/* Amount pill */}
      <View style={styles.amountPill}>
        <Text style={styles.amountPillLabel}>Amount Paid</Text>
        <Text style={styles.amountPillValue}>{formatCurrency(amountPaid)}</Text>
      </View>

      {/* Payment Details Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Details</Text>

        {details.map((row, index) => (
          <View
            key={row.label}
            style={[styles.cardRow, index === details.length - 1 && styles.cardRowLast]}
          >
            <Text style={styles.cardLabel}>{row.label}</Text>
            <Text
              style={[
                styles.cardValue,
                row.label === 'Status' && styles.cardValueSuccess,
              ]}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.receiptNote}>
        <Ionicons name="mail-outline" size={14} color="#8A8A8A" />
        <Text style={styles.receiptNoteText}>A copy of this receipt has been emailed to you</Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleSaveReceipt}
        disabled={saving}
        activeOpacity={0.85}
      >
        <Ionicons name="download-outline" size={18} color={PRIMARY} />
        <Text style={styles.secondaryButtonText}>
          {saving ? 'Preparing receipt...' : 'Save / Share Receipt'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/myevents')}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>View Booking</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.doneLink}
        onPress={() => router.push('/dashboard')}
      >
        <Text style={styles.doneLinkText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default PaymentConfirmationScreen;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: PRIMARY_LIGHT,
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },

  backButton: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  successCircleOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(39,138,75,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 22,
  },
  successCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#278A4B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#278A4B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },

  title: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  subtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 19,
    paddingHorizontal: 10,
  },

  amountPill: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginTop: 22,
    width: '100%',
  },
  amountPillLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '600' },
  amountPillValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '900', marginTop: 4 },

  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#F0DDEA',
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#1A1A1A', marginBottom: 10 },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EAF1',
  },
  cardRowLast: { borderBottomWidth: 0 },
  cardLabel: { fontSize: 12, color: '#8A8A8A', fontWeight: '600' },
  cardValue: { fontSize: 12, fontWeight: '700', color: '#1A1A1A' },
  cardValueSuccess: { color: '#278A4B', fontWeight: '800' },

  receiptNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  receiptNoteText: { fontSize: 11, color: '#8A8A8A' },

  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 26,
  },
  secondaryButtonText: { color: PRIMARY, fontWeight: '800', fontSize: 13 },

  primaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 12,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },

  doneLink: { marginTop: 16, paddingVertical: 6 },
  doneLinkText: { color: '#8A8A8A', fontSize: 12, fontWeight: '700' },
});