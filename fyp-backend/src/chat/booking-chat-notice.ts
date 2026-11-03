import type { Order } from '../schemas/order.schema';
import type { VendorOrder } from '../schemas/vendor-order.schema';

export type BookingChatOrder = Pick<Order, 'organizerId' | 'eventName' | 'eventDate' | 'eventStartDateTime'>;
export type BookingChatLine = Pick<VendorOrder, '_id' | 'vendorId' | 'serviceName' | 'eventStartDateTime' | 'eventEndDateTime' | 'bookingType' | 'bookingChatTimeZone' | 'bookingChatService'>;
export type BookingChatStage = 'requested' | 'confirmed';

export function formatBookingNotice(order: BookingChatOrder, booking: BookingChatLine, stage: BookingChatStage) {
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
    return [
        stage === 'confirmed'
            ? `Booking confirmed for ${order.eventName} on ${eventDate}.`
            : `Booking request sent for ${order.eventName} on ${eventDate}.`,
        booking.bookingChatService && `Service: ${booking.bookingChatService}`,
        `Package: ${booking.serviceName}`,
        schedule,
    ].filter(Boolean).join('\n');
}
