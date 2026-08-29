// fyp-mobile/components/CustomerFeatures/CouponInputField.tsx
//
// Drop-in component for your Checkout/BookingScreen (spec section 27:
// "Coupon Code [ Apply ]", discount calculated on the backend). I don't
// have that screen's contents, so instead of guessing at its layout,
// this is self-contained — give it a vendorId + the order's current
// amount, and it handles the text input, Apply button, and validation
// call itself.
//
// Usage:
//   const [coupon, setCoupon] = useState<CouponValidationResult | null>(null);
//   ...
//   <CouponInputField vendorId={vendor._id} orderAmount={subtotal} onApplied={setCoupon} />
//   ...
//   Total: Rs. {(coupon ? coupon.finalAmount : subtotal).toLocaleString()}
//
// IMPORTANT: this component only VALIDATES (read-only, safe to call
// repeatedly). When the booking is actually placed, call
// redeemCoupon(vendorId, coupon.code) from your order-creation flow —
// see services/redeemCoupon.ts. Applying here does not consume a use.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { validateCoupon } from '../../services/validateCoupon';
import { CouponValidationResult } from '../../types/discount.types';

const COLORS = {
  primary: '#7C3AED',
  text: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  success: '#059669',
  danger: '#DC2626',
  successBg: '#ECFDF5',
};

export function CouponInputField({
  vendorId,
  orderAmount,
  onApplied,
}: {
  vendorId: string;
  orderAmount: number;
  onApplied: (result: CouponValidationResult | null) => void;
}) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState<CouponValidationResult | null>(null);
  const [validatedForAmount, setValidatedForAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStale = applied !== null && validatedForAmount !== orderAmount;

  const handleApply = async () => {
    if (!code.trim()) return;
    try {
      setLoading(true);
      setError(null);
      const result = await validateCoupon(vendorId, code.trim().toUpperCase(), orderAmount);
      setApplied(result);
      setValidatedForAmount(orderAmount);
      onApplied(result);
    } catch (e: any) {
      setError(e?.message || 'Invalid code');
      setApplied(null);
      onApplied(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setValidatedForAmount(null);
    setCode('');
    setError(null);
    onApplied(null);
  };

  if (applied) {
    return (
      <View style={styles.appliedRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.appliedCode}>🎟 {applied.code} applied</Text>
          {isStale ? (
            <Text style={styles.staleText}>Your order total changed — tap Remove and re-apply.</Text>
          ) : (
            <Text style={styles.appliedDiscount}>- Rs. {applied.discountAmount.toLocaleString()}</Text>
          )}
        </View>
        <TouchableOpacity onPress={handleRemove}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Coupon Code"
          autoCapitalize="characters"
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setError(null);
          }}
        />
        <TouchableOpacity style={styles.applyButton} onPress={handleApply} disabled={loading || !code.trim()}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.applyButtonText}>Apply</Text>}
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
  },
  applyButton: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  applyButtonText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
  errorText: { color: COLORS.danger, fontSize: 12.5, marginTop: 6 },

  appliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successBg,
    borderRadius: 10,
    padding: 12,
  },
  appliedCode: { fontSize: 13.5, fontWeight: '700', color: COLORS.text },
  appliedDiscount: { fontSize: 13, fontWeight: '700', color: COLORS.success, marginTop: 2 },
  staleText: { fontSize: 12, color: COLORS.danger, marginTop: 2 },
  removeText: { fontSize: 12.5, fontWeight: '700', color: COLORS.danger },
});