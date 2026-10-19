import { CancellationService } from './cancellation.service';
const query = (value: any): any => ({ session: () => Promise.resolve(value) });
const now = new Date('2026-10-18T10:00:00Z');
function fixture(hours=96) {
 const settings:any={clientRefunds:{refundable:[{minHoursBeforeEvent:0,percentage:100}],partiallyRefundable:[{minHoursBeforeEvent:0,percentage:0}],nonRefundable:[{minHoursBeforeEvent:0,percentage:0}]},vendorCausedClientRefunds:[{minHoursBeforeEvent:0,percentage:100}],vendorPenalties:[{minHoursBeforeEvent:0,percentage:100},{minHoursBeforeEvent:24,percentage:5},{minHoursBeforeEvent:240,percentage:4},{minHoursBeforeEvent:480,percentage:3},{minHoursBeforeEvent:720,percentage:2},{minHoursBeforeEvent:960,percentage:0}],paymentHoldHours:24,postServiceIssueWindowHours:72};
 const booking:any={_id:'booking',vendorId:'vendor',status:'accepted',paymentStatus:'PARTIALLY_PAID',price:6000,eventStartDateTime:new Date(now.getTime()+hours*3600000),policySnapshot:{schemaVersion:1,policyRevision:3,policyConfigId:'saved-config',selectedPolicy:'NON-REFUNDABLE',settings},save:jest.fn(async()=>{})};
 const s:any=Object.create(CancellationService.prototype);
 s.assertVendorBookingOwner=jest.fn(async()=>booking);s.getAmountPaid=jest.fn(async()=>3000);
 s.paymentModel={exists:()=>query(null),find:()=>({select:()=>({lean:async()=>[{amount:3000,type:'DOWN_PAYMENT',method:'card',paidAt:now}]})})};
 s.getPolicyConfig=jest.fn(async()=>{throw new Error('Mutable Admin config must not be read')});
 s.rescheduleRequestModel={findOne:()=>query(null)};s.orderModel={findOne:()=>query({_id:'order',organizerId:'client'})};
 s.notifications={notifyUser:jest.fn(async()=>{})};
 s.connection={startSession:async()=>({endSession:jest.fn(),withTransaction:async(callback:any)=>{const original={...booking};try{return await callback()}catch(error){Object.assign(booking,original);throw error}}})};
 s.refundModel={create:jest.fn(async data=>data)};s.vendorPenaltyModel={create:jest.fn(async data=>data)};
 return{s,booking,settings,cancel:()=>s.vendorCancelConfirmedBooking('booking','Unable to provide service',{id:'vendor',role:'Vendor'})};
}
describe('Vendor cancellation uses saved booking policy',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(now)});afterEach(()=>jest.useRealTimers());
 it('uses saved 5% of booking amount and full paid refund, independent of client-selected non-refundable policy',async()=>{
  const f=fixture();const result=await f.cancel();expect(result.penalty.penaltyAmount).toBe(300);expect(result.penalty.penaltyPercentage).toBe(5);
  expect(result.refund).toMatchObject({amountPaid:3000,refundAmount:3000,withheldAmount:0,policyRevision:3,policyConfigId:'saved-config',refundPercentage:100});expect(f.s.getPolicyConfig).not.toHaveBeenCalled();
 });
 it.each([[23.99,100],[24,5],[239.99,5],[240,4],[480,3],[720,2],[960,0]])('selects saved threshold at %s hours as %s percent',async(hours,percentage)=>{
  const f=fixture(hours);const result=await f.cancel();expect(result.penalty.penaltyPercentage).toBe(percentage);expect(result.penalty.penaltyAmount).toBe(6000*percentage/100);
 });
 it('uses saved vendor refund tiers rather than hardcoded full refund',async()=>{
  const f=fixture();f.settings.vendorCausedClientRefunds=[{minHoursBeforeEvent:0,percentage:100},{minHoursBeforeEvent:24,percentage:40}];
  expect((await f.cancel()).refund).toMatchObject({refundAmount:1200,withheldAmount:1800,refundPercentage:40});
 });
 it('uses final booking amount and rounds monetary fractions to cents',async()=>{
  const f=fixture();f.booking.finalAmount=5555.55;f.s.getAmountPaid=async()=>1234.56;f.settings.vendorCausedClientRefunds=[{minHoursBeforeEvent:0,percentage:33}];
  const result=await f.cancel();expect(result.penalty.penaltyAmount).toBe(277.78);expect(result.refund.refundAmount).toBe(407.4);expect(result.refund.withheldAmount).toBe(827.16);
 });
 it.each(['missing','invalid','date','amount'])('blocks %s data before changing booking or creating financial records',async kind=>{
  const f=fixture();if(kind==='missing')f.booking.policySnapshot=null;if(kind==='invalid')f.settings.vendorPenalties=[{minHoursBeforeEvent:0,percentage:101}];if(kind==='date')f.booking.eventStartDateTime=new Date('invalid');if(kind==='amount')f.booking.price=NaN;
  await expect(f.cancel()).rejects.toThrow(/Support/);expect(f.booking.save).not.toHaveBeenCalled();expect(f.s.refundModel.create).not.toHaveBeenCalled();expect(f.s.vendorPenaltyModel.create).not.toHaveBeenCalled();
 });
 it('allows fully-paid accepted bookings and prevents repeating a completed cancellation',async()=>{
  const f=fixture();f.booking.paymentStatus='PAID';f.s.getAmountPaid=async()=>6000;expect((await f.cancel()).refund.refundAmount).toBe(6000);await expect(f.cancel()).rejects.toThrow('Only a pending or confirmed');expect(f.s.refundModel.create).toHaveBeenCalledTimes(1);expect(f.s.vendorPenaltyModel.create).toHaveBeenCalledTimes(1);
 });
});

