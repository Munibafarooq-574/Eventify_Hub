import { formatBookingDateTime } from './bookingTimezone';
export type CancellationRecord = {
  status?: string | null;
  cancelledBy?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | Date | null;
};

// Present only persisted facts. Legacy records must not invent a cancelling actor.
export function bookingCancellation(record: CancellationRecord, timeZone = 'UTC') {
  const status = String(record.status || '').toLowerCase();
  if (!['cancelled', 'cancelled_by_vendor'].includes(status)) return null;
  const actor = String(record.cancelledBy || '').trim().toLowerCase();
  const cancelledBy = ['organizer', 'client'].includes(actor) ? 'Client'
    : actor === 'vendor' || (!actor && status === 'cancelled_by_vendor') ? 'Vendor'
    : actor === 'admin' ? 'Admin' : 'Not recorded';
  const reason = record.cancellationReason?.trim() || 'No reason provided';
  const cancelledAt = formatBookingDateTime(record.cancelledAt, timeZone, 'Not recorded');
  return { cancelledBy, reason, cancelledAt };
}

// Round down exactly as the cancellation preview did before; only the units change.
export function formatNoticeHours(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return 'Not available';
  const total = Math.max(0, Math.floor(value));
  const days = Math.floor(total / 24);
  const hours = total % 24;
  return [days ? `${days} ${days === 1 ? 'day' : 'days'}` : '',
    hours || !days ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : '']
    .filter(Boolean).join(' ');
}
