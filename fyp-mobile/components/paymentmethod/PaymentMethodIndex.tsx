// fyp-mobile/components/paymentmethod/PaymentMethodIndex.tsx
import getBookingFinancials from '@/services/getBookingFinancials';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';
const ACCENT = '#B84B9A';

const STEPS = ['Cart', 'Payment', 'Confirm'];
const CURRENT_STEP = 1; // 0-indexed: Payment is active

type Method = {
  id: number;
  name: string;
  description: string;
  icon: any;
  route: '/creditcard' | '/jazzcash' | '/easypaisa';
};

const METHODS: Method[] = [
  {
    id: 1,
    name: 'Credit / Debit Card',
    description: 'Visa, Mastercard & more',
    icon: require('@/assets/images/mastercard.png'),
    route: '/creditcard',
  },
  {
    id: 2,
    name: 'JazzCash',
    description: 'Pay from your JazzCash wallet',
    icon: require('@/assets/images/jazzcash.png'),
    route: '/jazzcash',
  },
  {
    id: 3,
    name: 'EasyPaisa',
    description: 'Easypaisa mobile account required',
    icon: require('@/assets/images/easypaisa.png'),
    route: '/easypaisa',
  },
];

const formatCurrency = (value: number) => `Rs. ${Math.round(value || 0).toLocaleString('en-PK')}`;

// Shape returned by /payment/vendor-order/:id/financials.
// Adjust these field names if your backend response uses different keys.
type BookingFinancials = {
  totalAmount: number;
  downPaymentAmount: number;
  remainingAmount: number;
  downPaymentPaid?: boolean;
  fullyPaid?: boolean;
  serviceName?: string;
};