describe('Read-only vendor cancellation preview',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(now)});afterEach(()=>jest.useRealTimers());
 it('uses the same amounts as confirmation without writing cancellation/refund/penalty',async()=>{
  const f=fixture();const preview=await f.s.previewVendorCancellation('booking',{id:'vendor',role:'Vendor'});
  expect(preview).toMatchObject({vendorOrderId:'booking',bookingAmount:6000,amountPaid:3000,remainingAmount:3000,refundAmount:3000,penaltyAmount:300,penaltyPercentage:5,policyRevision:3});
  expect(f.booking.save).not.toHaveBeenCalled();expect(f.s.refundModel.create).not.toHaveBeenCalled();expect(f.s.vendorPenaltyModel.create).not.toHaveBeenCalled();
  const result=await f.cancel();expect(result.refund.refundAmount).toBe(preview.refundAmount);expect(result.penalty.penaltyAmount).toBe(preview.penaltyAmount);
 });
 it('rejects an unauthorized vendor before calculating a preview',async()=>{
  const f=fixture();f.s.assertVendorBookingOwner=jest.fn(async()=>{throw new Error('You do not own this vendor booking.')});
  await expect(f.s.previewVendorCancellation('booking',{id:'other',role:'Vendor'})).rejects.toThrow('do not own');expect(f.s.getAmountPaid).not.toHaveBeenCalled();
 });
});

describe('Phase 13A vendor cancellation coverage',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(now)});afterEach(()=>jest.useRealTimers());
 it.each(['pending','accepted'])('reviews and cancels unpaid %s with zero refund and saved penalty',async status=>{
  const f=fixture();f.booking.status=status;f.booking.paymentStatus='UNPAID';f.s.getAmountPaid=async()=>0;
  const result=await f.cancel();expect(result.vendorOrder.status).toBe('cancelled_by_vendor');expect(result.refund.refundAmount).toBe(0);expect(result.penalty.penaltyAmount).toBe(300);
 });
 it.each(['','   ', 'x'.repeat(501)])('rejects missing or invalid reason before any write',async reason=>{
  const f=fixture();await expect(f.s.vendorCancelConfirmedBooking('booking',reason,{id:'vendor',role:'Vendor'})).rejects.toThrow('reason');expect(f.booking.save).not.toHaveBeenCalled();
 });
 it('records saved policy and timestamp on the penalty ledger and notifies both parties',async()=>{
  const f=fixture();const result=await f.cancel();expect(result.penalty).toMatchObject({policyRevision:3,policyConfigId:'saved-config',penaltyPolicy:f.settings.vendorPenalties,calculatedAt:now,cancelledAt:now});
  expect(f.s.notifications.notifyUser.mock.calls.map((args:any[])=>args[0])).toEqual(['client','vendor']);
  expect(f.s.notifications.notifyUser.mock.calls[0][3]).toBe('REFUND_UPDATE');
 });
 it('notification failure cannot undo financial records or block the other recipient',async()=>{
  const f=fixture();f.s.notifications.notifyUser.mockRejectedValueOnce(new Error('push unavailable'));const result=await f.cancel();expect(result.refund.refundAmount).toBe(3000);expect(f.s.notifications.notifyUser).toHaveBeenCalledTimes(2);
 });
 it('blocks unresolved payment before writing cancellation or refund',async()=>{
  const f=fixture();f.s.paymentModel.exists=()=>query(true);await expect(f.cancel()).rejects.toThrow('payment is awaiting');expect(f.booking.save).not.toHaveBeenCalled();expect(f.s.refundModel.create).not.toHaveBeenCalled();
 });
 it('preserves the parent event and sibling vendor bookings',async()=>{
  const f=fixture();const photo={status:'accepted'},cake={status:'accepted'};const order={_id:'order',organizerId:'client',status:'confirmed',vendorOrders:[photo,cake,f.booking]};const before=JSON.stringify([photo,cake]);f.s.orderModel.findOne=()=>query(order);
  await f.cancel();expect(JSON.stringify([photo,cake])).toBe(before);expect(order.status).toBe('confirmed');expect(order.vendorOrders).toHaveLength(3);
 });
 it('aborts cancellation if financial recording fails, with no success notifications',async()=>{
  const f=fixture();f.s.refundModel.create.mockRejectedValueOnce(new Error('database error'));await expect(f.cancel()).rejects.toThrow('database error');expect(f.booking.status).toBe('accepted');expect(f.s.vendorPenaltyModel.create).not.toHaveBeenCalled();expect(f.s.notifications.notifyUser).not.toHaveBeenCalled();
 });
});

describe('Vendor ownership authority',()=>{
 it('rejects a vendor changing the booking ID to another vendor booking',async()=>{
  const s:any=Object.create(CancellationService.prototype);s.vendorOrderModel={findById:()=>query({vendorId:'other-vendor'})};
  await expect(s.assertVendorBookingOwner('507f191e810c19729de860ea',{id:'vendor',role:'Vendor'})).rejects.toThrow('do not own');
 });
 it('rejects a client calling vendor cancellation',async()=>{
  const s:any=Object.create(CancellationService.prototype);await expect(s.assertVendorBookingOwner('507f191e810c19729de860ea',{id:'client',role:'client'})).rejects.toThrow('Vendor access');
 });
});
