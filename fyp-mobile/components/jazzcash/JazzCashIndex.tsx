// fyp-mobile/components/jazzcash/JazzCashIndex.tsx
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';
const JAZZ_RED = '#ED1C24';

const formatCurrency = (value: number) => `Rs. ${Math.round(value || 0).toLocaleString('en-PK')}`;

// Formats to "03XX-XXXXXXX" as the user types.
const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
};

const JazzCashPaymentScreen = () => {
  const { vendorOrderId, amount } = useLocalSearchParams<{
    vendorOrderId?: string;
    amount?: string;
  }>();

  const amountPayable = Number(amount || 0);

  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(() => /^03\d{2}-\d{7}$/.test(phone), [phone]);

  const handlePayNow = () => {
    if (!isValid || submitting) return;

    setSubmitting(true);

    // TODO: replace with your real JazzCash mobile-account charge API call
    // using vendorOrderId + amountPayable, then navigate on success/failure.
    setTimeout(() => {
      setSubmitting(false);
      router.push({
        pathname: '/paymentconfirmation',
        params: {
          vendorOrderId,
          amount: String(amountPayable),
          method: 'JazzCash',
        },
      });
    }, 900);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>JazzCash</Text>
          <Text style={styles.headerSubtitle}>Mobile wallet payment</Text>
        </View>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand card */}
        <View style={styles.brandCard}>
          <View style={styles.brandLogoWrap}>
            <Image
              source={require('@/assets/images/jazzcash.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandTitle}>Pay with your JazzCash account</Text>
          <Text style={styles.brandSubtitle}>
            Make sure you have sufficient balance before proceeding
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionRow}>
            <View style={styles.instructionIconWrap}>
              <Ionicons name="phone-portrait-outline" size={16} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.instructionTitle}>Jazz / Warid users</Text>
              <Text style={styles.instructionText}>
                Unlock your phone — you'll get an MPIN prompt automatically.
              </Text>
            </View>
          </View>

          <View style={styles.instructionDivider} />

          <View style={styles.instructionRow}>
            <View style={styles.instructionIconWrap}>
              <Ionicons name="apps-outline" size={16} color={PRIMARY} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.instructionTitle}>Other networks</Text>
              <Text style={styles.instructionText}>
                Log in to the JazzCash app and enter your MPIN when asked.
              </Text>
            </View>
          </View>
        </View>

        {/* Phone Number Input */}
        <Text style={styles.label}>JazzCash Mobile Number</Text>
        <View style={[styles.inputContainer, isValid && styles.inputContainerValid]}>
          <Ionicons name="call-outline" size={18} color={PRIMARY} style={styles.icon} />
          <TextInput
            placeholder="03XX-XXXXXXX"
            placeholderTextColor="#B9A6B3"
            style={styles.input}
            keyboardType="numeric"
            value={phone}
            onChangeText={(t) => setPhone(formatPhone(t))}
            maxLength={12}
          />
          {isValid && <Ionicons name="checkmark-circle" size={18} color="#278A4B" />}
        </View>

        <Text style={styles.convenienceNote}>
          We'll save this number for faster checkout next time. You can remove it anytime from
          Payment Options in your Account settings.
        </Text>
      </ScrollView>

      {/* Sticky footer */}
      <View style={styles.footer}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Amount Payable</Text>
          <Text style={styles.amountValue}>{formatCurrency(amountPayable)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, !isValid && styles.payButtonDisabled]}
          onPress={handlePayNow}
          disabled={!isValid || submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.payButtonText}>
            {submitting ? 'Processing...' : `Pay ${formatCurrency(amountPayable)}`}
          </Text>
          {!submitting && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default JazzCashPaymentScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PRIMARY_LIGHT },

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

  scrollContent: { padding: 16, paddingBottom: 24 },

  brandCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0DDEA',
  },
  brandLogoWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandLogo: { width: 46, height: 46 },
  brandTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  brandSubtitle: { fontSize: 12, color: '#8A8A8A', textAlign: 'center', marginTop: 5, lineHeight: 17 },

  instructionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0DDEA',
  },
  instructionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  instructionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: PRIMARY_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionTitle: { fontSize: 12, fontWeight: '800', color: '#1A1A1A' },
  instructionText: { fontSize: 11, color: '#8A8A8A', marginTop: 2, lineHeight: 15 },
  instructionDivider: { height: 1, backgroundColor: '#F5EAF1', marginVertical: 12 },

  label: { fontSize: 12, fontWeight: '700', color: '#5A4A54', marginBottom: 6 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#F0DDEA',
  },
  inputContainerValid: { borderColor: '#278A4B' },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#1A1A1A', paddingVertical: 13 },

  convenienceNote: { fontSize: 11, color: '#8A8A8A', textAlign: 'center', marginTop: 12, lineHeight: 16 },

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
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
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