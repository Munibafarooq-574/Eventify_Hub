// fyp-mobile/components/vendorCoupons/CreateCouponScreen.tsx
//
// TODO — UI-only redesign, no service/data or validation logic changes:
//   - Adds the standard back-button + centered title/subtitle header,
//     replacing the plain in-scroll screen title.
//   - Uses react-native-safe-area-context for the header (already a peer
//     dependency of expo-router, so it should already be installed).
//     npm install lucide-react-native react-native-svg

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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import { createVendorCoupon } from '../../services/createVendorCoupon';
import { DiscountKind } from '../../types/discount.types';

// TODO: swap these for EventifyHub's existing theme constants if you have
// a theme/colors file already (e.g. src/theme/colors.ts).
// Brand color (used only for header + primary button, as requested):
const tintColorLight = '#7D0C72';
const tintColorDark = '#7D0C72';

const COLORS = {
  primary: tintColorLight,
  text: '#1F2937',
  muted: '#6B7280',
  border: '#ECE7EA',
  background: '#FAF7F9',
  card: '#FFFFFF',
};

const HEADER_SIDE_WIDTH = 36;

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CreateCouponScreen() {
  const router = useRouter();

  const { vendorId } = useLocalSearchParams<{
    vendorId?: string;
  }>();

  const vendorIdValue = Array.isArray(vendorId) ? vendorId[0] : vendorId;

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
      Alert.alert('Missing code', 'Enter a coupon code, e.g. WEDDING20');
      return;
    }

    const discountValueNum = parseFloat(discountValue);

    if (!discountValueNum || discountValueNum <= 0) {
      Alert.alert('Invalid discount', 'Enter a discount value greater than 0');
      return;
    }

    if (discountType === DiscountKind.PERCENTAGE && discountValueNum > 100) {
      Alert.alert('Invalid discount', 'Percentage discount cannot exceed 100%');
      return;
    }

    const usageLimitNum = parseInt(usageLimit, 10);

    if (!usageLimitNum || usageLimitNum <= 0) {
      Alert.alert('Invalid usage limit', 'Enter how many times this coupon can be used');
      return;
    }

    if (!vendorIdValue) {
      Alert.alert('Error', 'Missing vendor ID');
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert('Invalid date', 'Please enter valid dates in YYYY-MM-DD format');
      return;
    }

    if (end <= start) {
      Alert.alert('Invalid date range', 'Expiry date must be after start date');
      return;
    }

    const payload = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: discountValueNum,
      minimumOrderAmount: minimumOrderAmount ? parseFloat(minimumOrderAmount) : undefined,
      maximumDiscountAmount: discountType === DiscountKind.PERCENTAGE && maximumDiscountAmount ? parseFloat(maximumDiscountAmount) : undefined,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      usageLimit: usageLimitNum,
    };

    try {
      setSubmitting(true);

      await createVendorCoupon(vendorIdValue, payload);

      router.replace({
        pathname: '/couponsscreen',
        params: {
          vendorId: vendorIdValue,
          initialTab: 'coupon',
          refresh: Date.now().toString(),
        },
      });
    } catch (e: any) {
      Alert.alert('Could not create coupon', e?.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // Standard screen header: back button (left) — title + subtitle (center)
  // — empty placeholder (right) so the title stays visually centered. Sits
  // inside a top-only SafeAreaView so it clears the status bar everywhere.
  const Header = () => (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ChevronLeft size={22} color={COLORS.text} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Create Coupon
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            Set up a new discount coupon
          </Text>
        </View>

        <View style={styles.headerRightPlaceholder} />
      </View>
    </SafeAreaView>
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header />

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Field label="Coupon Code">
          <TextInput style={styles.input} placeholder="WEDDING20" autoCapitalize="characters" value={code} onChangeText={setCode} />
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
          <TextInput style={styles.input} placeholder="e.g. 10000" keyboardType="numeric" value={minimumOrderAmount} onChangeText={setMinimumOrderAmount} />
        </Field>

        {discountType === DiscountKind.PERCENTAGE && (
          <Field label="Maximum Discount (Rs.) — optional">
            <TextInput style={styles.input} placeholder="e.g. 5000" keyboardType="numeric" value={maximumDiscountAmount} onChangeText={setMaximumDiscountAmount} />
          </Field>
        )}

        <Field label="Start Date (YYYY-MM-DD)">
          <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholder="2026-08-29" />
        </Field>

        <Field label="Expiry Date (YYYY-MM-DD)">
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-09-28" />
        </Field>

        <Field label="Usage Limit">
          <TextInput style={styles.input} keyboardType="numeric" value={usageLimit} onChangeText={setUsageLimit} />
        </Field>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}>
          {submitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitButtonText}>Create Coupon</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
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
  root: { flex: 1, backgroundColor: COLORS.background },

  safeArea: { backgroundColor: COLORS.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  backButton: {
    width: HEADER_SIDE_WIDTH,
    height: HEADER_SIDE_WIDTH,
    borderRadius: HEADER_SIDE_WIDTH / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16.5, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 11.5, color: COLORS.muted, marginTop: 2 },
  headerRightPlaceholder: { width: HEADER_SIDE_WIDTH, height: HEADER_SIDE_WIDTH },

  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },

  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    color: COLORS.text,
  },

  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeChipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.text },
  typeChipTextSelected: { color: '#fff' },

  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});