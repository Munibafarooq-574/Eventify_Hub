import { VendorAvailabilityService } from './vendor-availability.service';
const q=(v:any):any=>{const x:any={select:()=>x,lean:async()=>v,session:()=>x,then:(a:any,b:any)=>Promise.resolve(v).then(a,b)};return x;};
const id='6abbc3ff910b091749a9d856', packageId='6abbc57e910b091749a9d901';
function fixture(){
 const pkg:any={_id:packageId,bookingType:'DELIVERY_BASED',deliveryFeeType:'PAID',deliveryFee:300,deliveryReserveMinutes:30,serviceWindowStartOffsetMinutes:-60,serviceWindowEndOffsetMinutes:0};
 const vendor:any={role:'Vendor',businessCityId:id,cakeBusinessDetails:{downPaymentType:'FIXED',downPayment:100},availabilitySettings:{workingHoursStart:'09:00',workingHoursEnd:'18:00',minimumAdvanceMinutes:60},packages:[pkg]};
 const service:any=Object.create(VendorAvailabilityService.prototype);
 const overlap=jest.fn((filter?:any)=>q(0));Object.assign(service,{userModel:{findById:()=>q(vendor)},vendorOrderModel:{countDocuments:overlap},cityService:{requireCityTimeZone:async()=>'Asia/Karachi'}});
 const check=(selected='2026-11-09T08:30:00Z',config?:any)=>service.checkVendorAvailability(id,new Date('2026-11-09T09:00:00Z'),new Date('2026-11-09T11:00:00Z'),packageId,undefined,undefined,false,'Asia/Karachi',{startDateTime:selected,configuration:config});
 return {service,pkg,vendor,overlap,check};
}
describe('Delivery reuses working hours, notice, payment and capacity rules',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-11-08T05:00:00Z'))});afterEach(()=>jest.useRealTimers());
 it('checks only the selected half-hour',async()=>{const f=fixture();const r=await f.check();expect(r.available).toBe(true);expect(r.requiredServiceWindow).toEqual({startDateTime:new Date('2026-11-09T08:30:00Z'),endDateTime:new Date('2026-11-09T09:00:00Z')});expect(f.overlap.mock.calls[0][0]).toMatchObject({eventStartDateTime:{$lt:new Date('2026-11-09T09:00:00Z')},eventEndDateTime:{$gt:new Date('2026-11-09T08:30:00Z')}})});
 it('blocks overlap while allowing another delivery time',async()=>{const f=fixture();f.overlap.mockImplementation((filter:any)=>q(+filter.eventEndDateTime.$gt===+new Date('2026-11-09T08:30:00Z')?1:0));expect((await f.check()).available).toBe(false);expect((await f.check('2026-11-09T09:00:00Z')).available).toBe(true)});
 it('checks working hours, blocked dates and booking notice',async()=>{const f=fixture();f.vendor.availabilitySettings.workingHoursEnd='13:45';expect((await f.check()).available).toBe(false);f.vendor.availabilitySettings.workingHoursEnd='18:00';f.vendor.availabilitySettings.blockedDates=[new Date('2026-11-09')];expect((await f.check()).available).toBe(false);f.vendor.availabilitySettings.blockedDates=[];jest.setSystemTime(new Date('2026-11-09T08:00:00Z'));expect((await f.check()).available).toBe(false)});
 it('requires payment time on ordinary checkout and does not bypass notice for zero down payment',async()=>{const f=fixture();jest.setSystemTime(new Date('2026-11-09T07:20:00Z'));expect((await f.check()).available).toBe(false);f.vendor.cakeBusinessDetails.downPayment=0;expect((await f.check()).available).toBe(false)});
 it('uses frozen delivery terms after package edits',async()=>{const f=fixture();const saved={...f.pkg};f.pkg.serviceWindowStartOffsetMinutes=120;f.pkg.bookingType='CUSTOM';expect((await f.check(undefined,saved)).available).toBe(true);expect((await f.check('2026-11-09T07:00:00Z',saved)).available).toBe(false)});
 it('discovers a free alternative if the first delivery time is busy',async()=>{const f=fixture();f.overlap.mockImplementation((filter:any)=>q(+filter.eventEndDateTime.$gt===+new Date('2026-11-09T08:00:00Z')?1:0));const r=await f.service.checkVendorAvailability(id,new Date('2026-11-09T09:00:00Z'),new Date('2026-11-09T11:00:00Z'),packageId);expect(r.available).toBe(true);expect(+r.requiredServiceWindow.startDateTime).toBeGreaterThan(+new Date('2026-11-09T08:00:00Z'))});
});
