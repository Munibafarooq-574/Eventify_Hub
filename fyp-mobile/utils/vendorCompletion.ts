export function getVendorCompletionTime(booking: any): number | null {
  const pkg = booking?.vendorId?.packages?.find((item: any) => String(item._id) === String(booking.packageId));
  const value = (booking?.bookingType || pkg?.bookingType) === 'DELIVERY_BASED'
    ? booking?.eventStartDateTime : booking?.eventEndDateTime;
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

// Mirrors the existing server completion guard; the server remains authoritative.
export function canCompleteVendorBooking(booking: any, now = Date.now()): boolean {
  if (booking?.status !== 'accepted' || booking?.replacementOutcome === 'NO_LONGER_ASSIGNED' ||
      !['PARTIALLY_PAID', 'PAID'].includes(booking?.paymentStatus)) return false;
  const timestamp = getVendorCompletionTime(booking);
  return timestamp !== null && timestamp <= now;
}

export function isFullyPaidVendorOrder(order: any): boolean {
  const bookings = (order?.vendorOrders || []).filter((booking: any) =>
    booking.replacementOutcome !== 'NO_LONGER_ASSIGNED');
  return bookings.length > 0 && bookings.every((booking: any) =>
    booking.status === 'completed' && booking.paymentStatus === 'PAID' && booking.remainingAmount === 0);
}
