jest.mock('@nestjs/schedule', () => ({ Cron: () => () => undefined }));
import { ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OrderService } from './order.service';

function fixture() {
    const vendorId = new Types.ObjectId();
    const orderId = new Types.ObjectId();
    const requestGroupId = new Types.ObjectId();
    const rows = ['Portraits', 'Photography'].map(name => ({
        _id: new Types.ObjectId(), vendorId, orderId, requestGroupId, name,
        status: 'CHANGE_REQUESTED', resolutionStatus: 'PENDING', expiresAt: new Date(Date.now() + 60_000),
        save: jest.fn(),
    }));
    const session = { withTransaction: jest.fn(async run => run()), endSession: jest.fn() };
    const query = (value: unknown) => ({ session: async () => value, lean: async () => value });
    const service = Object.assign(Object.create(OrderService.prototype), {
        expireRescheduleRequests: jest.fn(),
        connection: { startSession: async () => session },
        orderModel: { updateOne: async () => ({ matchedCount: 1 }), findById: () => query({ eventCityId: 'city' }) },
        rescheduleRequestModel: { findById: async () => rows[0], find: jest.fn(() => query(rows)) },
        userModel: { updateOne: jest.fn() },
        cityService: { requireCityTimeZone: async () => 'UTC' },
        validateRescheduleSlots: jest.fn(),
        applyRescheduleIfAllAccepted: jest.fn(),
        sendPushNotification: jest.fn(),
        chatService: { createOrGetConversation: jest.fn(), createMessage: jest.fn() },
    });
    return { service, rows, session, vendorId, orderId, requestGroupId };
}

describe('grouped vendor reschedule response', () => {
    it.each(['ACCEPTED', 'REJECTED'])('saves one %s decision for both packages in the same transaction', async status => {
        const { service, rows, session, vendorId, orderId, requestGroupId } = fixture();
        await service.respondToRescheduleRequest(String(rows[0]._id), String(vendorId), { status });
        expect(service.rescheduleRequestModel.find).toHaveBeenCalledWith({ orderId, vendorId, requestGroupId });
        expect(rows.map(row => row.status)).toEqual([status, status]);
        for (const row of rows) expect(row.save).toHaveBeenCalledWith({ session });
        expect(service.sendPushNotification).toHaveBeenCalledTimes(1);
        if (status === 'ACCEPTED') {
            expect(service.validateRescheduleSlots).toHaveBeenCalledWith(rows, 'UTC', session);
            expect(service.applyRescheduleIfAllAccepted).toHaveBeenCalledWith(String(orderId), session, requestGroupId);
        }
    });

    it('leaves both decisions pending when the second package slot is unavailable', async () => {
        const { service, rows, vendorId } = fixture();
        service.validateRescheduleSlots.mockRejectedValueOnce(new ConflictException('Photography: the proposed slot is unavailable.'));
        await expect(service.respondToRescheduleRequest(String(rows[0]._id), String(vendorId), { status: 'ACCEPTED' }))
            .rejects.toThrow('Photography: the proposed slot is unavailable.');
        for (const row of rows) {
            expect(row.save).not.toHaveBeenCalled();
            expect(row.status).toBe('CHANGE_REQUESTED');
        }
        expect(service.applyRescheduleIfAllAccepted).not.toHaveBeenCalled();
    });
});
