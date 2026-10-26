import { PaymentService } from './payment.service';
import { OrderService } from '../order/order.service';
jest.mock('@nestjs/schedule',()=>({Cron:()=>()=>undefined}));
const q=(value:any):any=>{const query:any={session:()=>query,lean:async()=>value,select:()=>query,populate:()=>query,sort:()=>query,then:(resolve:any,reject:any)=>Promise.resolve(value).then(resolve,reject)};return query};
function fixture(){
 const booking:any={_id:'booking',orderId:'order',vendorId:'vendor',status:'accepted',price:6000,finalAmount:6000,downPaymentAmount:3000,paymentStatus:'PAYMENT_REQUIRED',paymentPreparationMinutes:120,eventStartDateTime:new Date('2026-10-24T13:00:00Z'),paymentServiceCutoff:new Date('2026-10-24T11:00:00Z'),paymentDeadline:new Date('2026-10-24T11:00:00Z'),save:jest.fn(async()=>{})};
 const payments:any[]=[];const session:any={withTransaction:async(fn:any)=>fn(),endSession:jest.fn()};
 const connection:any={startSession:async()=>session,model:()=>paymentModel};
 const bookingModel:any={db:connection,updateOne:jest.fn(),findById:()=>q(booking),find:()=>q([booking])};
 const paymentModel:any={findById:(id:string)=>q(payments.find(p=>p._id===id)),findOne:(query:any)=>q(payments.find(p=>p.type===query.type&&p.status===query.status)),find:(query:any)=>q(payments.filter(p=>p.status===query.status)),exists:()=>q(payments.find(p=>['PENDING','SUCCESS'].includes(p.status))),create:jest.fn(async([data]:any[])=>{const p={_id:'payment',createdAt:new Date(),...data,save:jest.fn(async()=>{})};payments.push(p);return[p]})};
 const s:any=Object.create(PaymentService.prototype);s.vendorOrderModel=bookingModel;s.paymentModel=paymentModel;s.assertOrganizerOwnsVendorOrder=async()=>({_id:'order',organizerId:'client'});s.rescheduleRequestModel={exists:async()=>false};s.userModel={findById:()=>q(null)};s.orderModel={findById:()=>q(null)};
 return{s,booking,payments,session,connection,bookingModel,paymentModel};
}
describe('Down payment and expiry safety',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-10-24T09:00:00Z'))});afterEach(()=>jest.useRealTimers());
 it('submits once before cutoff and rejects duplicate pending payment',async()=>{const f=fixture();await f.s.initiatePayment('booking','CARD','client');await expect(f.s.initiatePayment('booking','CARD','client')).rejects.toThrow('already pending');expect(f.payments).toHaveLength(1)});
 it('blocks exact deadline and late payment without creating a record',async()=>{for(const now of ['2026-10-24T11:00:00Z','2026-10-24T12:59:00Z']){jest.setSystemTime(new Date(now));const f=fixture();await expect(f.s.initiatePayment('booking','CARD','client')).rejects.toThrow('deadline');expect(f.paymentModel.create).not.toHaveBeenCalled()}});
 it('confirmation commits successful payment and secured booking together',async()=>{const f=fixture();await f.s.initiatePayment('booking','CARD','client');await f.s.confirmPayment('payment');expect(f.booking.paymentStatus).toBe('PARTIALLY_PAID');expect(f.booking.confirmationTime).toEqual(f.payments[0].paidAt);expect(f.booking.paymentDeadline).toBeNull();expect(f.payments[0].save).toHaveBeenCalledWith({session:f.session});expect(f.booking.save).toHaveBeenCalledWith({session:f.session})});
 it('blocks overdue confirmation and leaves pending payment available for review',async()=>{const f=fixture();await f.s.initiatePayment('booking','CARD','client');jest.setSystemTime(new Date('2026-10-24T11:00:00Z'));await expect(f.s.confirmPayment('payment')).rejects.toThrow('verification is overdue');expect(f.payments[0].status).toBe('PENDING');expect(f.booking.paymentStatus).toBe('PAYMENT_REQUIRED')});
 it('rejecting pending advance allows retry only within the original deadline',async()=>{const f=fixture();await f.s.initiatePayment('booking','CARD','client');await f.s.failPayment('payment','Rejected');expect(f.booking.paymentStatus).toBe('PAYMENT_FAILED');expect(f.booking.paymentDeadline).toEqual(new Date('2026-10-24T11:00:00Z'));jest.setSystemTime(new Date('2026-10-24T11:01:00Z'));await expect(f.s.initiatePayment('booking','CARD','client')).rejects.toThrow('deadline')});
 it.each(['PENDING','SUCCESS'])('expiry preserves a %s payment',async status=>{const f=fixture();f.payments.push({status});jest.setSystemTime(new Date('2026-10-24T11:01:00Z'));const order:any=Object.create(OrderService.prototype);Object.assign(order,{connection:f.connection,vendorOrderModel:f.bookingModel});const result=await order.expireStaleHolds();expect(result.expiredCount).toBe(0);expect(f.booking.status).toBe('accepted')});
 it('expires only an unpaid booking and notifies both parties',async()=>{const f=fixture();jest.setSystemTime(new Date('2026-10-24T11:01:00Z'));const order:any=Object.create(OrderService.prototype);Object.assign(order,{connection:f.connection,vendorOrderModel:f.bookingModel,orderModel:{findById:async()=>({organizerId:'client'})},sendPushNotification:jest.fn()});expect((await order.expireStaleHolds()).expiredCount).toBe(1);expect(f.booking.status).toBe('expired');expect(f.booking.paymentStatus).toBe('PAYMENT_EXPIRED');expect(f.booking.expiredAt).toEqual(new Date());expect(order.sendPushNotification).toHaveBeenCalledTimes(2)});
 it('repeat vendor acceptance cannot reset an existing payment window',async()=>{const f=fixture();const order:any=Object.create(OrderService.prototype);order.vendorOrderModel={findById:async()=>f.booking};const before=f.booking.paymentDeadline;await order.updateVendorResponse('booking','accepted');expect(f.booking.paymentDeadline).toBe(before);expect(f.booking.save).not.toHaveBeenCalled()});
 it.each([0,50])('acceptance preserves no-advance behavior or snapshots a deadline (%s)',async downPayment=>{
  const f=fixture();f.booking.status='pending';const o:any=Object.create(OrderService.prototype);
  Object.assign(o,{vendorOrderModel:{findById:async()=>f.booking},userModel:{findById:()=>q({availabilitySettings:{minimumAdvanceMinutes:120},cakeBusinessDetails:{downPaymentType:'FIXED',downPayment}})},orderModel:{findById:()=>q(null),findOne:async()=>null},commissionConfigModel:{findOne:async()=>null}});
  await o.updateVendorResponse('booking','accepted');expect(f.booking.status).toBe('accepted');
  expect(f.booking.acceptedAt).toEqual(new Date());
  if(downPayment===0){expect(f.booking.confirmationTime).toEqual(f.booking.acceptedAt);expect(f.booking.paymentStatus).toBe('PARTIALLY_PAID');expect(f.booking.paymentDeadline).toBeNull();expect(f.booking.holdExpiresAt).toBeNull()}
  else{expect(f.booking.paymentDeadline).toEqual(new Date('2026-10-24T11:00:00Z'));expect(f.booking.paymentPreparationMinutes).toBe(120)}
 });
 it('remaining payment confirmation stays available after service completion',async()=>{const f=fixture();f.booking.status='completed';f.booking.paymentStatus='PARTIALLY_PAID';f.payments.push({_id:'remaining',type:'REMAINING',status:'PENDING',vendorOrderId:'booking',amount:6000,createdAt:new Date(),save:jest.fn()});jest.setSystemTime(new Date('2026-10-25T09:00:00Z'));f.s.payoutService={createPayoutIfEligible:async()=>{}};await f.s.confirmPayment('remaining');expect(f.booking.paymentStatus).toBe('PAID');expect(f.booking.confirmationTime).toBeUndefined()});

});


