import { formatBookingDateTime } from './bookingTimezone';
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
  add(booking.paymentStatus === 'PAYMENT_EXPIRED' ? 'Payment expired' : 'Request expired', booking.expiredAt, status === 'expired');
  add('No longer assigned', booking.replacementFinalizedAt, unassigned);
  return rows;
}
export function formatBookingActivityTime(value: string | null, timeZone?: string): string {
  return formatBookingDateTime(value, timeZone, 'Time not recorded');
}

export function groupedBookingActivity(bookings: (BookingActivityRecord & { serviceName?: string })[], cancellationDetailsVisible = false) {
  const groups = new Map<string, { label: string; at: string | null; packages: string[] }>();
  for (const booking of bookings) {
    for (const row of bookingActivity(booking, cancellationDetailsVisible)) {
      const minute = row.at ? Math.floor(Date.parse(row.at) / 60_000) : 'unknown';
      const key = `${row.label}-${minute}`;
      const group = groups.get(key) ?? { ...row, packages: [] };
      group.packages.push(booking.serviceName || 'Package');
      groups.set(key, group);
    }
  }
  return Array.from(groups, ([key, group]) => ({
    key,
    ...group,
    packages: bookings.length > 1 && (group.packages.length !== bookings.length || !group.at)
      ? group.packages
      : [],
  }));
}
