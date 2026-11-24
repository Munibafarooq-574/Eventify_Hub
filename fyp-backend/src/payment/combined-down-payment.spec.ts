import { Types } from 'mongoose';
import { PaymentService } from './payment.service';

const query = <T>(value: T) => ({
    sort: () => query(value),
    session: async () => value,
    lean: async () => value,
});

function fixture() {
    const order = { _id: new Types.ObjectId(), organizerId: new Types.ObjectId() };
    const vendorId = new Types.ObjectId();
    const deadline = new Date(Date.now() + 600_000);
    const bookings = [
        { serviceName: 'Portraits', finalAmount: 450, downPaymentAmount: 135 },
        { serviceName: 'Photography', finalAmount: 250, downPaymentAmount: 75 },
    ].map(booking => ({
        ...booking, _id: new Types.ObjectId(), vendorId, currency: 'USD',
        paymentDeadline: new Date(deadline), holdExpiresAt: new Date(deadline),
        paymentServiceCutoff: new Date(deadline.getTime() + 60_000),
    }));
    const session = {};
    const service = Object.assign(Object.create(PaymentService.prototype), {
        assertOrganizerOwnsVendorOrder: jest.fn(async () => order),
        normalizeLegacyPaymentWindow: jest.fn(),
        withCheckoutLocks: jest.fn(async (_ids, work) => work(session)),
        rescheduleRequestModel: { exists: jest.fn(() => query(null)) },
        vendorOrderModel: { findById: jest.fn(async () => bookings[0]), find: jest.fn(() => query(bookings)) },
        paymentModel: { distinct: jest.fn(() => query([])), create: jest.fn(async rows => rows.map((row: Record<string, unknown>) => ({ ...row, _id: new Types.ObjectId() }))) },
    });
    const getQuote = () => service.getVendorDownPaymentQuote(String(bookings[0]._id), String(order.organizerId));
    const initiate = (quoteKey: string, method = 'card') => service.initiateVendorDownPayment(String(bookings[0]._id), method, String(order.organizerId), quoteKey);
    return { service, bookings, order, session, getQuote, initiate };
}

describe('vendor down payment checkout', () => {
    it('quotes $210 and writes one locked checkout with two package allocations', async () => {
        const f = fixture();
        const quote = await f.getQuote();
        expect(quote).toMatchObject({ downPaymentAmount: 210, totalAmount: 700, remainingAmount: 490 });
        expect(f.service.vendorOrderModel.find).toHaveBeenCalledWith(expect.objectContaining({
            orderId: f.order._id, vendorId: f.bookings[0].vendorId, status: 'accepted',
        }));
        const result = await f.initiate(quote.quoteKey);
        expect(result.amount).toBe(210);
        expect(f.service.withCheckoutLocks).toHaveBeenCalledWith(f.bookings.map(row => row._id), expect.any(Function));
        expect(f.service.paymentModel.create).toHaveBeenCalledWith([
            expect.objectContaining({ vendorOrderId: String(f.bookings[0]._id), amount: 135, checkoutGroupId: result.checkoutGroupId }),
            expect.objectContaining({ vendorOrderId: String(f.bookings[1]._id), amount: 75, checkoutGroupId: result.checkoutGroupId }),
        ], { session: f.session, ordered: true });
    });

    it('keeps fractional amounts exact and uses the earliest per-package deadline', async () => {
        const f = fixture();
        f.bookings[0].downPaymentAmount = 0.1;
        f.bookings[1].downPaymentAmount = 0.2;
        const sooner = new Date(Date.now() + 120_000);
        f.bookings[1].paymentDeadline = f.bookings[1].holdExpiresAt = sooner;
        await expect(f.getQuote()).resolves.toMatchObject({ downPaymentAmount: 0.3, remainingAmount: 699.7, paymentDeadline: sooner.toISOString() });
    });

    it('excludes packages that already have a pending or successful payment', async () => {
        const f = fixture();
        f.service.paymentModel.distinct.mockReturnValue(query([f.bookings[0]._id]));
        const quote = await f.getQuote();
        expect(quote.downPaymentAmount).toBe(75);
        expect(quote.packages).toHaveLength(1);
        expect(f.service.paymentModel.distinct).toHaveBeenCalledWith('vendorOrderId', expect.objectContaining({ status: { $in: ['PENDING', 'SUCCESS'] } }));
    });

    it('excludes expired and zero deposits and refuses a fully ineligible group', async () => {
        const f = fixture();
        f.bookings[0].paymentDeadline = f.bookings[0].holdExpiresAt = new Date(Date.now() - 1_000);
        expect((await f.getQuote()).downPaymentAmount).toBe(75);
        f.bookings[1].downPaymentAmount = 0;
        await expect(f.getQuote()).rejects.toThrow('No packages');
    });

    it.each([NaN, -1, 251, 0.001])('rejects an invalid package amount of %s', async amount => {
        const f = fixture();
        f.bookings[1].downPaymentAmount = amount;
        await expect(f.getQuote()).rejects.toThrow('Photography: invalid down-payment amount');
    });

    it('blocks changed totals, wrong currency method and unresolved reschedules', async () => {
        const f = fixture();
        const quote = await f.getQuote();
        await expect(f.initiate(quote.quoteKey, 'easypaisa')).rejects.toThrow('USD bookings require card payment');
        f.bookings[0].downPaymentAmount++;
        await expect(f.initiate(quote.quoteKey)).rejects.toThrow('payment amounts changed');
        f.service.rescheduleRequestModel.exists.mockReturnValue(query({}));
        await expect(f.getQuote()).rejects.toThrow('date/time change');
        expect(f.service.paymentModel.create).not.toHaveBeenCalled();
    });

    it('rechecks after acquiring locks and rejects a duplicate or stale checkout', async () => {
        const f = fixture();
        const quote = await f.getQuote();
        f.service.withCheckoutLocks.mockImplementationOnce(async (_ids: Types.ObjectId[], work: (session: object) => Promise<unknown>) => {
            f.service.paymentModel.distinct.mockReturnValue(query([f.bookings[0]._id]));
            return work(f.session);
        });
        await expect(f.initiate(quote.quoteKey)).rejects.toThrow('payment amounts changed');
        expect(f.service.paymentModel.create).not.toHaveBeenCalled();
    });
});