describe('Past unaccepted booking safety',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-10-24T14:00:00Z'))});afterEach(()=>jest.useRealTimers());
 it.each(['none','PENDING','SUCCESS','paid','future'])('expires only an elapsed unaccepted unpaid request (%s)',async state=>{
  const f=fixture();f.booking.status='pending';if(state==='paid')f.booking.paymentStatus='PARTIALLY_PAID';if(state==='future')f.booking.eventStartDateTime=new Date('2026-10-25T14:00:00Z');if(['PENDING','SUCCESS'].includes(state))f.payments.push({status:state});
  const order:any=Object.create(OrderService.prototype);Object.assign(order,{connection:f.connection,vendorOrderModel:f.bookingModel,orderModel:{findById:async()=>({organizerId:'client'})},sendPushNotification:jest.fn()});
  const result=await order.expireStaleHolds();expect(result.expiredCount).toBe(state==='none'?1:0);expect(f.booking.status).toBe(state==='none'?'expired':'pending');if(state==='none'){expect(order.sendPushNotification.mock.calls[0][0]).toBe('Booking request expired');expect(f.booking.paymentStatus).toBe('PAYMENT_REQUIRED')}
 });
 it('rejects rescheduling a past original event even to a future date',async()=>{
  const id='6abab19c35e1c2ca3c674c98';const order:any=Object.create(OrderService.prototype);Object.assign(order,{orderModel:{findById:()=>q({organizerId:id,status:'pending',eventCityId:id,eventStartDateTime:new Date('2026-10-19T10:00:00Z')})},cityService:{requireCityTimeZone:async()=>'Asia/Karachi'}});
  await expect(order.requestEventReschedule(id,id,{eventDate:'2026-10-30',eventTime:'13:00',durationMinutes:60,reason:'Change timing'})).rejects.toThrow('already started');
 });
});
