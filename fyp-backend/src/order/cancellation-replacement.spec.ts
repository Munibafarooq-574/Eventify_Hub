jest.mock('@nestjs/schedule', () => ({ Cron: () => () => undefined }));
import { Types } from 'mongoose';
import { OrderService } from './order.service';
const id=()=>new Types.ObjectId();
const q=(value:any):any=>{const query:any={session:()=>query,select:()=>query,lean:async()=>value,then:(resolve:any,reject:any)=>Promise.resolve(value).then(resolve,reject)};return query};
function fixture(){
 const organizer=id(),category=id(),oldVendor=id(),newVendor=id(),city=id(),pkg=id();
 const old:any={_id:id(),vendorId:oldVendor,status:'cancelled_by_vendor',cancelledBy:'vendor',price:6000,save:jest.fn(async()=>{})};
 const sibling:any={_id:id(),vendorId:id(),status:'accepted',price:3000,originalAmount:3000,finalAmount:3000};
 const order:any={_id:id(),organizerId:organizer,eventId:'original-event',eventName:'Wedding',eventType:'Party',guests:15,eventDate:new Date('2026-11-10'),eventTime:'13:00',eventStartDateTime:new Date('2026-11-10T08:00:00Z'),eventDurationMinutes:180,eventCityId:city,eventAddress:'Venue',selectedCategoryIds:[category],status:'confirmed',vendorOrders:[old._id,sibling._id],totalAmount:9000,finalAmount:9000,save:jest.fn(async()=>{})};old.orderId=order._id;
 const s:any=Object.create(OrderService.prototype);
 s.cancellationService={assertClientBookingOwner:jest.fn(async(_id:any,actor:any)=>{if(actor.id!==String(organizer))throw Error('You do not own this booking');return{vendorOrder:old,order}}),getPolicyConfig:async()=>({}),buildBookingPolicySnapshot:()=>({policyRevision:3})};
 s.rescheduleRequestModel={exists:()=>q(false)};
 s.vendorOrderModel={find:()=>q([sibling]),exists:()=>q(false),create:jest.fn(async([data]:any[])=>[{_id:id(),...data}])};
 s.userModel={findById:()=>q({buisnessCategory:category}),updateOne:async()=>({matchedCount:1}),find:()=>q([{_id:newVendor,buisnessCategory:category,packages:[{_id:pkg,bookingType:'CUSTOM',price:6000,isActive:true}]}])};
 s.orderModel={findOne:()=>q({_id:order._id}),create:jest.fn()};
 s.categoryModel={findById:()=>q({name:'Photography'}),find:()=>q([{_id:category,name:'Photography',normalizedName:'photography'}])};
 s.cityService={requireActiveCity:async()=>({}),requireCityTimeZone:async()=>'Asia/Karachi'};
 s.featureAccessService={hasActiveSubscription:async()=>true};
 s.availabilityService={checkVendorAvailability:jest.fn(async()=>({available:true,requiredServiceWindow:{startDateTime:order.eventStartDateTime,endDateTime:new Date('2026-11-10T11:00:00Z')},maxConcurrentBookings:1}))};
 s.connection={startSession:async()=>({endSession:async()=>{},withTransaction:async(callback:any)=>callback()})};s.sendPushNotification=jest.fn(async()=>{});
 const actor={id:String(organizer),role:'client'};
 const create=()=>s.createOrder(actor.id,new Date('2027-01-01'),'18:00',[{vendorId:String(newVendor),packageId:String(pkg),serviceName:'Forged',price:1,durationMinutes:180}], 'Forged',2,'Other',60,String(id()),'Other',[], 'other-event',undefined,String(old._id));
 return{s,old,sibling,order,actor,newVendor,category,create};
}
describe('Cancelled-vendor replacement restrictions and checkout',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-10-19T07:00:00Z'))});afterEach(()=>jest.useRealTimers());
 it('returns authoritative original event context, category and excluded active vendors',async()=>{
  const f=fixture();const result=await f.s.getCancellationReplacementContext(String(f.old._id),f.actor);
  expect(result.eventDetails).toMatchObject({eventName:'Wedding',eventDate:'2026-11-10',startTime:'13:00',durationMinutes:180,replacementVendorOrderId:String(f.old._id)});
  expect(result.excludedVendorIds).toEqual([String(f.old.vendorId),String(f.sibling.vendorId)]);
 });
 it('blocks another client before exposing event information',async()=>{const f=fixture();await expect(f.s.getCancellationReplacementContext(String(f.old._id),{id:String(id()),role:'client'})).rejects.toThrow('do not own')});
 it.each([0,-1])('blocks context, continue-without and checkout at/after event start (%s ms)',async offset=>{
  const f=fixture();f.order.eventStartDateTime=new Date(Date.now()+offset);
  await expect(f.s.getCancellationReplacementContext(String(f.old._id),f.actor)).rejects.toThrow('before');
  await expect(f.s.continueWithoutCancelledVendor(String(f.old._id),f.actor)).rejects.toThrow('before');await expect(f.create()).rejects.toThrow('before');expect(f.s.vendorOrderModel.create).not.toHaveBeenCalled();
 });
 it('does not treat client cancellation as vendor replacement',async()=>{const f=fixture();f.old.cancelledBy='organizer';await expect(f.create()).rejects.toThrow('vendor-cancelled')});
 it('blocks active replacement and supports retry after rejection',async()=>{const f=fixture();f.s.vendorOrderModel.find=()=>q([{...f.sibling,replacesVendorOrderId:f.old._id}]);await expect(f.create()).rejects.toThrow('already exists');f.s.vendorOrderModel.find=()=>q([f.sibling]);await expect(f.s.getCancellationReplacementContext(String(f.old._id),f.actor)).resolves.toBeDefined()});
 it('blocks unresolved date change and directs cancelled replacement chains to latest booking',async()=>{const f=fixture();f.s.rescheduleRequestModel.exists=()=>q(true);await expect(f.create()).rejects.toThrow('schedule change');f.s.rescheduleRequestModel.exists=()=>q(false);f.s.vendorOrderModel.exists=()=>q(true);await expect(f.create()).rejects.toThrow('latest cancelled')});
 it('keeps continue-without separate from refund and permits later search',async()=>{const f=fixture();await f.s.continueWithoutCancelledVendor(String(f.old._id),f.actor);expect(f.old.cancellationReplacementChoice).toBe('CONTINUE_WITHOUT');expect(f.order.save).not.toHaveBeenCalled();await expect(f.s.getCancellationReplacementContext(String(f.old._id),f.actor)).resolves.toBeDefined()});
 it('adds exactly one pending replacement into the same event with canonical schedule/price and preserved sibling/history',async()=>{
  const f=fixture();const result=await f.create();expect(result._id).toEqual(f.order._id);expect(f.s.orderModel.create).not.toHaveBeenCalled();
  const record=f.s.vendorOrderModel.create.mock.calls[0][0][0];expect(record).toMatchObject({status:'pending',orderId:f.order._id,replacesVendorOrderId:String(f.old._id),finalAmount:6000,eventStartDateTime:f.order.eventStartDateTime});
  expect(f.order.vendorOrders).toHaveLength(3);expect(f.order.vendorOrders.slice(0,2)).toEqual([f.old._id,f.sibling._id]);expect(f.sibling.status).toBe('accepted');expect(f.old.status).toBe('cancelled_by_vendor');expect(f.order.finalAmount).toBe(9000);expect(f.order.eventName).toBe('Wedding');
 });
 it('blocks another category or an already active vendor',async()=>{
  const f=fixture();f.s.userModel.find=()=>q([{_id:f.newVendor,buisnessCategory:id(),packages:[]}]);await expect(f.create()).rejects.toThrow('category');expect(f.s.vendorOrderModel.create).not.toHaveBeenCalled();
  f.s.vendorOrderModel.find=()=>q([{...f.sibling,vendorId:f.newVendor}]);await expect(f.create()).rejects.toThrow('already active');
 });
 it('rechecks event deadline inside the checkout transaction',async()=>{
  const f=fixture();f.s.userModel.updateOne=async()=>{f.order.eventStartDateTime=new Date(Date.now());return{matchedCount:1}};await expect(f.create()).rejects.toThrow('before');expect(f.s.vendorOrderModel.create).not.toHaveBeenCalled();
 });
 it('cannot accept a pending replacement after event start',async()=>{const f=fixture();f.s.vendorOrderModel.findById=async()=>({...f.old,status:'pending',replacesVendorOrderId:id(),replacementRescheduleRequestId:null});f.s.orderModel.findById=async()=>({...f.order,eventStartDateTime:new Date(Date.now())});await expect(f.s.updateVendorResponse(String(id()),'accepted')).rejects.toThrow('after the event')});
});

