import { formatNoticeHours } from '@/utils/bookingCancellation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < 360 || fontScale >= 1.4;
  const scroll = useRef<ScrollView>(null);
  const reasonTop = useRef(0);
  const reasonFocused = useRef(false);
  const frame = useRef<number | null>(null);
  const revealReason = useCallback(() => {
    if (!reasonFocused.current) return;
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      scroll.current?.scrollTo({ y: Math.max(0, reasonTop.current - 12), animated: true });
    });
  }, []);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', revealReason);
    return () => {
      shown.remove();
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [revealReason]);
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
    if (confirming.current || !preview?.eligible || !preview.previewToken || !reason.trim()) return;
    Keyboard.dismiss();
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
    <View style={[styles.backdrop, {
      paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 12),
      paddingLeft: insets.left + (width >= 600 ? 24 : 12),
      paddingRight: insets.right + (width >= 600 ? 24 : 12),
    }]}>
    <KeyboardAvoidingView style={styles.keyboardArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>Review Cancellation</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close cancellation review" disabled={busy} onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
        <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={[styles.content, compact && styles.compactContent]} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} onLayout={revealReason} contentInsetAdjustmentBehavior="never">
          <Text style={styles.vendor}>{vendorName}</Text>
          <Text style={styles.hint}>Only this vendor booking will be cancelled. Your other vendor bookings will remain unchanged.</Text>
          {loading && <ActivityIndicator size="large" color="#7B2869" accessibilityLabel="Loading cancellation preview" />}
          {!!error && <View accessibilityRole="alert" style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}
          {!loading && preview && <>
            <View style={styles.summary}>
              <Row stacked={compact} label="Amount paid" value={money(preview.amountPaid)} />
              <Row stacked={compact} label="Saved policy" value={preview.cancellationPolicyApplied || 'Not available'} />
              {preview.eligible && <>
                <Row stacked={compact} label="Notice before service" value={formatNoticeHours(preview.hoursBeforeEvent)} />
                <Row stacked={compact} label="Applicable refund" value={`${preview.refundPercentage}%`} />
                <Row stacked={compact} label="Estimated refund" value={money(preview.refundAmount)} />
                <Row stacked={compact} label="Amount retained" value={money(preview.withheldAmount)} />
                <Row stacked={compact} label="Saved policy revision" value={String(preview.policyRevision)} />
              </>}
            </View>
            {!preview.eligible && <Text style={styles.errorText}>{preview.message || 'This booking cannot be cancelled here.'}</Text>}
            {preview.eligible && <>
              <View style={styles.reason} onLayout={event => { reasonTop.current = event.nativeEvent.layout.y; }}>
                <Text style={styles.label}>Reason for cancellation (required)</Text>
                <TextInput accessibilityLabel="Reason for cancellation" value={reason} onChangeText={setReason} maxLength={500} multiline scrollEnabled editable={!busy} style={styles.input} placeholder="Tell us why you are cancelling" placeholderTextColor="#887781" textAlignVertical="top" onFocus={() => { reasonFocused.current = true; revealReason(); }} onBlur={() => { reasonFocused.current = false; }} />
                <Text style={styles.counter}>{reason.length}/500</Text>
              </View>
              <Text style={styles.hint}>Review the amounts before confirming. Any refund is processed separately after cancellation. This preview expires after 5 minutes.</Text>
            </>}
          </>}
          {!loading && !busy && (!preview || !preview.eligible || !!error) && <TouchableOpacity accessibilityRole="button" style={styles.secondary} onPress={() => setRetry(value => value + 1)}><Text style={styles.secondaryText}>Reload preview</Text></TouchableOpacity>}
          {preview?.eligible && <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: busy || loading || !reason.trim() }} disabled={busy || loading || !reason.trim()} style={[styles.primary, (busy || loading || !reason.trim()) && styles.disabled]} onPress={confirm}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Confirm Cancellation</Text>}</TouchableOpacity>}
          <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.secondary} onPress={onClose}><Text style={styles.secondaryText}>Keep Booking</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
    </View>
  </Modal>;
}
function Row({ label, value, stacked }: { label: string; value: string; stacked: boolean }) {
  return <View style={[styles.row, stacked && styles.stackedRow]}><Text style={[styles.rowLabel, stacked && styles.stackedText]}>{label}</Text><Text style={[styles.rowValue, stacked && styles.stackedText, stacked && styles.stackedValue]}>{value}</Text></View>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(30,10,25,0.55)' },
  keyboardArea: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 640, height: '94%', flexShrink: 1, minHeight: 0, backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E9D5E3' },
  title: { flex: 1, flexShrink: 1, fontSize: 21, fontWeight: '800', color: '#3D1233' },
  close: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  closeText: { fontSize: 14, fontWeight: '700', color: '#7B2869' },
  scroll: { flex: 1, minHeight: 0 },
  content: { padding: 20, paddingBottom: 24, gap: 16 }, compactContent: { paddingHorizontal: 14 },
  vendor: { fontSize: 17, fontWeight: '700', color: '#7B2869' }, hint: { color: '#765B70', fontSize: 13, lineHeight: 20 },
  summary: { backgroundColor: '#FBF4F8', borderRadius: 16, padding: 15 }, row: { flexDirection: 'row', gap: 15, justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { flex: 1, fontSize: 13, color: '#765B70' }, rowValue: { flex: 1, fontSize: 14, fontWeight: '700', textAlign: 'right', color: '#3D1233' },
  stackedRow: { flexDirection: 'column', gap: 4 }, stackedText: { flex: 0 }, stackedValue: { textAlign: 'left' },
  reason: { gap: 10 }, counter: { textAlign: 'right', fontSize: 12, color: '#765B70' },
  label: { fontWeight: '700', color: '#3D1233' }, input: { borderWidth: 1, borderColor: '#E9D5E3', borderRadius: 12, padding: 12, minHeight: 104, maxHeight: 180, fontSize: 16, lineHeight: 24, color: '#3D1233' },
  error: { backgroundColor: '#FFF0F1', padding: 12, borderRadius: 12 }, errorText: { color: '#A9273B', fontSize: 14, lineHeight: 21 },
  primary: { backgroundColor: '#A9273B', padding: 16, borderRadius: 13, alignItems: 'center' }, primaryText: { color: '#fff', fontWeight: '800' },
  secondary: { borderWidth: 1, borderColor: '#E9D5E3', padding: 14, borderRadius: 13, alignItems: 'center' }, secondaryText: { color: '#7B2869', fontWeight: '700' }, disabled: { opacity: 0.6 },
});
