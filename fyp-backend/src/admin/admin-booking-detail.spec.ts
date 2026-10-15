import { Types } from 'mongoose';
import { AdminService } from './admin.service';
const query = (value: unknown): any => {
    const q: any = { populate: jest.fn(() => q), sort: jest.fn(() => q), lean: jest.fn(async () => value) };
    return q;
};
describe('Admin booking cancellation and financial detail', () => {
    it('returns the existing payment/refund records using the loaded canonical booking ID', async () => {
        const bookingId = new Types.ObjectId();
        const booking = { _id: bookingId, status: 'cancelled', cancelledBy: 'organizer', cancellationReason: 'Testing purpose', cancelledAt: new Date() };
        const payments = [{ vendorOrderId: bookingId, amount: 2000, status: 'SUCCESS', type: 'DOWN_PAYMENT' }];
        const refund = { vendorOrderId: bookingId, amountPaid: 2000, refundAmount: 0, withheldAmount: 2000, status: 'PENDING' };
        const vendorModel = { findById: jest.fn(() => query(booking)) };
        const paymentModel = { find: jest.fn(() => query(payments)) };
        const refundModel = { findOne: jest.fn(() => query(refund)) };
        const payoutModel = { findOne: jest.fn(() => query(null)) };
        const service = new AdminService(vendorModel as any, { findOne: () => query({}) } as any, paymentModel as any, payoutModel as any, refundModel as any, {} as any);
        const result = await service.getBookingDetail(bookingId.toHexString().toUpperCase());
        expect(result).toMatchObject({ vendorOrder: booking, payments, refund });
        expect(paymentModel.find).toHaveBeenCalledWith({ vendorOrderId: bookingId });
        expect(refundModel.findOne).toHaveBeenCalledWith({ vendorOrderId: bookingId });
        expect(payoutModel.findOne).toHaveBeenCalledWith({ vendorOrderId: bookingId });
    });
    it('does not query unrelated financial records for a missing booking', async () => {
        const paymentModel = { find: jest.fn() };
        const service = new AdminService({ findById: () => query(null) } as any, {} as any, paymentModel as any, {} as any, {} as any, {} as any);
        expect(await service.getBookingDetail(new Types.ObjectId().toString())).toBeNull();
        expect(paymentModel.find).not.toHaveBeenCalled();
    });
});