describe('Subscription changes during replacement checkout',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-10-19T07:00:00Z'))});afterEach(()=>jest.useRealTimers());
 it('blocks new checkout after expiry without mutating original booking price, payment or siblings',async()=>{
  const f=fixture();const before=JSON.stringify(f.order);f.s.featureAccessService.hasActiveSubscription=async()=>false;
  await expect(f.create()).rejects.toThrow('existing bookings remain valid');
  expect(f.s.vendorOrderModel.create).not.toHaveBeenCalled();expect(f.order.save).not.toHaveBeenCalled();
  expect(JSON.stringify(f.order)).toBe(before);expect(f.sibling.status).toBe('accepted');
 });
});

function laterFixture() {
 const f=fixture();f.old.status='pending';f.old.cancelledBy=null;f.old.paymentStatus='UNPAID';f.old.eventStartDateTime=new Date('2026-11-10T08:00:00Z');
 f.old.laterTimeRequest={status:'PENDING',reason:'More time needed',requestedAt:new Date()};
 f.s.connection.model=()=>({exists:()=>q(false)});f.s.vendorOrderModel.updateOne=jest.fn(async()=>({matchedCount:1}));
 return f;
}
describe('Pending later-time request replacement reuses existing checkout',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-10-19T07:00:00Z'))});afterEach(()=>jest.useRealTimers());
 it('browsing preserves the old pending booking',async()=>{const f=laterFixture();await f.s.getCancellationReplacementContext(String(f.old._id),f.actor);expect(f.old.status).toBe('pending');expect(f.old.save).not.toHaveBeenCalled()});
 it('successful replacement closes only the old assignment and preserves siblings',async()=>{const f=laterFixture();await f.create();expect(f.old.status).toBe('rejected');expect(f.old.replacementOutcome).toBe('NO_LONGER_ASSIGNED');expect(f.old.laterTimeRequest.status).toBe('REPLACED');expect(f.old.replacementFinalizedAt).toEqual(new Date());expect(f.order.finalAmount).toBe(9000);expect(f.sibling.status).toBe('accepted');expect(f.s.vendorOrderModel.create).toHaveBeenCalledTimes(1)});
 it('failed replacement validation preserves old booking and price',async()=>{const f=laterFixture();f.s.featureAccessService.hasActiveSubscription=async()=>false;await expect(f.create()).rejects.toThrow();expect(f.old.status).toBe('pending');expect(f.old.laterTimeRequest.status).toBe('PENDING');expect(f.old.save).not.toHaveBeenCalled();expect(f.order.finalAmount).toBe(9000)});
 it('continue without affects only this unpaid assignment and is idempotent',async()=>{const f=laterFixture();await f.s.continueWithoutCancelledVendor(String(f.old._id),f.actor);expect(f.old.laterTimeRequest.status).toBe('CONTINUE_WITHOUT');expect(f.old.replacementOutcome).toBe('NO_LONGER_ASSIGNED');expect(f.order.finalAmount).toBe(3000);expect(f.sibling.status).toBe('accepted');const count=f.s.sendPushNotification.mock.calls.length;await f.s.continueWithoutCancelledVendor(String(f.old._id),f.actor);expect(f.s.sendPushNotification).toHaveBeenCalledTimes(count);expect(f.old.save).toHaveBeenCalledTimes(1)});
 it('rejects paid bookings, wrong clients, duplicate replacements and past events',async()=>{
  const f=laterFixture();f.old.paymentStatus='PARTIALLY_PAID';await expect(f.s.getCancellationReplacementContext(String(f.old._id),f.actor)).rejects.toThrow('payment');f.old.paymentStatus='UNPAID';
  await expect(f.s.getCancellationReplacementContext(String(f.old._id),{id:String(id()),role:'client'})).rejects.toThrow('own');
  f.s.vendorOrderModel.find=()=>q([{...f.sibling,replacesVendorOrderId:f.old._id}]);await expect(f.create()).rejects.toThrow('already exists');
  f.order.eventStartDateTime=new Date();await expect(f.s.continueWithoutCancelledVendor(String(f.old._id),f.actor)).rejects.toThrow('before');expect(f.old.save).not.toHaveBeenCalled();
 });
 it('cannot accept while a later-time decision is pending',async()=>{const f=laterFixture();f.s.vendorOrderModel.findById=()=>q(f.old);await expect(f.s.updateVendorResponse(String(f.old._id),'accepted')).rejects.toThrow('awaiting');expect(f.old.save).not.toHaveBeenCalled()});
});

