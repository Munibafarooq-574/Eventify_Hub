import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ClientRefund } from '@/services/getClientRefunds';
import { bookingCancellation, type CancellationRecord } from '@/utils/bookingCancellation';

export default function BookingCancellationDetails({ booking, refundState }: {
  booking: CancellationRecord;
  refundState?: { record?: ClientRefund; loading: boolean; error: boolean };
}) {
  const details = bookingCancellation(booking);
  if (!details) return null;
  return <><View style={styles.box}>
    <Text style={styles.title}>Cancellation details</Text>
    <Text style={styles.text}><Text style={styles.label}>Cancelled by: </Text>{details.cancelledBy}</Text>
    <Text style={styles.text}><Text style={styles.label}>Reason: </Text>{details.reason}</Text>
    <Text style={styles.text}><Text style={styles.label}>Cancelled at: </Text>{details.cancelledAt}</Text>
  </View>
  {refundState && <RefundDetails {...refundState} />}
  </>;
}
function RefundDetails({ record, loading, error }: { record?: ClientRefund; loading: boolean; error: boolean }) {
  const status = record?.status;
  const noRefund = record?.refundAmount === 0 && status !== 'REFUNDED';
  const labels: Record<string, string> = { PENDING: 'Pending review', PROCESSING: 'Processing', REFUNDED: 'Refund confirmed', REJECTED: 'Rejected', NO_REFUND_DUE: 'No refund due' };
  const messages: Record<string, string> = {
    PENDING: 'Your refund request has been received and is awaiting review.',
    PROCESSING: 'Your refund is being processed. Repayment has not yet been confirmed.',
    REFUNDED: 'Your refund settlement has been confirmed.',
    REJECTED: 'Your refund request was rejected.',
    NO_REFUND_DUE: 'This case is closed. No money is refundable under the recorded cancellation policy.',
  };
  const money = (value: number) => Number.isFinite(value) ? `Rs. ${value.toLocaleString('en-PK')}` : 'Not available';
  const timestamp = status === 'REFUNDED' ? record?.refundedAt || record?.paidAt
    : status === 'REJECTED' ? record?.rejectedAt : status === 'NO_REFUND_DUE' ? record?.closedAt : record?.updatedAt;
  const date = timestamp ? new Date(timestamp) : null;
  const dateLabel = date && Number.isFinite(date.getTime()) ? date.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  }) : null;
  return <View style={styles.refundBox} accessibilityLiveRegion="polite">
    <Text style={styles.refundTitle}>Refund update</Text>
    {!record ? <Text style={styles.text}>{loading ? 'Loading refund details…' : error ? 'Unable to load refund details. Pull down to retry.' : 'No refund record is available for this booking.'}</Text> : <>
      <Text style={[styles.status, status === 'REFUNDED' && styles.confirmed]}>{noRefund ? 'No refund due' : labels[status || ''] || 'Status unavailable'}</Text>
      <Text style={styles.text}><Text style={styles.label}>Amount paid: </Text>{money(record.amountPaid)}</Text>
      <Text style={styles.text}><Text style={styles.label}>Refund amount: </Text>{money(record.refundAmount)}</Text>
      <Text style={styles.text}><Text style={styles.label}>Amount retained: </Text>{money(record.withheldAmount)}</Text>
      <Text style={styles.text}>{noRefund && status !== 'NO_REFUND_DUE'
        ? 'No refund is due under the recorded cancellation policy. Case closure is awaiting review.'
        : messages[status || ''] || 'Pull down to check the latest refund status.'}</Text>
      {status === 'REJECTED' && <Text style={styles.text}><Text style={styles.label}>Reason: </Text>{record.rejectionReason || 'Not recorded. Please contact support for details.'}</Text>}
      {!!dateLabel && <Text style={styles.text}><Text style={styles.label}>{status === 'REFUNDED' ? 'Confirmed at: ' : 'Updated at: '}</Text>{dateLabel}</Text>}
      {error && <Text style={styles.text}>Showing the last loaded update. Pull down to retry.</Text>}
    </>}
  </View>;
}
const styles = StyleSheet.create({
  box: { alignSelf: 'stretch', marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#FFF1F3', borderWidth: 1, borderColor: '#F1CFD6', gap: 5 },
  title: { color: '#8C2940', fontWeight: '800', fontSize: 13, marginBottom: 2 },
  refundBox: { alignSelf: 'stretch', marginTop: 10, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E4D5E3', backgroundColor: '#FBF7FC', gap: 7 },
  refundTitle: { fontSize: 14, fontWeight: '800', color: '#632052' },
  status: { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#EEE6FA', color: '#632052', fontWeight: '700', fontSize: 12, overflow: 'hidden' },
  confirmed: { backgroundColor: '#E4F5EA', color: '#246941' },
  label: { fontWeight: '700' }, text: { color: '#5F3041', fontSize: 12, lineHeight: 19 },
});
