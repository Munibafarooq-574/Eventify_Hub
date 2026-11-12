import { currencySymbol } from '../common/utils/currency';
import type { Order } from '../schemas/order.schema';
import type { VendorOrder } from '../schemas/vendor-order.schema';

export type BookingChatOrder = Pick<Order, 'organizerId' | 'eventName' | 'eventDate' | 'eventStartDateTime'>;
export type BookingChatLine = { currency?: string } & Pick<VendorOrder, '_id' | 'vendorId' | 'serviceName' | 'eventStartDateTime' | 'eventEndDateTime' | 'bookingType' | 'bookingChatTimeZone' | 'bookingChatService' | 'quantity' | 'pricingMethod' | 'personCount' | 'groupSize' | 'capacityUnit'>;
export type BookingChatStage = 'requested' | 'confirmed' | 'completed' | 'cancelled';

export type BookingChatPayment = { amount: number; remainingAmount: number };

export function formatBookingNotice(
    order: BookingChatOrder, booking: BookingChatLine, stage: BookingChatStage, payment?: BookingChatPayment,
) {
    const timeZone = booking.bookingChatTimeZone ?? 'UTC';
    const formatDate = (date: Date, zone: string) => new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'long', timeZone: zone,
    }).format(date);
    const eventDate = order.eventStartDateTime
        ? formatDate(order.eventStartDateTime, timeZone)
        : formatDate(order.eventDate, 'UTC');
    const time = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
    const start = booking.eventStartDateTime;
    const end = booking.eventEndDateTime;
    const formatTime = (date: Date) => {
        const day = formatDate(date, timeZone);
        return day === eventDate ? time.format(date) : `${day}, ${time.format(date)}`;
    };
    const schedule = start && (booking.bookingType === 'DELIVERY_BASED'
        ? `Delivery: ${formatTime(start)}`
        : end && `Time: ${formatTime(start)} – ${formatTime(end)}`);
    const people = booking.personCount;
    const peopleLabel = people != null && Number.isSafeInteger(people) && people > 0
        ? `${people} ${people === 1 ? 'person' : 'people'}` : '';
    const quantity = booking.quantity;
    const unit = booking.capacityUnit === 'VEHICLE' ? 'vehicle' :
        booking.capacityUnit === 'TEAM' ? 'team' : booking.capacityUnit === 'SETUP' ? 'setup' : '';
    const groups = quantity != null ? `${quantity} ${quantity === 1 ? 'group' : 'groups'}` : '';
    const selection = booking.pricingMethod === 'GROUP'
        ? [peopleLabel && `People receiving this service: ${peopleLabel}`, groups].filter(Boolean).join(' · ')
        : booking.pricingMethod === 'PER_PERSON' && peopleLabel
            ? `People receiving this service: ${peopleLabel}`
            : quantity != null && `Quantity: ${quantity}${unit ? ` ${unit}${quantity === 1 ? '' : 's'}` : ''}`;
    return [
        `Booking ${stage === 'requested' ? 'request sent' : stage} for ${order.eventName} on ${eventDate}.`,
        payment && `Down payment received for ${order.eventName}.`,
        payment && `Amount: ${currencySymbol(booking.currency)} ${payment.amount.toLocaleString('en-PK')}`,
        payment && `Remaining: ${currencySymbol(booking.currency)} ${payment.remainingAmount.toLocaleString('en-PK')}`,
        stage === 'cancelled' && 'The vendor has cancelled this booking. Your payment/refund information is available in the booking details.',
        booking.bookingChatService && `Service: ${booking.bookingChatService}`,
        `Package: ${booking.serviceName}`,
        selection,
        schedule,
        schedule && `Times shown in ${timeZone}`,
    ].filter(Boolean).join('\n');
}
