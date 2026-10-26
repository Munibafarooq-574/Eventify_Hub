import { VendorAvailabilityService } from './vendor-availability.service';
const id='6abbc3ff910b091749a9d856';
const q=(value:any):any=>{const query:any={select:()=>query,lean:async()=>value,session:()=>query,then:(resolve:any,reject:any)=>Promise.resolve(value).then(resolve,reject)};return query};
function fixture(){
 const booking={eventStartDateTime:new Date('2026-10-26T15:00:00Z'),eventEndDateTime:new Date('2026-10-26T16:00:00Z'),status:'pending',serviceName:'Photography'};
 const vendor:any={role:'Vendor',businessCityId:id,availabilitySettings:{workingHoursStart:'09:00',workingHoursEnd:'23:00',minimumAdvanceMinutes:120},packages:[]};
 const model:any={find:jest.fn(()=>q([booking])),countDocuments:jest.fn(filter=>q(booking.eventStartDateTime<filter.eventStartDateTime.$lt&&booking.eventEndDateTime>filter.eventEndDateTime.$gt?1:0))};
 const s:any=Object.create(VendorAvailabilityService.prototype);Object.assign(s,{userModel:{findById:()=>q(vendor)},vendorOrderModel:model,cityService:{requireCityTimeZone:async()=>'Asia/Karachi'},featureAccessService:{hasActiveSubscription:async()=>true}});return{s,model};
}
describe('Authoritative calendar and half-hour availability',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-10-26T12:00:00Z'))});afterEach(()=>jest.useRealTimers());
 it('accepts ISO calendar dates and returns bookings without the orders page limit',async()=>{const f=fixture();const day=await f.s.getDaySlots(id,'2026-10-26');expect(day.bookings).toHaveLength(1);expect(day.bookings[0].start).toEqual(new Date('2026-10-26T15:00:00Z'));expect(f.model.find.mock.calls[0][0].status.$in).toEqual(['pending','accepted','completed']);expect(day.date).toBe('2026-10-26')});
 it('rejects malformed dates',async()=>{await expect(fixture().s.getDaySlots(id,'26-10-2026')).rejects.toThrow('YYYY-MM-DD')});
 it('preserves the correct 8:30 overlap rejection and permits the 9:00 boundary',async()=>{const{s}=fixture();const overlap=await s.checkVendorAvailability(id,new Date('2026-10-26T15:30:00Z'),new Date('2026-10-26T16:30:00Z'));expect(overlap.available).toBe(false);expect(overlap.reason).toContain('already booked');const adjacent=await s.checkVendorAvailability(id,new Date('2026-10-26T16:00:00Z'),new Date('2026-10-26T17:00:00Z'));expect(adjacent.available).toBe(true)});
});