describe('combined checkout resolution', () => {
    function resolutionFixture() {
        const f = fixture();
        const checkoutGroupId = new Types.ObjectId();
        const rows = f.bookings.map(booking => ({
            _id: new Types.ObjectId(), vendorOrderId: booking._id, checkoutGroupId,
            amount: booking.downPaymentAmount, orderId: f.order._id, organizerId: f.order.organizerId, vendorId: booking.vendorId, currency: booking.currency,
        }));
        Object.assign(f.service, {
            paymentModel: {
                findById: jest.fn(async () => rows[0]),
                find: jest.fn(() => query(rows)),
            },
            orderModel: { findById: () => ({ ...query({ eventName: 'Event' }), populate: () => query({ eventName: 'Event' }) }) },
            userModel: { findById: () => ({ select: () => ({ ...query({ email: 'customer@example.test' }), populate: () => query({ name: 'Photo19' }) }) }) },
            emailService: { sendTransactionalEmail: jest.fn() },
            confirmPaymentLocked: jest.fn(async (id: string) => {
                const index = rows.findIndex(row => String(row._id) === id);
                return { payment: rows[index], vendorOrder: f.bookings[index], remainingAmount: 0, paidSoFar: rows[index].amount };
            }),
            failPaymentLocked: jest.fn(),
        });
        return { ...f, rows };
    }

    it('confirms both allocations in one locked operation and sends one itemized receipt', async () => {
        const f = resolutionFixture();
        await expect(f.service.confirmPayment(String(f.rows[0]._id), 'reference'))
            .resolves.toMatchObject({ amount: 210, status: 'SUCCESS' });
        f.rows.forEach(row => expect(f.service.confirmPaymentLocked)
            .toHaveBeenCalledWith(String(row._id), 'reference', f.session));
        const send = f.service.emailService.sendTransactionalEmail;
        expect(send).toHaveBeenCalledTimes(1);
        const html = send.mock.calls[0][0].html;
        expect(html).toContain('Payment Receipt');
        expect(html).toContain('Service Details');
        expect(html).toContain('Payment Details');
        expect(html).toMatch(/Portraits[\s\S]*135[\s\S]*Photography[\s\S]*75[\s\S]*210/);
    });

    it('fails both allocations together and emits no receipt', async () => {
        const f = resolutionFixture();
        await f.service.failPayment(String(f.rows[0]._id), 'Declined');
        f.rows.forEach(row => expect(f.service.failPaymentLocked)
            .toHaveBeenCalledWith(String(row._id), 'Declined', f.session));
        expect(f.service.emailService.sendTransactionalEmail).not.toHaveBeenCalled();
    });

    it('does not issue a receipt when confirmation of the second allocation fails', async () => {
        const f = resolutionFixture();
        f.service.confirmPaymentLocked.mockImplementationOnce(async () => ({ payment: f.rows[0], vendorOrder: f.bookings[0], remainingAmount: 315 })).mockRejectedValueOnce(new Error('Expired'));
        await expect(f.service.confirmPayment(String(f.rows[0]._id))).rejects.toThrow('Expired');
        expect(f.service.emailService.sendTransactionalEmail).not.toHaveBeenCalled();
    });
});

it('credits a confirmed allocation even when the prior ledger contains no successful payments', async () => {
    const { service, bookings } = fixture();
    const booking = { ...bookings[0], status: 'accepted', save: jest.fn() };
    const allocation = {
        _id: new Types.ObjectId(), checkoutGroupId: new Types.ObjectId(),
        vendorOrderId: booking._id, status: 'PENDING', type: 'DOWN_PAYMENT',
        amount: 135, createdAt: new Date(), save: jest.fn(),
    };
    const session = {};
    service.vendorOrderModel.findById.mockReturnValue(query(booking));
    service.paymentModel.findById = () => query(allocation);
    service.paymentModel.find = () => ({ session: () => query([]) });
    const result = await service.confirmPaymentLocked(String(allocation._id), 'test-reference', session);
    expect(result).toMatchObject({ paidSoFar: 135, remainingAmount: 315 });
    expect(booking).toMatchObject({ paymentStatus: 'PARTIALLY_PAID', paymentDeadline: null });
    expect(allocation.status).toBe('SUCCESS');
    expect(booking.save).toHaveBeenCalledWith({ session });
});
