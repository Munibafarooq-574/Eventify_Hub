// Isolate scheduling: these tests exercise booking logic, not cron registration.
jest.mock('@nestjs/schedule', () => ({ Cron: () => () => undefined }));
import { model, Types } from 'mongoose';
import { CancellationService } from './cancellation.service';
import { OrderService } from '../order/order.service';
import { VendorOrderSchema } from '../schemas/vendor-order.schema';

const id = () => new Types.ObjectId().toString();
function config() {
    return { _id: id(), policyRevision: 3, policySettings: {
        clientRefunds: { refundable: [{ minHoursBeforeEvent: 0, percentage: 100 }],
            partiallyRefundable: [{ minHoursBeforeEvent: 0, percentage: 20 }, { minHoursBeforeEvent: 72, percentage: 80 }],
            nonRefundable: [{ minHoursBeforeEvent: 0, percentage: 0 }] },
        vendorCausedClientRefunds: [{ minHoursBeforeEvent: 0, percentage: 100 }],
        vendorPenalties: [{ minHoursBeforeEvent: 0, percentage: 25 }], paymentHoldHours: 24, postServiceIssueWindowHours: 72,
    } };
}
function cancellation() { return new CancellationService(...Array(10).fill({}) as [any, any, any, any, any, any, any, any, any, any]); }
const VendorModel = model('Step3VendorOrderTest', VendorOrderSchema);

describe('Booking policy snapshot', () => {
    it.each([
        ['photographerBusinessDetails', 'covidRefundPolicy', 'REFUNDABLE', 'REFUNDABLE'],
        ['cateringBusinessDetails', 'cancellationPolicy', 'NON-REFUNDABLE', 'NON-REFUNDABLE'],
        ['venueBusinessDetails', 'cancellationPolicy', 'PARTIALLY REFUNDABLE', 'PARTIALLY REFUNDABLE'],
        ['salonBusinessDetails', 'cancellationPolicy', 'REFUNDABLE', 'REFUNDABLE'],
        ['cakeBusinessDetails', 'cancellationPolicy', 'NON_REFUNDABLE', 'NON-REFUNDABLE'],
        ['mehndiBusinessDetails', 'cancellationPolicy', 'partially refundable', 'PARTIALLY REFUNDABLE'],
        ['soundBusinessDetails', 'cancellationPolicy', 'REFUNDABLE', 'REFUNDABLE'],
        ['genericBusinessDetails', 'cancellationPolicy', 'NON-REFUNDABLE', 'NON-REFUNDABLE'],
    ])('captures the existing %s policy', (field, key, value, expected) => {
        const snapshot = cancellation().buildBookingPolicySnapshot({ [field]: { [key]: value } }, config() as any);
        expect(snapshot.selectedPolicy).toBe(expected);
        expect(snapshot.policyRevision).toBe(3);
        expect(snapshot.capturedAt).toBeInstanceOf(Date);
    });
    it('preserves the existing partial fallback for vendors without a label', () => {
        expect(cancellation().buildBookingPolicySnapshot({}, config() as any).selectedPolicy).toBe('PARTIALLY REFUNDABLE');
    });
    it('deep copies every rule and duration so Admin/vendor edits cannot rewrite terms', () => {
        const source = config(); const vendor = { cateringBusinessDetails: { cancellationPolicy: 'REFUNDABLE' } };
        const old = cancellation().buildBookingPolicySnapshot(vendor, source as any);
        source.policyRevision++; source.policySettings.clientRefunds.refundable[0].percentage = 60;
        source.policySettings.vendorPenalties[0].percentage = 80; source.policySettings.paymentHoldHours = 48;
        vendor.cateringBusinessDetails.cancellationPolicy = 'NON-REFUNDABLE';
        expect(old.selectedPolicy).toBe('REFUNDABLE'); expect(old.policyRevision).toBe(3);
        expect(old.settings.clientRefunds.refundable[0].percentage).toBe(100);
        expect(old.settings.vendorPenalties[0].percentage).toBe(25); expect(old.settings.paymentHoldHours).toBe(24);
        const next = cancellation().buildBookingPolicySnapshot(vendor, source as any);
        expect(next.policyRevision).toBe(4); expect(next.selectedPolicy).toBe('NON-REFUNDABLE');
        expect(next.settings.clientRefunds.refundable[0].percentage).toBe(60);
    });
    it('rejects missing or invalid Admin settings and unknown vendor terms', () => {
        expect(() => cancellation().buildBookingPolicySnapshot({}, {} as any)).toThrow('not configured');
        const invalid = config(); invalid.policySettings.vendorPenalties[0].percentage = 101;
        expect(() => cancellation().buildBookingPolicySnapshot({}, invalid as any)).toThrow('invalid');
        expect(() => cancellation().buildBookingPolicySnapshot({ cakeBusinessDetails: { cancellationPolicy: 'UNKNOWN' } }, config() as any)).toThrow('invalid');
    });
    it('persists the embedded snapshot without introducing defaults on legacy bookings', () => {
        const fields = { orderId: id(), vendorId: id(), serviceName: 'Cake', price: 1000, originalAmount: 1000, finalAmount: 1000 };
        expect(new VendorModel(fields).toObject().policySnapshot).toBeUndefined();
        const snapshot = cancellation().buildBookingPolicySnapshot({}, config() as any);
        const doc = new VendorModel({ ...fields, policySnapshot: snapshot });
        expect(doc.validateSync()).toBeUndefined();
        const persisted = VendorModel.hydrate(doc.toObject());
        persisted.policySnapshot = { ...snapshot, policyRevision: 99 };
        expect(persisted.policySnapshot?.policyRevision).toBe(3);
        persisted.status = 'accepted'; persisted.paymentStatus = 'PARTIALLY_PAID';
        persisted.eventStartDateTime = new Date('2099-02-01');
        expect(persisted.toObject().policySnapshot?.policyRevision).toBe(3);
    });
});

