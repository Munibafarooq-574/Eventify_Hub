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
