import { formatBookingNotice } from './booking-chat-notice';

describe('event-city booking notice schedule', () => {
  const order = { eventName: 'Test-1', eventDate: new Date('2026-11-12T00:00:00Z'), eventStartDateTime: new Date('2026-11-12T23:00:00Z') } as any;
  const booking = { serviceName: 'Catering', bookingChatTimeZone: 'America/Los_Angeles', eventStartDateTime: new Date('2026-11-12T23:00:00Z'), eventEndDateTime: new Date('2026-11-13T01:00:00Z') } as any;
  it.each(['requested', 'confirmed', 'completed', 'cancelled'] as const)('uses the event city for %s notices without shifting the day', stage => {
    const notice = formatBookingNotice(order, booking, stage);
    expect(notice).toContain('on 12 November.');
    expect(notice).toContain('Time: 3:00 PM – 5:00 PM');
    expect(notice).toContain('Times shown in America/Los_Angeles');
  });
  it('includes the local service day when a service crosses midnight', () => {
    const notice = formatBookingNotice(order, { ...booking, eventEndDateTime: new Date('2026-11-13T09:00:00Z') }, 'requested');
    expect(notice).toContain('Time: 3:00 PM – 13 November, 1:00 AM');
  });
});