function query(value: unknown) {
    const result: any = { select: () => result, session: () => result, lean: async () => value };
    return result;
}
function checkout(replacement = false, pricing: Record<string, unknown> = {}, durationMinutes = 60, serviceInput: Record<string, unknown> = {}) {
    const organizerId = id(), categoryId = id(), cityId = id();
    const vendors = [0, 1].map(() => ({ _id: id(), buisnessCategory: categoryId,
        packages: [{ _id: id(), packageName: 'Package', bookingType: 'DELIVERY_BASED', price: 1000, ...pricing }],
        cakeBusinessDetails: { cancellationPolicy: 'REFUNDABLE' } }));
    const source = config(); const policy = cancellation();
    jest.spyOn(policy, 'getPolicyConfig').mockResolvedValue(source as any);
    const snapshots: any[] = [];
    const user = { updateOne: async () => ({ matchedCount: 1 }), find: () => query(vendors.slice(0, replacement ? 1 : 2)) };
    const order: any = { _id: id(), organizerId, save: jest.fn().mockResolvedValue(undefined) };
    const orders = { findById: () => query({ currency: 'PKR' }), findOne: () => query(null), create: jest.fn().mockResolvedValue([order]) };
    const vendorOrders = { create: jest.fn().mockImplementation(async ([data], options) => {
        const saved = new VendorModel(data); snapshots.push(saved.toObject()); return [saved];
    }) };
    const request = { _id: id(), requestedBy: organizerId, resolutionStatus: 'REPLACEMENT_REQUIRED', status: 'REJECTED', vendorOrderId: id() };
    const requests = { findById: () => query(request) };
    const session = { withTransaction: async (callback: () => Promise<void>) => callback(), endSession: jest.fn() };
    const availability = { checkVendorAvailability: async () => ({ available: true,
        requiredServiceWindow: { startDateTime: '2099-01-01T12:00:00Z', endDateTime: '2099-01-01T13:00:00Z' } }) };
    const sendBookingNotice = jest.fn();
    const updateDraft = jest.fn().mockResolvedValue({ matchedCount: 0 });
    const eventId = id();
    const service = new OrderService(user as any, orders as any, vendorOrders as any, {} as any, requests as any, {} as any,
        { find: () => query([{ _id: categoryId, name: 'Cake' }]) } as any,
        { startSession: async () => session, db: { collection: () => ({ updateOne: updateDraft }) } } as any, availability as any, {} as any,
        { hasActiveSubscription: async () => true } as any,
        { requireActiveCity: async () => ({countryCode: pricing.currency === 'USD' ? 'US' : 'PK'}), requireCityTimeZone: async () => 'UTC' } as any,
        {} as any, {} as any, policy, { sendBookingNotice } as any);
    jest.spyOn(service, 'sendPushNotification').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'attachReplacementOrder').mockResolvedValue(undefined);
    const services = vendors.slice(0, replacement ? 1 : 2).map(vendor => ({ vendorId: vendor._id, packageId: vendor.packages[0]._id,
        serviceName: 'Client label', price: 1, ...serviceInput, policySnapshot: { selectedPolicy: 'NON-REFUNDABLE', policyRevision: 999 } }));
    const run = (revision?: number) => service.createOrder(organizerId, new Date('2099-01-01'), '12:00', services,
        'Event', 10, 'Wedding', durationMinutes, cityId, 'Address', [categoryId], eventId, replacement ? request._id : undefined, undefined, revision);
    return { run, policy, source, snapshots, vendorOrders, orders, session, service, request, sendBookingNotice, updateDraft, eventId };
}

