/** Display helpers only; API policy thresholds remain expressed in hours. */
export function formatDurationMinutes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value < 0) return 'N/A';
  const total = Math.floor(value);
  const days = Math.floor(total / 1440);
  const hours = Math.floor((total % 1440) / 60);
  const minutes = total % 60;
  return [[days, 'day'], [hours, 'hour'], [minutes, 'minute']]
    .filter(([amount]) => Number(amount) > 0)
    .map(([amount, unit]) => `${amount} ${unit}${amount === 1 ? '' : 's'}`).join(' ') || '0 hours';
}
export function formatNoticeHours(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours)) return 'N/A';
  return formatDurationMinutes(Math.max(0, Math.floor(hours)) * 60);
}
export function eventDurationLabel(order?: {
  eventDurationMinutes?: number | string | null;
  eventStartDateTime?: string | null;
  eventEndDateTime?: string | null;
  eventDuration?: number | string | null;
} | null): string {
  const raw = order?.eventDurationMinutes;
  const minutes = raw == null || raw === '' ? NaN : Number(raw);
  if (Number.isFinite(minutes) && minutes > 0) return formatDurationMinutes(minutes);
  if (order?.eventStartDateTime && order.eventEndDateTime) {
    const span = (Date.parse(order.eventEndDateTime) - Date.parse(order.eventStartDateTime)) / 60000;
    if (Number.isFinite(span) && span > 0) return formatDurationMinutes(span);
  }
  // Legacy display value only; never substitute a vendor's service window.
  return order?.eventDuration != null && String(order.eventDuration).trim()
    ? String(order.eventDuration) : 'N/A';
}
