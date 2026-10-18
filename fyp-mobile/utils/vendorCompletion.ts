// Mirrors the existing server completion guard; the server remains authoritative.
export function canCompleteVendorBooking(booking: any, now = Date.now()): boolean {
  if (booking?.status !== 'accepted' || booking?.replacementOutcome === 'NO_LONGER_ASSIGNED' ||
      !['PARTIALLY_PAID', 'PAID'].includes(booking?.paymentStatus)) return false;
  const pkg = booking.vendorId?.packages?.find((item: any) => String(item._id) === String(booking.packageId));
  const value = pkg?.bookingType === 'DELIVERY_BASED' ? booking.eventStartDateTime : booking.eventEndDateTime;
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp <= now;
}