const PaymentMethodScreen = () => {
  // vendorOrderId is passed in as a route param when navigating here, e.g.
  // router.push({ pathname: '/paymentmethod', params: { vendorOrderId } })
  const { vendorOrderId } = useLocalSearchParams<{ vendorOrderId?: string }>();

  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);
  const [financials, setFinancials] = useState<BookingFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFinancials = useCallback(async () => {
    if (!vendorOrderId) {
      setError('Missing booking reference.');
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await getBookingFinancials(vendorOrderId);
      setFinancials(data);
    } catch (err) {
      console.error('Error fetching booking financials:', err);
      setError('Could not load payment details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [vendorOrderId]);

  useEffect(() => {
    loadFinancials();
  }, [loadFinancials]);

  const selected = METHODS.find((m) => m.id === selectedMethod);

  // Whichever amount is actually due right now: down payment first,
  // then the remaining balance once the down payment is settled.
  const amountDue = !financials
    ? 0
    : financials.downPaymentPaid
    ? financials.remainingAmount
    : financials.downPaymentAmount;

  const amountLabel = !financials
    ? 'Amount Payable'
    : financials.downPaymentPaid
    ? 'Remaining Payment'
    : 'Down Payment';

  const handlePayNow = () => {
    if (!selected || !financials) return;
    router.push({
      pathname: selected.route,
      params: {
        vendorOrderId,
        amount: String(amountDue),
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </View>
    );
  }

  if (error || !financials) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <Ionicons name="alert-circle-outline" size={48} color="#D9534F" />
        <Text style={styles.errorTitle}>Couldn't load payment details</Text>
        <Text style={styles.errorText}>{error || 'Something went wrong.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadFinancials}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Payment</Text>
          <Text style={styles.headerSubtitle}>Step 2 of 3</Text>
        </View>

        <View style={styles.headerIconBtn} />
      </View>

      {/* Stepper */}
      <View style={styles.stepperCard}>
        <View style={styles.stepperRow}>
          {STEPS.map((label, index) => {
            const done = index < CURRENT_STEP;
            const active = index === CURRENT_STEP;

            return (
              <React.Fragment key={label}>
                <View style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      (done || active) && styles.stepDotActive,
                    ]}
                  >
                    {done ? (
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepDotText,
                          active && styles.stepDotTextActive,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepLabel, active && styles.stepLabelActive]}>
                    {label}
                  </Text>
                </View>

                {index < STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepConnector,
                      done && styles.stepConnectorActive,
                    ]}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Real financials breakdown, fetched from backend */}
        <View style={styles.breakdownCard}>
          {!!financials.serviceName && (
            <Text style={styles.breakdownServiceName}>{financials.serviceName}</Text>
          )}

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Total</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(financials.totalAmount)}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Down Payment{financials.downPaymentPaid ? ' (Paid)' : ''}
            </Text>
            <Text
              style={[
                styles.breakdownValue,
                financials.downPaymentPaid && styles.breakdownValuePaid,
              ]}
            >
              {formatCurrency(financials.downPaymentAmount)}
            </Text>
          </View>

          <View style={styles.breakdownDivider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabelBold}>Remaining</Text>
            <Text style={styles.breakdownValueBold}>
              {formatCurrency(financials.remainingAmount)}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Choose how you'd like to pay</Text>
        <Text style={styles.sectionSubtitle}>
          Your payment is processed securely. We never store your card details.
        </Text>

        {METHODS.map((method) => {
          const isSelected = selectedMethod === method.id;

          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, isSelected && styles.methodCardSelected]}
              activeOpacity={0.85}
              onPress={() => setSelectedMethod(method.id)}
            >
              <View style={styles.methodIconWrap}>
                <Image source={method.icon} style={styles.methodIcon} resizeMode="contain" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.methodName}>{method.name}</Text>
                <Text style={styles.methodDescription}>{method.description}</Text>
              </View>

              <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.secureNote}>
          <Ionicons name="lock-closed-outline" size={14} color="#278A4B" />
          <Text style={styles.secureNoteText}>256-bit encrypted secure payment</Text>
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>{amountLabel}</Text>
          <Text style={styles.amountValue}>{formatCurrency(amountDue)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, !selected && styles.payButtonDisabled]}
          onPress={handlePayNow}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text style={styles.payButtonText}>
            {selected ? `Pay with ${selected.name}` : 'Select a payment method'}
          </Text>
          {selected && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PaymentMethodScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PRIMARY_LIGHT },

  centerState: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  loadingText: { marginTop: 12, fontSize: 13, color: '#8A8A8A', fontWeight: '600' },
  errorTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', marginTop: 14 },
  errorText: { fontSize: 12, color: '#8A8A8A', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  retryButton: {
    marginTop: 18,
    backgroundColor: PRIMARY,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 20,
  },
  retryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: PRIMARY,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  stepperCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -18,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center' },
  stepItem: { alignItems: 'center', width: 64 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EFEFEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: { backgroundColor: PRIMARY },
  stepDotText: { fontSize: 12, fontWeight: '700', color: '#999999' },
  stepDotTextActive: { color: '#FFFFFF' },
  stepLabel: { fontSize: 11, color: '#999999', marginTop: 6, fontWeight: '600' },
  stepLabelActive: { color: PRIMARY, fontWeight: '800' },
  stepConnector: { flex: 1, height: 2, backgroundColor: '#EFEFEF', marginBottom: 18 },
  stepConnectorActive: { backgroundColor: PRIMARY },

  scrollContent: { padding: 16, paddingBottom: 24 },

  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0DDEA',
  },
  breakdownServiceName: { fontSize: 13, fontWeight: '800', color: PRIMARY, marginBottom: 10 },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  breakdownLabel: { fontSize: 12, color: '#8A8A8A', fontWeight: '600' },
  breakdownValue: { fontSize: 13, color: '#1A1A1A', fontWeight: '700' },
  breakdownValuePaid: { color: '#278A4B' },
  breakdownDivider: { height: 1, backgroundColor: '#F0DDEA', marginVertical: 8 },
  breakdownLabelBold: { fontSize: 13, color: '#1A1A1A', fontWeight: '800' },
  breakdownValueBold: { fontSize: 17, color: PRIMARY, fontWeight: '900' },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  sectionSubtitle: { fontSize: 12, color: '#8A8A8A', marginTop: 4, marginBottom: 16, lineHeight: 17 },

  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#F0DDEA',
  },
  methodCardSelected: {
    borderColor: PRIMARY,
    backgroundColor: PRIMARY_LIGHT,
  },
  methodIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodIcon: { width: 28, height: 28 },
  methodName: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  methodDescription: { fontSize: 11, color: '#8A8A8A', marginTop: 2 },

  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D9C4D1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterActive: { borderColor: PRIMARY },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: PRIMARY },

  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  secureNoteText: { fontSize: 11, color: '#278A4B', fontWeight: '600' },

  footer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 6,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: { fontSize: 13, color: '#8A8A8A', fontWeight: '600' },
  amountValue: { fontSize: 20, fontWeight: '800', color: PRIMARY },

  payButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
  },
  payButtonDisabled: { backgroundColor: '#D9C4D1' },
  payButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
});