describe('Vendor later-time request authorization, timing and duplicate safety',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-11-10T06:50:00Z'))});afterEach(()=>jest.useRealTimers());
 function requestFixture(){const f=laterFixture();delete f.old.laterTimeRequest;f.s.orderModel.findById=()=>q(f.order);
  f.s.cancellationService.assertVendorBookingOwner=async(_id:any,actor:any)=>{if(actor.role!=='vendor'||actor.id!==String(f.old.vendorId))throw Error('Vendor ownership required');return f.old};
  f.s.userModel.findById=()=>q({availabilitySettings:{minimumAdvanceMinutes:60}});return f;
 }
 it('stores one request with city timezone suggestion and notifies each party once',async()=>{const f=requestFixture();const actor={id:String(f.old.vendorId),role:'vendor'};
  const result=await f.s.requestLaterServiceTime(String(f.old._id),actor,{reason:' Please choose a later time ',suggestedDate:'2026-11-10',suggestedTime:'15:00'});
  expect(result.reason).toBe('Please choose a later time');expect(result.suggestedEventStart).toEqual(new Date('2026-11-10T10:00:00Z'));expect(f.old.status).toBe('pending');
  await f.s.requestLaterServiceTime(String(f.old._id),actor,{reason:'Retry'});expect(f.old.save).toHaveBeenCalledTimes(1);expect(f.s.sendPushNotification).toHaveBeenCalledTimes(2);
 });
 it('blocks other vendors, blank reasons, past events and requests when normal acceptance is possible',async()=>{const f=requestFixture();const actor={id:String(f.old.vendorId),role:'vendor'};
  await expect(f.s.requestLaterServiceTime(String(f.old._id),{...actor,id:String(id())},{reason:'Later'})).rejects.toThrow('ownership');
  await expect(f.s.requestLaterServiceTime(String(f.old._id),actor,{reason:'  '})).rejects.toThrow('reason');
  jest.setSystemTime(new Date('2026-11-10T05:00:00Z'));await expect(f.s.requestLaterServiceTime(String(f.old._id),actor,{reason:'Later'})).rejects.toThrow('enough time');
  jest.setSystemTime(new Date('2026-11-10T08:00:00Z'));await expect(f.s.requestLaterServiceTime(String(f.old._id),actor,{reason:'Later'})).rejects.toThrow('before');expect(f.old.save).not.toHaveBeenCalled();
 });
 it('rejects accepted, paid and zero advance requests without mutation',async()=>{const f=requestFixture();const actor={id:String(f.old.vendorId),role:'vendor'};
  f.old.status='accepted';await expect(f.s.requestLaterServiceTime(String(f.old._id),actor,{reason:'Later'})).rejects.toThrow('pending unpaid');f.old.status='pending';
  f.s.connection.model=()=>({exists:()=>q(true)});await expect(f.s.requestLaterServiceTime(String(f.old._id),actor,{reason:'Later'})).rejects.toThrow('payment');f.s.connection.model=()=>({exists:()=>q(false)});
  f.s.userModel.findById=()=>q({cakeBusinessDetails:{downPaymentType:'FIXED',downPayment:0}});await expect(f.s.requestLaterServiceTime(String(f.old._id),actor,{reason:'Later'})).rejects.toThrow('No advance');expect(f.old.save).not.toHaveBeenCalled();
 });
});

