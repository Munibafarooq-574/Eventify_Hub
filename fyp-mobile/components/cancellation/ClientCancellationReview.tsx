import { formatNoticeHours } from '@/utils/bookingCancellation';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import calculateRefund, { ClientCancellationPreview } from '@/services/calculateRefund';
import cancelConfirmedBooking from '@/services/cancelConfirmedBooking';

function messageFrom(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(messageFrom).join(' ');
  if (value && typeof value === 'object' && 'message' in value) return messageFrom(value.message);
  return 'Unable to complete cancellation. Please try again.';
}
function errorMessage(error: unknown): string {
  const request = error as { response?: { data?: unknown }; message?: string };
  return request.response?.data ? messageFrom(request.response.data) : request.message || 'Unable to connect. Please try again.';
}
const money = (value: number | null | undefined) => value == null ? '—' : `Rs. ${value.toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;

export default function ClientCancellationReview({ vendorOrderId, vendorName, onClose, onCancelled }: {
  vendorOrderId: string; vendorName: string; onClose: () => void; onCancelled: () => Promise<void>;
}) {
  const [preview, setPreview] = useState<ClientCancellationPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [retry, setRetry] = useState(0);
  const mounted = useRef(true);
  const confirming = useRef(false);
  useEffect(() => {
    let current = true;
    mounted.current = true;
    async function load() {
      setLoading(true); setError(''); setPreview(null);
      try {
        const result = await calculateRefund(vendorOrderId);
        if (current) setPreview(result);
      } catch (err) { if (current) setError(errorMessage(err)); }
      finally { if (current) setLoading(false); }
    }
    void load();
    return () => { current = false; mounted.current = false; };
  }, [vendorOrderId, retry]);

  async function confirm() {
    if (confirming.current || !preview?.eligible || !preview.previewToken) return;
    confirming.current = true; setBusy(true); setError('');
    try {
      const result = await cancelConfirmedBooking(vendorOrderId, 'organizer', reason.trim() || undefined, preview.previewToken);
      const refundAmount = result.refund?.refundAmount ?? preview.refundAmount;
      // Cancellation is already committed. A refresh failure must not invite another cancellation.
      try { await onCancelled(); } catch { /* The parent can refresh on next focus. */ }
      if (mounted.current) onClose();
      Alert.alert('Booking cancelled', refundAmount > 0
        ? `Only this vendor booking was cancelled. A refund of ${money(refundAmount)} is pending processing. Your other vendor bookings are unchanged.`
        : 'Only this vendor booking was cancelled. No monetary refund is due under its saved policy. Your other vendor bookings are unchanged.');
    } catch (err) {
      if (mounted.current) {
        setError(errorMessage(err));
        const status = (err as { response?: { status?: number } }).response?.status;
        // Changed or expired terms require a new review and an explicit second confirmation.
        if (status === 409 || status === 400 || status === 403) setPreview(null);
      }
    } finally {
      confirming.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return <Modal visible animationType="slide" transparent onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.sheet} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>Review Cancellation</Text>
          <Text style={styles.vendor}>{vendorName}</Text>
          <Text style={styles.hint}>Only this vendor booking will be cancelled. Your other vendor bookings will remain unchanged.</Text>
          {loading && <ActivityIndicator size="large" color="#7B2869" accessibilityLabel="Loading cancellation preview" />}
          {!!error && <View accessibilityRole="alert" style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}
          {!loading && preview && <>
            <View style={styles.summary}>
              <Row label="Amount paid" value={money(preview.amountPaid)} />
              <Row label="Saved policy" value={preview.cancellationPolicyApplied || 'Not available'} />
              {preview.eligible && <>
                <Row label="Notice before service" value={formatNoticeHours(preview.hoursBeforeEvent)} />
                <Row label="Applicable refund" value={`${preview.refundPercentage}%`} />
                <Row label="Estimated refund" value={money(preview.refundAmount)} />
                <Row label="Amount retained" value={money(preview.withheldAmount)} />
                <Row label="Saved policy revision" value={String(preview.policyRevision)} />
              </>}
            </View>
            {!preview.eligible && <Text style={styles.errorText}>{preview.message || 'This booking cannot be cancelled here.'}</Text>}
            {preview.eligible && <>
              <Text style={styles.label}>Reason for cancellation (optional)</Text>
              <TextInput accessibilityLabel="Reason for cancellation" value={reason} onChangeText={setReason} maxLength={500} multiline editable={!busy} style={styles.input} placeholder="Tell us why you are cancelling" textAlignVertical="top" />
              <Text style={styles.hint}>Review the amounts before confirming. Any refund is processed separately after cancellation. This preview expires after 5 minutes.</Text>
            </>}
          </>}
          {!loading && !busy && (!preview || !preview.eligible || !!error) && <TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={() => setRetry(value => value + 1)}><Text style={styles.secondaryText}>Reload preview</Text></TouchableOpacity>}
          {preview?.eligible && <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy || loading }} disabled={busy || loading} style={[styles.primary, busy && styles.disabled]} onPress={confirm}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Confirm Cancellation</Text>}</TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={onClose}><Text style={styles.secondaryText}>Keep Booking</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}
function Row({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,10,25,0.55)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  content: { padding: 24, paddingBottom: 40, gap: 15 }, title: { fontSize: 23, fontWeight: '800', color: '#3D1233' },
  vendor: { fontSize: 17, fontWeight: '700', color: '#7B2869' }, hint: { color: '#765B70', fontSize: 13, lineHeight: 20 },
  summary: { backgroundColor: '#FBF4F8', borderRadius: 16, padding: 15 }, row: { flexDirection: 'row', gap: 15, justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { flex: 1, fontSize: 13, color: '#765B70' }, rowValue: { flex: 1, fontSize: 14, fontWeight: '700', textAlign: 'right', color: '#3D1233' },
  label: { fontWeight: '700', color: '#3D1233' }, input: { borderWidth: 1, borderColor: '#E9D5E3', borderRadius: 12, padding: 12, minHeight: 90, color: '#3D1233' },
  error: { backgroundColor: '#FFF0F1', padding: 12, borderRadius: 12 }, errorText: { color: '#A9273B', fontSize: 14, lineHeight: 21 },
  primary: { backgroundColor: '#A9273B', padding: 16, borderRadius: 13, alignItems: 'center' }, primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: '#E9D5E3', padding: 14, borderRadius: 13, alignItems: 'center' }, secondaryText: { color: '#7B2869', fontWeight: '700' }, disabled: { opacity: 0.6 },
});
