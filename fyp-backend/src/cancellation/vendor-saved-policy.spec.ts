import { CancellationService } from './cancellation.service';
const now = new Date('2026-10-18T10:00:00Z');
function fixture(hours=96) {
 const settings:any={clientRefunds:{refundable:[{minHoursBeforeEvent:0,percentage:100}],partiallyRefundable:[{minHoursBeforeEvent:0,percentage:0}],nonRefundable:[{minHoursBeforeEvent:0,percentage:0}]},vendorCausedClientRefunds:[{minHoursBeforeEvent:0,percentage:100}],vendorPenalties:[{minHoursBeforeEvent:0,percentage:100},{minHoursBeforeEvent:24,percentage:5},{minHoursBeforeEvent:240,percentage:4},{minHoursBeforeEvent:480,percentage:3},{minHoursBeforeEvent:720,percentage:2},{minHoursBeforeEvent:960,percentage:0}],paymentHoldHours:24,postServiceIssueWindowHours:72};
 const booking:any={_id:'booking',vendorId:'vendor',status:'accepted',paymentStatus:'PARTIALLY_PAID',price:6000,eventStartDateTime:new Date(now.getTime()+hours*3600000),policySnapshot:{schemaVersion:1,policyRevision:3,policyConfigId:'saved-config',selectedPolicy:'NON-REFUNDABLE',settings},save:jest.fn(async()=>{})};
 const s:any=Object.create(CancellationService.prototype);
 s.assertVendorBookingOwner=jest.fn(async()=>booking);s.getAmountPaid=jest.fn(async()=>3000);
 s.paymentModel={find:()=>({select:()=>({lean:async()=>[{amount:3000,type:'DOWN_PAYMENT',method:'card',paidAt:now}]})})};
 s.getPolicyConfig=jest.fn(async()=>{throw new Error('Mutable Admin config must not be read')});
 s.rescheduleRequestModel={findOne:async()=>null};s.orderModel={findOne:async()=>({_id:'order',organizerId:'client'})};
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
 it('preserves fully-paid restriction and prevents repeating a completed cancellation',async()=>{
  const f=fixture();f.booking.paymentStatus='PAID';await expect(f.cancel()).rejects.toThrow('Support review');f.booking.paymentStatus='PARTIALLY_PAID';await f.cancel();await expect(f.cancel()).rejects.toThrow('Only a confirmed');expect(f.s.refundModel.create).toHaveBeenCalledTimes(1);expect(f.s.vendorPenaltyModel.create).toHaveBeenCalledTimes(1);
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
