import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { VendorCancellationPreview } from '@/services/getVendorCancellationPreview';

export default function VendorCancellationSummary({ order, booking, preview }: {
  order: any; booking: any; preview: VendorCancellationPreview;
}) {
  const pkg = booking?.vendorId?.packages?.find((item: any) => String(item._id) === String(booking.packageId));
  const client = order?.organizerId;
  const zone = order?.eventCityId?.timeZone;
  const date = (value: unknown) => {
    if (!value) return 'Not recorded';
    const parsed = new Date(value as string);
    return Number.isFinite(parsed.getTime()) ? parsed.toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
      ...(zone ? { timeZone: zone } : {}),
    }) : 'Not recorded';
  };
  const money = (value: number) => Number.isFinite(value) ? `Rs. ${value.toLocaleString('en-PK')}` : 'Not recorded';
  const delivery = pkg?.bookingType === 'DELIVERY_BASED';
  const sections: { title: string; rows: [string, any][] }[] = [
    { title: 'Booking & package', rows: [
      ['Booking reference', booking?._id], ['Booked on', date(order?.createdAt)],
      ['Package name', pkg?.packageName || booking?.serviceName],
      ['Category', booking?.vendorId?.buisnessCategory?.name],
      ['Included services (current package details)', pkg?.services],
      ['Service type', pkg?.bookingType?.replace(/_/g, ' ')],
    ] },
    { title: 'Event details', rows: [
      ['Event name', order?.eventName], ['Event type', order?.eventType],
      ['Event starts', date(order?.eventStartDateTime)], ['Event ends', date(order?.eventEndDateTime)],
      ['Event duration', order?.eventDurationMinutes ? `${order.eventDurationMinutes / 60} hours` : null],
      ['Guests', order?.guests], ['City', order?.eventCityId?.name || order?.eventCity], ['Address', order?.eventAddress],
      [delivery ? 'Delivery at' : 'Service starts', date(booking?.eventStartDateTime)],
      ...(!delivery ? [['Service ends', date(booking?.eventEndDateTime)] as [string, any]] : []),
      ['Timezone', zone || 'Device local time'],
    ] },
    { title: 'Client details', rows: [
      ['Name', client?.name], ['Email', client?.email], ['Phone', client?.phone || client?.phone_number],
    ] },
    { title: 'Payment & cancellation estimate', rows: [
      ['Payment status', booking?.paymentStatus?.replace(/_/g, ' ')],
      ['Booking amount', money(preview.bookingAmount)], ['Amount paid', money(preview.amountPaid)],
      ['Unpaid balance before cancellation', money(preview.remainingAmount)],
      ['Client refund', `${money(preview.refundAmount)} (${preview.refundPercentage}%)`],
      ['Amount retained from client payment', money(preview.withheldAmount)],
      ['Vendor penalty (separate)', `${money(preview.penaltyAmount)} (${preview.penaltyPercentage}%)`],
      ...(preview.payments || []).flatMap((payment, index): [string, any][] => [
        [`Payment ${index + 1} type`, payment.type?.replace(/_/g, ' ')],
        [`Payment ${index + 1} method`, payment.method], [`Payment ${index + 1} amount`, money(payment.amount)],
        [`Payment ${index + 1} confirmed at`, date(payment.paidAt)],
      ]),
      ['Saved policy revision', preview.policyRevision], ['Calculated at', date(preview.calculatedAt)],
    ] },
  ];
  return <View style={styles.wrapper}>{sections.map(section => <View key={section.title} style={styles.section}>
    <Text style={styles.title}>{section.title}</Text>
    {section.rows.map(([label, value]) => <View key={label} style={styles.row}>
      <Text style={styles.label}>{label}</Text><Text style={styles.value}>{value === undefined || value === null || value === '' ? 'Not recorded' : String(value)}</Text>
    </View>)}
  </View>)}
    <Text style={styles.note}>No cancellation has been made yet. Amounts are checked again when you confirm. The vendor penalty is separate from the client refund. Refund settlement is tracked after cancellation.</Text>
  </View>;
}
const styles = StyleSheet.create({
  wrapper: { gap: 12 }, section: { padding: 14, backgroundColor: '#FBF4F8', borderRadius: 12, borderWidth: 1, borderColor: '#EEDDE7', gap: 8 },
  title: { fontSize: 15, fontWeight: '800', color: '#780C60', marginBottom: 4 },
  row: { gap: 3 }, label: { color: '#79616F', fontSize: 12 }, value: { color: '#34212D', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  note: { fontSize: 12, lineHeight: 18, color: '#69535F' },
});