describe('Snapshot in existing checkout transaction', () => {
    it('saves independent server-generated snapshots for every vendor using one Admin revision', async () => {
        const fixture = checkout(); await fixture.run();
        expect(fixture.snapshots).toHaveLength(2); expect(fixture.policy.getPolicyConfig).toHaveBeenCalledTimes(1);
        for (const line of fixture.snapshots) {
            expect(line.policySnapshot.selectedPolicy).toBe('REFUNDABLE'); expect(line.policySnapshot.policyRevision).toBe(3);
            expect(line.price).toBe(1000); expect(line.status).toBe('pending');
        }
        expect(fixture.vendorOrders.create.mock.calls[0][1].session).toBe(fixture.session);
        fixture.source.policySettings.clientRefunds.refundable[0].percentage = 60;
        expect(fixture.snapshots[0].policySnapshot.settings.clientRefunds.refundable[0].percentage).toBe(100);
        expect(fixture.session.endSession).toHaveBeenCalled();
    });
    it('accepts one checkout for a shared cart revision and rejects the other before booking writes', async () => {
        const fixture = checkout();
        fixture.updateDraft.mockResolvedValueOnce({ matchedCount: 1 });
        const results = await Promise.allSettled([fixture.run(7), fixture.run(7)]);
        expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
        const rejected = results.find(result => result.status === 'rejected');
        expect(rejected).toMatchObject({ reason: { response: { code: 'BOOKING_DRAFT_CHANGED' } } });
        expect(fixture.orders.create).toHaveBeenCalledTimes(1);
        expect(fixture.snapshots).toHaveLength(2);
        expect(fixture.updateDraft).toHaveBeenCalledWith(
            expect.objectContaining({ revision: 7, 'eventDetails.eventId': fixture.eventId }),
            { $set: { cartData: null, eventDetails: null }, $inc: { revision: 1 } },
            { session: fixture.session },
        );
    });
    it('snapshots USD from the event country, not the client-supplied amount', async () => {
        const f = checkout(false, {currency:'USD',price:200.25}); await f.run();
        expect(f.orders.create.mock.calls[0][0][0].currency).toBe('USD');
        expect(f.snapshots.every(snapshot => snapshot.currency === 'USD' && snapshot.price === 200.25)).toBe(true);
    });
    it('covers replacement bookings without copying the replaced vendor policy', async () => {
        const fixture = checkout(true); await fixture.run();
        expect(fixture.snapshots[0].replacesVendorOrderId.toString()).toBe(fixture.request.vendorOrderId);
        expect(fixture.snapshots[0].policySnapshot.selectedPolicy).toBe('REFUNDABLE');
        expect((fixture.service as any).attachReplacementOrder).toHaveBeenCalled();
    });
    it('opens only the new vendor chats after the checkout transaction commits', async () => {
        const fixture = checkout();
        fixture.session.withTransaction = async callback => {
            await callback();
            expect(fixture.sendBookingNotice).not.toHaveBeenCalled();
        };
        await fixture.run();
        expect(fixture.sendBookingNotice).toHaveBeenCalledTimes(2);
        expect(fixture.sendBookingNotice.mock.calls.map(([, line, stage]) => [String(line.vendorId), stage]))
            .toEqual(fixture.snapshots.map(line => [String(line.vendorId), 'requested']));
    });

    it('sends no chat messages when the checkout transaction fails', async () => {
        const fixture = checkout();
        fixture.session.withTransaction = async callback => {
            await callback();
            throw new Error('Commit failed');
        };
        await expect(fixture.run()).rejects.toThrow('Commit failed');
        expect(fixture.sendBookingNotice).not.toHaveBeenCalled();
    });

    it('fails before any booking write when Admin settings are invalid', async () => {
        const fixture = checkout(); fixture.source.policySettings.clientRefunds.refundable[0].percentage = 101;
        await expect(fixture.run()).rejects.toThrow('invalid');
        expect(fixture.orders.create).not.toHaveBeenCalled(); expect(fixture.vendorOrders.create).not.toHaveBeenCalled();
        expect(fixture.session.endSession).toHaveBeenCalled();
    });
});

