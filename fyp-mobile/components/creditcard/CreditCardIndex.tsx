// fyp-mobile/components/creditcard/CreditCardIndex.tsx
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const PRIMARY = '#780C60';
const PRIMARY_LIGHT = '#F8E9F0';

const formatCurrency = (value: number) => `Rs. ${Math.round(value || 0).toLocaleString('en-PK')}`;

// Groups digits into "1234 5678 9012 3456" as the user types.
const formatCardNumber = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
};

// Auto-inserts the slash for "MM/YY".
const formatExpiry = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const CreditCardPaymentScreen = () => {
  const { vendorOrderId, amount } = useLocalSearchParams<{
    vendorOrderId?: string;
    amount?: string;
  }>();

  const amountPayable = Number(amount || 0);

  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [rememberCard, setRememberCard] = useState(false);
  const [sendReceipt, setSendReceipt] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(() => {
    return (
      cardholderName.trim().length > 1 &&
      cardNumber.replace(/\s/g, '').length === 16 &&
      /^\d{2}\/\d{2}$/.test(expiry) &&
      cvv.length >= 3
    );
  }, [cardholderName, cardNumber, expiry, cvv]);

  const handlePayNow = () => {
    if (!isValid || submitting) return;

    setSubmitting(true);

    // TODO: replace with your real charge/create-payment API call using
    // vendorOrderId + amountPayable, then navigate on success/failure.
    setTimeout(() => {
      setSubmitting(false);
      router.push({
        pathname: '/paymentconfirmation',
        params: {
          vendorOrderId,
          amount: String(amountPayable),
          method: 'Credit/Debit Card',
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
          <Text style={styles.headerTitle}>Card Payment</Text>
          <Text style={styles.headerSubtitle}>Secure card checkout</Text>
        </View>
        <View style={styles.headerIconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Card preview */}
        <View style={styles.cardPreview}>
          <View style={styles.cardPreviewTopRow}>
            <Ionicons name="wifi-outline" size={20} color="rgba(255,255,255,0.85)" style={{ transform: [{ rotate: '90deg' }] }} />
            <Image source={require('@/assets/images/mastercard.png')} style={styles.cardBrandIcon} resizeMode="contain" />
          </View>

          <Text style={styles.cardPreviewNumber}>
            {cardNumber || '•••• •••• •••• ••••'}
          </Text>

          <View style={styles.cardPreviewBottomRow}>
            <View>
              <Text style={styles.cardPreviewLabel}>CARD HOLDER</Text>
              <Text style={styles.cardPreviewValue}>
                {cardholderName ? cardholderName.toUpperCase() : 'YOUR NAME'}
              </Text>
            </View>
            <View>
              <Text style={styles.cardPreviewLabel}>EXPIRES</Text>
              <Text style={styles.cardPreviewValue}>{expiry || 'MM/YY'}</Text>
            </View>
          </View>
        </View>

        {/* Cardholder Name */}
        <Text style={styles.label}>Cardholder Name</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={18} color={PRIMARY} style={styles.icon} />
          <TextInput
            placeholder="Name as shown on card"
            placeholderTextColor="#B9A6B3"
            style={styles.input}
            value={cardholderName}
            onChangeText={setCardholderName}
            autoCapitalize="words"
          />
        </View>

        {/* Card Number */}
        <Text style={styles.label}>Card Number</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="card-outline" size={18} color={PRIMARY} style={styles.icon} />
          <TextInput
            placeholder="1234 5678 9012 3456"
            placeholderTextColor="#B9A6B3"
            style={styles.input}
            keyboardType="numeric"
            value={cardNumber}
            onChangeText={(t) => setCardNumber(formatCardNumber(t))}
            maxLength={19}
          />
        </View>

        {/* Expiry and CVV */}
        <View style={styles.row}>
          <View style={styles.inputContainerSmall}>
            <Ionicons name="calendar-outline" size={17} color={PRIMARY} style={styles.icon} />
            <TextInput
              placeholder="MM/YY"
              placeholderTextColor="#B9A6B3"
              style={styles.input}
              keyboardType="numeric"
              value={expiry}
              onChangeText={(t) => setExpiry(formatExpiry(t))}
              maxLength={5}
            />
          </View>
          <View style={styles.inputContainerSmall}>
            <Ionicons name="lock-closed-outline" size={17} color={PRIMARY} style={styles.icon} />
            <TextInput
              placeholder="CVV"
              placeholderTextColor="#B9A6B3"
              style={styles.input}
              keyboardType="numeric"
              secureTextEntry
              value={cvv}
              onChangeText={(t) => setCvv(t.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
            />
          </View>
        </View>

        {/* Switches */}
        <View style={styles.switchCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Remember this card</Text>
              <Text style={styles.switchSubtitle}>Save for faster checkout next time</Text>
            </View>
            <Switch
              value={rememberCard}
              onValueChange={setRememberCard}
              trackColor={{ false: '#E3D3DD', true: '#B84B9A' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.switchDivider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Email me a receipt</Text>
              <Text style={styles.switchSubtitle}>Sent right after payment succeeds</Text>
            </View>
            <Switch
              value={sendReceipt}
              onValueChange={setSendReceipt}
              trackColor={{ false: '#E3D3DD', true: '#B84B9A' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={styles.secureNote}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#278A4B" />
          <Text style={styles.secureNoteText}>Your card details are encrypted and never stored on our servers</Text>
        </View>
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
          {!submitting && <Ionicons name="lock-closed" size={16} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default CreditCardPaymentScreen;

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

  cardPreview: {
    backgroundColor: PRIMARY,
    borderRadius: 20,
    padding: 20,
    marginBottom: 22,
    minHeight: 150,
    justifyContent: 'space-between',
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  cardPreviewTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrandIcon: { width: 44, height: 28, tintColor: undefined },
  cardPreviewNumber: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 2,
    marginVertical: 14,
  },
  cardPreviewBottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cardPreviewLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  cardPreviewValue: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', marginTop: 3 },

  label: { fontSize: 12, fontWeight: '700', color: '#5A4A54', marginBottom: 6, marginTop: 4 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0DDEA',
  },
  inputContainerSmall: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F0DDEA',
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: '#1A1A1A', paddingVertical: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },

  switchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#F0DDEA',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  switchSubtitle: { fontSize: 11, color: '#8A8A8A', marginTop: 2 },
  switchDivider: { height: 1, backgroundColor: '#F5EAF1', marginVertical: 12 },

  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 6,
  },
  secureNoteText: { flex: 1, fontSize: 11, color: '#278A4B', fontWeight: '600', lineHeight: 15 },

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