describe('Later-time decisions use the existing reschedule approval flow',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-11-10T06:50:00Z'))});afterEach(()=>jest.useRealTimers());
 function setup(){const f=laterFixture();f.s.orderModel.findById=()=>q(f.order);f.s.vendorOrderModel.find=()=>q([f.sibling,f.old]);f.s.vendorOrderModel.findById=()=>q(f.old);f.s.rescheduleRequestModel.findOne=()=>q(null);f.s.rescheduleRequestModel.create=jest.fn(async(data:any)=>Array.isArray(data)?data:data);f.s.chatService={createOrGetConversation:async()=>'chat',createMessage:async()=>{}};return f;}
 const dto={eventDate:'2026-11-11',eventTime:'15:00',durationMinutes:60,reason:'Later time requested'};
 it('records the client decision atomically, retains both vendors and awaits their approvals',async()=>{const f=setup();const result=await f.s.requestEventReschedule(String(f.order._id),f.actor.id,dto);expect(result.requests).toHaveLength(2);expect(f.old.laterTimeRequest.status).toBe('RESCHEDULE_REQUESTED');expect(f.old.laterTimeRequest.resolvedAt).toEqual(new Date());expect(f.old.status).toBe('pending');expect(f.sibling.status).toBe('accepted');expect(f.order.eventTime).toBe('13:00');expect(f.s.rescheduleRequestModel.create.mock.calls[0][1]).toHaveProperty('session');expect(f.s.sendPushNotification).toHaveBeenCalledTimes(2)});
 it('does not create schedule requests if replacement closed the assignment concurrently',async()=>{const f=setup();f.s.vendorOrderModel.findById=()=>q({...f.old,status:'rejected',replacementOutcome:'NO_LONGER_ASSIGNED'});await expect(f.s.requestEventReschedule(String(f.order._id),f.actor.id,dto)).rejects.toThrow('changed');expect(f.s.rescheduleRequestModel.create).not.toHaveBeenCalled()});
 it('preserves existing paid-event rescheduling restrictions',async()=>{const f=setup();f.sibling.paymentStatus='PARTIALLY_PAID';await expect(f.s.requestEventReschedule(String(f.order._id),f.actor.id,dto)).rejects.toThrow('before any down payment');expect(f.s.rescheduleRequestModel.create).not.toHaveBeenCalled();expect(f.old.laterTimeRequest.status).toBe('PENDING')});
 it('does not close a later-time decision when request creation fails',async()=>{const f=setup();f.s.rescheduleRequestModel.create.mockRejectedValue(new Error('Storage unavailable'));await expect(f.s.requestEventReschedule(String(f.order._id),f.actor.id,dto)).rejects.toThrow('Storage unavailable');expect(f.old.laterTimeRequest.status).toBe('PENDING');expect(f.old.save).not.toHaveBeenCalled()});
});
