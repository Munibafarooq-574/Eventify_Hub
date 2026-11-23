jest.mock('@nestjs/schedule', () => ({ Cron: () => () => undefined }));
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrderService } from './order.service';

const query = <T>(result: T) => ({ session: async () => result });

function fixture() {
    const vendorId = new Types.ObjectId();
    const order = { _id: new Types.ObjectId(), eventCityId: new Types.ObjectId(), status: 'pending' };
    const date = (hour: number) => new Date(Date.UTC(2099, 0, 10, hour));
    const bookings = ['Bridal henna', 'Guest Henna Bar'].map((serviceName, index) => ({
        _id: new Types.ObjectId(), vendorId, orderId: order._id, serviceName, status: 'pending',
        eventStartDateTime: date(15 + index), eventEndDateTime: date(18),
    }));
    const session = { withTransaction: jest.fn(async work => work()), endSession: jest.fn() };
    const service = Object.assign(Object.create(OrderService.prototype), {
        assertVendorBookingOwner: jest.fn(async () => bookings[0]),
        assertNoEventReschedule: jest.fn(),
        cityService: { requireCityTimeZone: jest.fn(async () => 'UTC') },
        connection: { startSession: jest.fn(async () => session) },
        orderModel: { findById: jest.fn(() => ({ ...query(order), then: (fn: any) => fn(null) })) },
        userModel: { updateOne: jest.fn() },
        vendorOrderModel: {
            exists: jest.fn(() => query(null)), updateMany: jest.fn(), updateOne: jest.fn(),
            find: jest.fn(() => query(bookings)),
        },
        pendingProposalBookings: jest.fn(async () => bookings),
        assertVendorPackageSlot: jest.fn(),
        updateVendorResponse: jest.fn(),
        notifyLaterTimeDecision: jest.fn(),
    });
    return { service, bookings, session };
}

describe('vendor package groups', () => {
    it('uses a single transaction and reports the failing package before sending notifications', async () => {
        const { service, bookings, session } = fixture();
        service.assertVendorPackageSlot.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new ConflictException('Slot unavailable'));
        await expect(service.acceptPendingVendorPackages(String(bookings[0]._id), {}, bookings.map(item => String(item._id))))
            .rejects.toThrow('Guest Henna Bar: Slot unavailable');
        expect(session.withTransaction).toHaveBeenCalledTimes(1);
        expect(session.endSession).toHaveBeenCalledTimes(1);
        expect(service.updateVendorResponse).toHaveBeenCalledWith(String(bookings[0]._id), 'accepted', undefined, session);
        expect(service.orderModel.findById).toHaveBeenCalledTimes(1);
    });

    it('preserves different package start offsets and creates one proposal only after preview', async () => {
        const { service, bookings } = fixture();
        const body = { date: '2099-01-11', time: '10:00', reason: 'Need a different date' };
        const preview = await service.proposeVendorSchedule(String(bookings[0]._id), {}, body);
        expect(preview.slots.map((slot: any) => slot.proposedStart.toISOString())).toEqual([
            '2099-01-11T10:00:00.000Z', '2099-01-11T11:00:00.000Z',
        ]);
        expect(preview.slots.map((slot: any) => slot.proposedEnd.toISOString())).toEqual([
            '2099-01-11T13:00:00.000Z', '2099-01-11T13:00:00.000Z',
        ]);
        expect(service.vendorOrderModel.updateOne).not.toHaveBeenCalled();
        await service.proposeVendorSchedule(String(bookings[0]._id), {}, { ...body, slots: JSON.parse(JSON.stringify(preview.slots)) });
        expect(service.vendorOrderModel.updateOne).toHaveBeenCalledTimes(1);
        expect(service.notifyLaterTimeDecision).toHaveBeenCalledTimes(1);
    });

    it('applies only the proposal slots and never writes the parent event', async () => {
        const { service, bookings } = fixture();
        const body = { date: '2099-01-11', time: '10:00', reason: 'Need a different date' };
        const { slots } = await service.proposeVendorSchedule(String(bookings[0]._id), {}, body);
        const proposal = { id: String(new Types.ObjectId()), status: 'PENDING', slots };
        const order = { _id: bookings[0].orderId, eventCityId: new Types.ObjectId(), status: 'pending', save: jest.fn() };
        service.cancellationService = {
            assertClientBookingOwner: jest.fn(async () => ({ order, vendorOrder: { ...bookings[0], vendorScheduleProposal: proposal } })),
        };
        await expect(service.respondToVendorSchedule(String(bookings[0]._id), {}, proposal.id, true))
            .resolves.toEqual({ status: 'ACCEPTED' });
        expect(service.vendorOrderModel.updateOne.mock.calls.slice(0, 2).map(([filter]: any[]) => filter._id)).toEqual(bookings.map(booking => booking._id));
        expect(service.vendorOrderModel.updateOne).toHaveBeenCalledTimes(3);
        expect(service.assertVendorPackageSlot).toHaveBeenCalledTimes(2);
        expect(order.save).not.toHaveBeenCalled();
    });

});
