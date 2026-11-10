// Calendar dates and wall-clock input are not UTC instants. Keep them separate.
export function validTimeZone(value?: string): string {
  try { if (value) { new Intl.DateTimeFormat('en', { timeZone: value }); return value; } } catch {}
  return 'UTC';
}
export function bookingTimeZone(order: any): string {
  return validTimeZone(order?.eventCityId?.timeZone || order?.eventTimeZone ||
    order?.bookingChatTimeZone || order?.vendorOrders?.find((v: any) => v.bookingChatTimeZone)?.bookingChatTimeZone);
}
export function formatBookingDate(value?: string | Date, timeZone = 'UTC'): string {
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'N/A';
  return new Date(value).toLocaleDateString('en-GB', { timeZone: validTimeZone(timeZone), day: 'numeric', month: 'short', year: 'numeric' });
}
export function formatCalendarDate(value?: string | Date): string { return formatBookingDate(value, 'UTC'); }
export function formatBookingTime(value?: string | Date, timeZone = 'UTC'): string {
  if (typeof value === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(value)) {
    const [h, m] = value.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  }
  if (!value || !Number.isFinite(new Date(value).getTime())) return 'N/A';
  return new Date(value).toLocaleTimeString('en-US', { timeZone: validTimeZone(timeZone), hour: 'numeric', minute: '2-digit', hour12: true });
}
export function bookingDateKey(value: string | Date, timeZone = 'UTC'): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: validTimeZone(timeZone), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const part = (key: string) => parts.find(p => p.type === key)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
// Resolve event-city wall input without consulting the phone timezone. Like the
// API, reject DST gaps and repeated times rather than silently choosing a slot.
export function eventLocalDateTime(date: string, time: string, timeZone: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return new Date(NaN);
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: validTimeZone(timeZone), year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const matches: number[] = [];
  for (let offset = -14 * 60; offset <= 12 * 60; offset += 15) {
    const instant = naive + offset * 60000;
    const parts = fmt.formatToParts(new Date(instant));
    const part = (key: string) => Number(parts.find(p => p.type === key)?.value);
    if (part('year') === year && part('month') === month && part('day') === day && part('hour') === hour && part('minute') === minute) matches.push(instant);
  }
  return new Date(matches.length === 1 ? matches[0] : NaN);
}