describe('Duration Based checkout pricing', () => {
    const pricing = {
        bookingType: 'DURATION_BASED', price: 15000, baseIncludedDurationMinutes: 120,
        durations: [{ value: 3, unit: 'HOURS', price: 20000 }],
        allowCustomDuration: true, customDurationUnit: 'HOURS', customDurationRate: 6000,
    };

    it.each([[60, 6000], [120, 15000], [180, 20000], [240, 27000]])(
        'prices %i minutes at Rs. %i from the vendor configuration', async (minutes, expected) => {
            const fixture = checkout(false, pricing, minutes);
            await fixture.run();
            expect(fixture.snapshots).toHaveLength(2);
            expect(fixture.snapshots.map(line => line.price)).toEqual([expected, expected]);
        },
    );

    it('rejects a shorter duration when the vendor disables custom pricing', async () => {
        const fixture = checkout(false, { ...pricing, allowCustomDuration: false });
        await expect(fixture.run()).rejects.toThrow('This duration is not offered by the vendor');
        expect(fixture.vendorOrders.create).not.toHaveBeenCalled();
    });
});

describe('pricing snapshot through real checkout', () => {
    it.each([
        [{ pricingMethod: 'FIXED' }, { quantity: 2 }, 2000, null],
        [{ pricingMethod: 'PER_PERSON' }, { personCount: 5 }, 5000, 5],
        [{ pricingMethod: 'GROUP', groupSize: 10 }, { quantity: 2 }, 2000, null],
    ])('persists trusted pricing and counts for %j', async (pricing, input, amount, people) => {
        const fixture = checkout(false, pricing, 60, input);
        await fixture.run();
        for (const saved of fixture.snapshots) {
            expect(saved.finalAmount).toBe(amount);
            expect(saved.pricingMethod).toBe(pricing.pricingMethod);
            expect(saved.personCount).toBe(people);
            expect(saved.groupSize).toBe(pricing.pricingMethod === 'GROUP' ? 10 : null);
        }
        expect(fixture.sendBookingNotice.mock.calls[0][1].pricingMethod).toBe(pricing.pricingMethod);
    });
    it('rejects a stale reviewed price before creating bookings', async () => {
        const fixture = checkout(false, { pricingMethod: 'PER_PERSON' }, 60, { expectedPackageAmount: 1000 });
        await expect(fixture.run()).rejects.toThrow('pricing has changed');
        expect(fixture.snapshots).toHaveLength(0);
    });
    it('rejects changed group capacity even when the unit price is the same', async () => {
        const fixture = checkout(false, { pricingMethod: 'GROUP', groupSize: 20 }, 60,
            { expectedPricingMethod: 'GROUP', expectedGroupSize: 10 });
        await expect(fixture.run()).rejects.toThrow('pricing has changed');
        expect(fixture.snapshots).toHaveLength(0);
    });
});
