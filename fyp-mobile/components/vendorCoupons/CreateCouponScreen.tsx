// fyp-mobile/components/vendorCoupons/CreateCouponScreen.tsx
// Handles creating BOTH Coupons and Discount Codes — `route.params.entryType`
// ('coupon' | 'discountCode', set by CouponsScreen's tab) decides which
// backend endpoint gets called. Same form either way, per the spec's own
// note that the two are mechanically identical.
//
// Dates are plain text inputs (YYYY-MM-DD) to avoid assuming a
// date-picker library is installed — swap for
// @react-native-community/datetimepicker (or whatever EventifyHub
// already uses elsewhere, e.g. the booking date picker) if available.
//
// TODO: same navigation/vendorId/theme notes as the earlier screens apply.

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { createVendorCoupon } from '../../services/createVendorCoupon';
import { createVendorDiscountCode } from '../../services/createVendorDiscountCode';
import { DiscountKind } from '../../types/discount.types';
import { useRouter, useLocalSearchParams } from 'expo-router';

const COLORS = {
  primary: '#7C3AED',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  background: '#FAFAFA',
  card: '#FFFFFF',
  danger: '#DC2626',
};

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
export default function CreateCouponScreen() {
  const router = useRouter();

  const { vendorId, entryType } = useLocalSearchParams<{
    vendorId?: string;
    entryType?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

  const entryTypeValue =
    Array.isArray(entryType) ? entryType[0] : entryType;

  const actualEntryType: 'coupon' | 'discountCode' =
    entryTypeValue === 'discountCode' ? 'discountCode' : 'coupon';

  const isDiscountCode = actualEntryType === 'discountCode';

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<DiscountKind>(DiscountKind.PERCENTAGE);
  const [discountValue, setDiscountValue] = useState('');
  const [minimumOrderAmount, setMinimumOrderAmount] = useState('');
  const [maximumDiscountAmount, setMaximumDiscountAmount] = useState('');
  const [startDate, setStartDate] = useState(todayPlus(0));
  const [endDate, setEndDate] = useState(todayPlus(30));
  const [usageLimit, setUsageLimit] = useState('50');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('Missing code', `Enter a code, e.g. ${isDiscountCode ? 'SUMMER15' : 'WEDDING20'}`);
      return;
    }
    const discountValueNum = parseFloat(discountValue);
    if (!discountValueNum || discountValueNum <= 0) {
      Alert.alert('Invalid discount', 'Enter a discount value greater than 0');
      return;
    }
    const usageLimitNum = parseInt(usageLimit, 10);
    if (!usageLimitNum || usageLimitNum <= 0) {
      Alert.alert('Invalid usage limit', 'Enter how many times this can be used');
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: discountValueNum,
      minimumOrderAmount: minimumOrderAmount ? parseFloat(minimumOrderAmount) : undefined,
      maximumDiscountAmount:
        discountType === DiscountKind.PERCENTAGE && maximumDiscountAmount
          ? parseFloat(maximumDiscountAmount)
          : undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      usageLimit: usageLimitNum,
    };

    try {
      setSubmitting(true);
      if (!vendorIdValue) {
        Alert.alert('Error', 'Missing vendor ID');
        return;
      }

      if (isDiscountCode) {
        await createVendorDiscountCode(vendorIdValue, payload);
      } else {
        await createVendorCoupon(vendorIdValue, payload);
      }
      // Tell CouponsScreen to refetch (and stay on the right tab) when we go back to it.
      router.replace({
      pathname: '/couponsscreen',
      params: {
        vendorId: vendorIdValue,
        initialTab: actualEntryType,
        refresh: Date.now().toString(),
      },
    });
    } catch (e: any) {
      Alert.alert('Could not create', e?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>{isDiscountCode ? 'Create Discount Code' : 'Create Coupon'}</Text>

      <Field label="Code">
        <TextInput
          style={styles.input}
          placeholder={isDiscountCode ? 'SUMMER15' : 'WEDDING20'}
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
        />
      </Field>

      <Field label="Discount Type">
        <View style={styles.typeRow}>
          {[DiscountKind.PERCENTAGE, DiscountKind.FIXED].map((kind) => (
            <TouchableOpacity
              key={kind}
              style={[styles.typeChip, discountType === kind && styles.typeChipSelected]}
              onPress={() => setDiscountType(kind)}
            >
              <Text style={[styles.typeChipText, discountType === kind && styles.typeChipTextSelected]}>
                {kind === DiscountKind.PERCENTAGE ? 'Percentage (%)' : 'Fixed Amount (Rs.)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Field>

      <Field label={discountType === DiscountKind.PERCENTAGE ? 'Discount (%)' : 'Discount Amount (Rs.)'}>
        <TextInput
          style={styles.input}
          placeholder={discountType === DiscountKind.PERCENTAGE ? 'e.g. 20' : 'e.g. 5000'}
          keyboardType="numeric"
          value={discountValue}
          onChangeText={setDiscountValue}
        />
      </Field>

      <Field label="Minimum Order Amount (Rs.) — optional">
        <TextInput
          style={styles.input}
          placeholder="e.g. 10000"
          keyboardType="numeric"
          value={minimumOrderAmount}
          onChangeText={setMinimumOrderAmount}
        />
      </Field>

      {discountType === DiscountKind.PERCENTAGE && (
        <Field label="Maximum Discount (Rs.) — optional">
          <TextInput
            style={styles.input}
            placeholder="e.g. 5000"
            keyboardType="numeric"
            value={maximumDiscountAmount}
            onChangeText={setMaximumDiscountAmount}
          />
        </Field>
      )}

      <Field label="Start Date (YYYY-MM-DD)">
        <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} />
      </Field>

      <Field label="Expiry Date (YYYY-MM-DD)">
        <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} />
      </Field>

      <Field label="Usage Limit">
        <TextInput style={styles.input} keyboardType="numeric" value={usageLimit} onChangeText={setUsageLimit} />
      </Field>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>Create Coupon</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginBottom: 18 },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14.5,
    color: COLORS.text,
  },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  typeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.text },
  typeChipTextSelected: { color: '#fff' },

  submitButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});