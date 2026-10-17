import { Types } from 'mongoose';
import { CancellationService } from './cancellation.service';
const id = () => new Types.ObjectId().toString();
const now = new Date('2030-01-01T12:00:00Z');
const query = (value: any): any => ({ session: jest.fn().mockResolvedValue(value), then: (resolve: any, reject: any) => Promise.resolve(value).then(resolve, reject) });
function fixture() {
    const actor = { id: id(), role: 'client' };
    const order: any = { _id: id(), organizerId: actor.id, vendorOrders: [] };
    const sibling = { _id: id(), status: 'accepted' };
    const settings = { clientRefunds: {
        refundable: [{ minHoursBeforeEvent: 0, percentage: 100 }],
        partiallyRefundable: [{ minHoursBeforeEvent: 0, percentage: 20 }, { minHoursBeforeEvent: 72, percentage: 80 }],
        nonRefundable: [{ minHoursBeforeEvent: 0, percentage: 0 }],
    }, vendorCausedClientRefunds: [{ minHoursBeforeEvent: 0, percentage: 100 }], vendorPenalties: [{ minHoursBeforeEvent: 0, percentage: 90 }], paymentHoldHours: 24, postServiceIssueWindowHours: 72 };
    const booking: any = { _id: id(), orderId: order._id, vendorId: id(), serviceName: 'Cake', status: 'accepted', paymentStatus: 'PARTIALLY_PAID', downPaymentAmount: 200, price: 1000, finalAmount: 1000,
        eventStartDateTime: new Date(now.getTime() + 100 * 3600000), policySnapshot: { schemaVersion: 1, policyConfigId: id(), policyRevision: 3, capturedAt: now, selectedPolicy: 'PARTIALLY REFUNDABLE', settings } };
    order.vendorOrders = [booking._id, sibling._id];
    const payments: any[] = [{ amount: 200, organizerId: actor.id, orderId: order._id }];
    const state = { refund: null as any, pendingPayment: false, reschedule: false };
    const vendorModel = { findById: jest.fn(() => query(booking)), findOneAndUpdate: jest.fn(async (filter, update, _options) => {
        if (filter.status !== booking.status || filter.paymentStatus !== booking.paymentStatus) return null;
        Object.assign(booking, update.$set); return booking;
    }) };
    const orders = { findById: jest.fn(() => query(order)), findOne: jest.fn(() => query(order)) };
    const paymentModel = { find: jest.fn(() => query(payments)), exists: jest.fn(() => query(state.pendingPayment)) };
    const refunds = { exists: jest.fn(() => query(state.refund)), findOne: jest.fn(filter => query(state.refund?.confirmationKey === filter.confirmationKey ? state.refund : null)),
        create: jest.fn(async ([record], _options) => { state.refund = { _id: id(), ...record }; return [state.refund]; }) };
    const config = { findOne: jest.fn(() => { throw new Error('Current Admin settings must not be read'); }) };
    const session: any = { endSession: jest.fn(), withTransaction: jest.fn(async (callback, _options) => {
        const original = { ...booking }; const refund = state.refund;
        try { return await callback(); } catch (error) { Object.keys(booking).forEach(key => delete booking[key]); Object.assign(booking, original); state.refund = refund; throw error; }
    }) };
    const service = new CancellationService(vendorModel as any, orders as any, paymentModel as any, refunds as any, {} as any, config as any, {} as any,
        { exists: () => query(state.reschedule) } as any, { getOrThrow: () => 'unit-test-only-preview-secret' } as any, { startSession: async () => session } as any);
    const preview = () => service.calculateRefund(booking._id, actor);
    const confirm = (previewToken: string) => service.organizerCancelConfirmedBooking(booking._id, actor, { previewToken, reason: '  Plans changed  ' });
    return { actor, order, sibling, booking, payments, state, vendorModel, refunds, config, session, service, preview, confirm };
}
describe('Client cancellation saved-policy review and confirmation', () => {
    beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(now); });
    afterEach(() => jest.useRealTimers());
    it.each([['REFUNDABLE', 100, 200], ['PARTIALLY REFUNDABLE', 80, 160], ['NON-REFUNDABLE', 0, 0]])('uses saved %s client rules and ledger', async (label, percentage, amount) => {
        const f = fixture(); f.booking.policySnapshot.selectedPolicy = label;
        expect(await f.preview()).toMatchObject({ eligible: true, amountPaid: 200, refundPercentage: percentage, refundAmount: amount, withheldAmount: 200 - Number(amount), policyRevision: 3 });
        expect(f.config.findOne).not.toHaveBeenCalled(); expect(f.vendorModel.findOneAndUpdate).not.toHaveBeenCalled(); expect(f.refunds.create).not.toHaveBeenCalled();
    });
    it('uses exact hour boundaries and rounds money to cents', async () => {
        const f = fixture(); f.payments[0].amount = 200.03; f.booking.eventStartDateTime = new Date(now.getTime() + 72 * 3600000);
        expect(await f.preview()).toMatchObject({ refundPercentage: 80, refundAmount: 160.02, withheldAmount: 40.01 });
        jest.advanceTimersByTime(1); expect(await f.preview()).toMatchObject({ refundPercentage: 20, refundAmount: 40.01, withheldAmount: 160.02 });
    });
    it.each([['status', 'completed', 'COMPLETED'], ['status', 'pending', 'NOT_CONFIRMED'], ['paymentStatus', 'PAID', 'FULLY_PAID'], ['paymentStatus', 'PAYMENT_REQUIRED', 'NOT_CONFIRMED'],
        ['replacementOutcome', 'NO_LONGER_ASSIGNED', 'NO_LONGER_ASSIGNED'], ['policySnapshot', undefined, 'LEGACY_SUPPORT_REQUIRED'],
        ['eventStartDateTime', now, 'SERVICE_STARTED'], ['eventStartDateTime', null, 'SERVICE_TIME_MISSING'], ['downPaymentAmount', 300, 'PAYMENT_REVIEW'],
    ])('blocks %s=%s', async (field, value, restrictionCode) => {
        const f = fixture(); f.booking[field] = value; const result = await f.preview();
        expect(result).toMatchObject({ eligible: false, restrictionCode }); expect(result.previewToken).toBeUndefined(); expect(f.refunds.create).not.toHaveBeenCalled();
    });
    it.each(['pendingPayment', 'reschedule', 'refund'] as const)('blocks unresolved %s', async key => {
        const f = fixture(); (f.state as any)[key] = true; expect((await f.preview()).eligible).toBe(false);
    });
    it('does not replace invalid saved rules with defaults', async () => {
        const f = fixture(); f.booking.policySnapshot.settings.clientRefunds.partiallyRefundable[0].percentage = 101;
        expect(await f.preview()).toMatchObject({ eligible: false, restrictionCode: 'POLICY_INVALID' });
    });
    it('supports an existing zero down-payment booking', async () => {
        const f = fixture(); f.booking.downPaymentAmount = 0; f.payments.length = 0;
        expect(await f.preview()).toMatchObject({ eligible: true, amountPaid: 0, refundAmount: 0 });
    });
    it('rejects a mismatched payment owner and invalid amount', async () => {
        const f = fixture(); f.payments[0].organizerId = id(); await expect(f.preview()).rejects.toThrow('Payment records');
        f.payments[0].organizerId = f.actor.id; f.payments[0].amount = NaN; await expect(f.preview()).rejects.toThrow('Payment records');
    });
    it('rejects another client, vendor role and malformed booking ID', async () => {
        const f = fixture();
        await expect(f.service.calculateRefund(f.booking._id, { id: id(), role: 'client' })).rejects.toThrow('do not own');
        await expect(f.service.calculateRefund(f.booking._id, { ...f.actor, role: 'vendor' })).rejects.toThrow('authenticated Client');
        await expect(f.service.calculateRefund('bad-id', f.actor)).rejects.toThrow('Invalid vendor booking ID');
        await expect(f.service.assertVendorBookingOwner(f.booking._id, { id: id(), role: 'vendor' })).rejects.toThrow('do not own');
    });
    it('cancels one vendor transactionally and records saved-policy refund audit', async () => {
        const f = fixture(); const order = JSON.stringify(f.order); const sibling = JSON.stringify(f.sibling);
        const quote = await f.preview(); const result = await f.confirm(quote.previewToken!);
        expect(result.alreadyCancelled).toBe(false); expect(f.booking).toMatchObject({ status: 'cancelled', cancelledBy: 'organizer', cancellationReason: 'Plans changed' });
        expect(f.state.refund).toMatchObject({ refundAmount: 160, amountPaid: 200, withheldAmount: 40, policyRevision: 3, refundPercentage: 80, status: 'PENDING', initiatedBy: 'ORGANIZER_CANCELLED' });
        expect(f.state.refund.confirmationKey).not.toBe(quote.previewToken); expect(f.state.refund.calculatedAt).toBeInstanceOf(Date);
        expect(f.refunds.create.mock.calls[0][1]).toEqual({ session: f.session }); expect(f.vendorModel.findOneAndUpdate.mock.calls[0][2].session).toBe(f.session);
        expect(f.session.withTransaction.mock.calls[0][1]).toEqual({ readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
        expect(JSON.stringify(f.order)).toBe(order); expect(JSON.stringify(f.sibling)).toBe(sibling); expect(f.session.endSession).toHaveBeenCalled();
    });
    it('returns the same result for a lost-response retry even after expiry', async () => {
        const f = fixture(); const quote = await f.preview(); await f.confirm(quote.previewToken!); jest.advanceTimersByTime(600001);
        expect((await f.confirm(quote.previewToken!)).alreadyCancelled).toBe(true); expect(f.refunds.create).toHaveBeenCalledTimes(1); expect(f.vendorModel.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
    it('rejects expired, forged and cross-booking quotes', async () => {
        const f = fixture(); const quote = await f.preview(); await expect(f.confirm(quote.previewToken! + 'x')).rejects.toThrow('Invalid cancellation preview');
        await expect(fixture().confirm(quote.previewToken!)).rejects.toThrow('does not match');
        jest.advanceTimersByTime(300001); await expect(f.confirm(quote.previewToken!)).rejects.toThrow('expired'); expect(f.refunds.create).not.toHaveBeenCalled();
    });
    it.each(['payment', 'tier', 'snapshot', 'serviceTime'])('requires fresh review after %s changes', async change => {
        const f = fixture(); if (change === 'tier') f.booking.eventStartDateTime = new Date(now.getTime() + 72 * 3600000);
        const quote = await f.preview();
        if (change === 'payment') f.payments[0].amount++;
        if (change === 'tier') jest.advanceTimersByTime(1);
        if (change === 'snapshot') f.booking.policySnapshot.policyRevision++;
        if (change === 'serviceTime') f.booking.eventStartDateTime = new Date(now.getTime() + 200 * 3600000);
        await expect(f.confirm(quote.previewToken!)).rejects.toThrow('changed'); expect(f.refunds.create).not.toHaveBeenCalled();
    });
    it('rolls back if refund creation fails and closes the session', async () => {
        const f = fixture(); const quote = await f.preview(); f.refunds.create.mockRejectedValueOnce(new Error('database write failed'));
        await expect(f.confirm(quote.previewToken!)).rejects.toThrow('database write failed'); expect(f.booking.status).toBe('accepted'); expect(f.state.refund).toBeNull(); expect(f.session.endSession).toHaveBeenCalled();
    });
    it.each(['', '   ', 'x'.repeat(501)])('rejects an invalid required reason before any cancellation write', async reason => {
        const f = fixture(); const quote = await f.preview();
        await expect(f.service.organizerCancelConfirmedBooking(f.booking._id, f.actor, { previewToken: quote.previewToken!, reason })).rejects.toThrow('reason');
        expect(f.vendorModel.findOneAndUpdate).not.toHaveBeenCalled();
        expect(f.refunds.create).not.toHaveBeenCalled();
    });

});
