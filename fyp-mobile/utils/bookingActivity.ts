export type BookingActivityRecord = {
  status?: string; paymentStatus?: string; replacementOutcome?: string;
  createdAt?: string | null; acceptedAt?: string | null; confirmationTime?: string | null;
  cancelledAt?: string | null; rejectedAt?: string | null; completedAt?: string | null;
  expiredAt?: string | null; replacementFinalizedAt?: string | null;
};
export function bookingActivity(booking: BookingActivityRecord, cancellationDetailsVisible = false) {
  const rows: { label: string; at: string | null }[] = [];
  const add = (label: string, value: string | null | undefined, required = false) => {
    const at = value && Number.isFinite(new Date(value).getTime()) ? value : null;
    if (at || required) rows.push({ label, at });
  };
  const status = String(booking.status || '').toLowerCase();
  const unassigned = booking.replacementOutcome === 'NO_LONGER_ASSIGNED';
  add('Requested', booking.createdAt, status === 'pending');
  add('Accepted / Processing', booking.acceptedAt, status === 'accepted');
  add('Confirmed', booking.confirmationTime, ['PARTIALLY_PAID', 'PAID'].includes(booking.paymentStatus || ''));
  // The existing cancellation panel owns this row where it is already visible.
  if (!cancellationDetailsVisible) add('Cancelled', booking.cancelledAt, ['cancelled', 'cancelled_by_vendor'].includes(status));
  add('Rejected', booking.rejectedAt, status === 'rejected' && !unassigned);
  add('Completed', booking.completedAt, status === 'completed');
  add(booking.paymentStatus === 'PAYMENT_EXPIRED' ? 'Payment expired' : 'Expired', booking.expiredAt, status === 'expired');
  add('No longer assigned', booking.replacementFinalizedAt, unassigned);
  return rows;
}
export function formatBookingActivityTime(value: string | null, timeZone?: string): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'Time not recorded';
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  };
  try { return new Date(value).toLocaleString('en-GB', { ...options, ...(timeZone ? { timeZone } : {}) }); }
  catch { return new Date(value).toLocaleString('en-GB', options); }
}
