import { currencyMatch } from '../common/utils/currency';
jest.mock('@nestjs/schedule', () => ({ Cron: () => () => undefined }));
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createConnection, Connection, Schema, Types } from 'mongoose';
import { ConflictException } from '@nestjs/common';
import { OrderService } from './order.service';
import { withBookingPaymentLock } from '../common/utils/booking-payment-window';

describe('acceptance waits for final event schedule', () => {
  let mongo: MongoMemoryReplSet, db: Connection, bookings: any, requests: any;
  beforeAll(async () => {
    mongo = await MongoMemoryReplSet.create({ replSet: { count: 1, args: ['--nounixsocket'] } });
    db = await createConnection(mongo.getUri()).asPromise();
    bookings = db.model('AcceptanceBooking', new Schema({ currency: String, price: Number, downPaymentAmount: Number, remainingAmount: Number, downPaymentType: String, downPaymentPercentage: Number, paymentStatus: String, paymentDeadline: Date, status: String, orderId: Schema.Types.ObjectId, vendorId: Schema.Types.ObjectId, eventStartDateTime: Date }, { strict: false }));
    requests = db.model('AcceptanceRequest', new Schema({ orderId: Schema.Types.ObjectId, status: String, resolutionStatus: String }, { strict: false }));
    db.model('Payment', new Schema({ vendorOrderId: Schema.Types.ObjectId, status: String }));
    await Promise.all([bookings.init(), requests.init()]);
  }, 30000);
  afterAll(async () => { await db?.close(); await mongo?.stop(); });
  async function fixture() {
    const booking = await bookings.create({ status: 'pending', orderId: new Types.ObjectId(), vendorId: new Types.ObjectId(), eventStartDateTime: new Date('2099-11-26T23:00:00Z'), price: 20000 });
    const service: any = Object.create(OrderService.prototype);
    Object.assign(service, { vendorOrderModel: bookings, rescheduleRequestModel: requests,
      userModel: { findById: () => ({ lean: async () => ({ cakeBusinessDetails: { downPaymentType: 'FIXED', downPayment: 0 } }) }) },
      commissionConfigModel: { findOne: async () => null }, orderModel: { findOne: async () => null },
    });
    return { booking, service };
  }
  it.each(['CHANGE_REQUESTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'])('blocks %s until the group is resolved', async status => {
    const { booking, service } = await fixture();
    await requests.create({ orderId: booking.orderId, status, resolutionStatus: 'PENDING' });
    await expect(service.updateVendorResponse(String(booking._id), 'accepted')).rejects.toThrow('Resolve the date/time change');
    expect((await bookings.findById(booking._id)).status).toBe('pending');
  });
  it('blocks the original assignment while replacement is required', async () => {
    const { booking, service } = await fixture();
    await requests.create({ orderId: booking.orderId, status: 'REJECTED', resolutionStatus: 'REPLACEMENT_REQUIRED' });
    await expect(service.updateVendorResponse(String(booking._id), 'accepted')).rejects.toBeInstanceOf(ConflictException);
  });
  it.each(['APPLIED', 'KEEP_ORIGINAL'])('allows acceptance after %s and keeps schedule approval separate', async resolutionStatus => {
    const { booking, service } = await fixture();
    const request = await requests.create({ orderId: booking.orderId, status: 'ACCEPTED', resolutionStatus });
    const saved = await service.updateVendorResponse(String(booking._id), 'accepted');
    expect(saved.status).toBe('accepted');
    expect((await requests.findById(request._id)).resolutionStatus).toBe(resolutionStatus);
  });
  it('normal reschedule creation uses the existing booking lock without accepting the booking', async () => {
    const { booking, service } = await fixture();
    const client = new Types.ObjectId();
    const parent = { _id: booking.orderId, organizerId: client, eventDate: new Date('2099-11-26'), eventTime: '15:00', eventStartDateTime: booking.eventStartDateTime, eventEndDateTime: new Date('2099-11-27T02:00:00Z'), eventDurationMinutes: 180, eventCityId: new Types.ObjectId(), vendorOrders: [booking._id] };
    service.connection = db;
    service.orderModel.findById = () => ({ lean: async () => parent });
    service.userModel.findById = () => { const query: any = { select: () => query, lean: async () => ({ packages: [] }) }; return query; };
    service.cityService = { requireCityTimeZone: async () => 'UTC' };
    service.availabilityService = { checkVendorAvailability: async () => ({ available: true, requiredServiceWindow: { startDateTime: new Date('2099-11-28T15:00:00Z'), endDateTime: new Date('2099-11-28T18:00:00Z') } }) };
    service.chatService = { createOrGetConversation: async () => 'chat', createMessage: async () => {} };
    service.sendPushNotification = async () => {};
    await service.requestEventReschedule(String(parent._id), String(client), { eventDate: '2099-11-28', eventTime: '15:00', durationMinutes: 180, reason: 'Move event' });
    const current = await bookings.findById(booking._id);
    expect(current.status).toBe('pending');
    expect(current.__v).toBe(1);
    expect(await requests.exists({ orderId: parent._id, status: 'CHANGE_REQUESTED', resolutionStatus: 'PENDING' })).toBeTruthy();
  });
  it.each([false, true])('rejects stale acceptance when a reschedule commits first (legacy version: %s)', async legacy => {
    const { booking, service } = await fixture();
    if (legacy) await bookings.updateOne({ _id: booking._id }, { $unset: { __v: 1 } });
    let resume!: () => void, entered!: () => void;
    const ready = new Promise<void>(resolve => { entered = resolve; });
    const pause = new Promise<void>(resolve => { resume = resolve; });
    service.userModel.findById = () => ({ lean: async () => { entered(); await pause; return { cakeBusinessDetails: { downPaymentType: 'FIXED', downPayment: 0 } }; } });
    const acceptance = service.updateVendorResponse(String(booking._id), 'accepted').catch((error: any) => error);
    await ready;
    try {
      await withBookingPaymentLock(db, bookings, booking._id, async session => {
        await requests.create([{ orderId: booking.orderId, status: 'CHANGE_REQUESTED', resolutionStatus: 'PENDING' }], { session });
      });
    } finally { resume(); }
    expect(await acceptance).toBeInstanceOf(ConflictException);
    expect((await bookings.findById(booking._id)).status).toBe('pending');
  });
  it('preserves USD cents when calculating the advance and keeps old PKR bookings unchanged', async () => {
    const { booking, service } = await fixture();
    await bookings.updateOne({ _id: booking._id }, { $set: { currency: 'USD', price: 200.25 } });
    service.userModel = { findById: () => ({ lean: async () => ({ cakeBusinessDetails: { downPaymentType: 'PERCENTAGE', downPayment: 20 } }) }) };
    service.orderModel.findById = () => ({ lean: async () => null });
    await service.updateVendorResponse(String(booking._id), 'accepted', undefined);
    const saved = await bookings.findById(booking._id).lean();
    expect(saved.currency).toBe('USD');
    expect(saved.downPaymentAmount).toBe(40.05);
    expect(saved.remainingAmount).toBe(160.2);
  });
  it('does not treat an old PKR fixed advance as a USD amount', async () => {
    const { booking, service } = await fixture();
    await bookings.updateOne({ _id: booking._id }, { $set: { currency: 'USD', price: 200 } });
    service.userModel = { findById: () => ({ lean: async () => ({ cakeBusinessDetails: { downPaymentType: 'FIXED', downPayment: 50 } }) }) };
    await expect(service.updateVendorResponse(String(booking._id), 'accepted', undefined)).rejects.toThrow('Update the fixed down payment');
    expect((await bookings.findById(booking._id)).status).toBe('pending');
  });

  it('keeps USD earnings separate from legacy PKR documents in database aggregation', async () => {
    const vendorId = new Types.ObjectId();
    await bookings.collection.insertMany([{vendorId,price:20000},{vendorId,price:200.25,currency:'USD'}]);
    const sum = async (currency: 'PKR' | 'USD') => (await bookings.aggregate([
      {$match:{vendorId}}, {$match:currencyMatch(currency)}, {$group:{_id:null,total:{$sum:'$price'}}},
    ]))[0].total;
    expect(await sum('PKR')).toBe(20000);expect(await sum('USD')).toBe(200.25);
  });

});
