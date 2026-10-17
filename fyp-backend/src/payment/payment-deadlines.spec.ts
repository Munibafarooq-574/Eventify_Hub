import { PaymentService } from './payment.service';

describe('Payment deadline lifecycle', () => {
    it.each([1500, 3000])('clears the advance deadline after successful payment totaling %s', async totalPaid => {
        const payment = { status: 'PENDING', vendorOrderId: 'booking', organizerId: 'client', amount: 1500, save: jest.fn() };
        const remainingDeadline = new Date('2026-11-10T07:00:00Z');
        const booking: any = { _id: 'booking', status: 'accepted', price: 3000, paymentDeadline: new Date(), holdExpiresAt: new Date(), remainingPaymentDeadline: remainingDeadline, save: jest.fn() };
        const service: any = Object.create(PaymentService.prototype);
        service.paymentModel = { findById: jest.fn().mockResolvedValue(payment), find: jest.fn(() => ({ lean: async () => [{ amount: totalPaid }] })) };
        service.vendorOrderModel = { findById: jest.fn().mockResolvedValue(booking) };
        service.userModel = { findById: () => ({ select: () => ({ lean: async () => null }) }) };
        service.orderModel = { findById: () => ({ lean: async () => null }) };
        await service.confirmPayment('payment');
        expect(booking.paymentDeadline).toBeNull();
        expect(booking.holdExpiresAt).toBeNull();
        expect(booking.paymentStatus).toBe(totalPaid === 3000 ? 'PAID' : 'PARTIALLY_PAID');
        expect(booking.remainingPaymentDeadline).toEqual(totalPaid === 3000 ? null : remainingDeadline);
        expect(booking.save).toHaveBeenCalledTimes(1);
    });
    it('blocks the remaining-payment endpoint before service completion', async () => {
        const service: any = Object.create(PaymentService.prototype);
        service.vendorOrderModel = { findById: async () => ({ status: 'accepted', paymentStatus: 'PARTIALLY_PAID' }) };
        service.assertOrganizerOwnsVendorOrder = async () => ({});
        await expect(service.initiateRemainingPayment('booking', 'CARD', 'client')).rejects.toThrow('only after');
    });
});
