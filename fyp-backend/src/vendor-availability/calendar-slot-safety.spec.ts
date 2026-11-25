import { validate } from 'class-validator';
import { model, Schema } from 'mongoose';
import { VendorAvailabilitySettingsSchema } from '../schemas/user.schema';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { VendorAvailabilityService } from './vendor-availability.service';
const id='6abbc3ff910b091749a9d856';
const q=(value:any):any=>{const query:any={select:()=>query,lean:async()=>value,session:()=>query,then:(resolve:any,reject:any)=>Promise.resolve(value).then(resolve,reject)};return query};
function fixture(){
 const booking={eventStartDateTime:new Date('2026-10-26T15:00:00Z'),eventEndDateTime:new Date('2026-10-26T16:00:00Z'),status:'pending',serviceName:'Photography'};
 const vendor:any={role:'Vendor',businessCityId:id,availabilitySettings:{workingHoursStart:'09:00',workingHoursEnd:'23:00',minimumAdvanceMinutes:120},packages:[]};
 const model:any={find:jest.fn(()=>q([booking])),countDocuments:jest.fn(filter=>q(booking.eventStartDateTime<filter.eventStartDateTime.$lt&&booking.eventEndDateTime>filter.eventEndDateTime.$gt?1:0))};
 const s:any=Object.create(VendorAvailabilityService.prototype);Object.assign(s,{userModel:{findById:()=>q(vendor)},vendorOrderModel:model,cityService:{requireCityTimeZone:async()=>'Asia/Karachi'},featureAccessService:{hasActiveSubscription:async()=>true}});return{s,model,vendor};
}
describe('Public vendor schedule', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-24T20:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('uses the vendor-local date and does not expose slots for past dates', async () => {
    const { s, model, vendor } = fixture();
    vendor.availabilitySettings.blockedDates = ['2026-10-24', '2026-10-27'].map(date => new Date(date));
    await expect(s.getPublicSchedule(id, '2026-10-24')).resolves.toMatchObject({
      today: '2026-10-25', blockedDates: ['2026-10-27'], unavailable: true, slots: [],
    });
    expect(model.find).not.toHaveBeenCalled();
  });
  it('labels a held slot booked without returning booking details', async () => {
    const { s } = fixture();
    const day = await s.getPublicSchedule(id, '2026-10-26');
    expect(day.unavailable).toBe(false);
    expect(day.slots).toContainEqual({
      start: new Date('2026-10-26T15:00:00Z'),
      end: new Date('2026-10-26T16:00:00Z'),
      booked: true,
    });
    expect(day.slots).toContainEqual({
      start: new Date('2026-10-26T16:00:00Z'),
      end: new Date('2026-10-26T17:00:00Z'),
      booked: false,
    });
    expect(day).not.toHaveProperty('bookings');
  });

  it('leaves an occupied slot available when the vendor has spare capacity', async () => {
    const { s, vendor } = fixture();
    vendor.availabilitySettings.maxConcurrentBookings = 2;
    const day = await s.getPublicSchedule(id, '2026-10-26');
    expect(day.slots.every((slot: { booked: boolean }) => !slot.booked)).toBe(true);
  });

  it.each(['Away for the day', undefined])('only returns an entered blocked-date reason (%s)', async (reason) => {
    const { s, model, vendor } = fixture();
    vendor.availabilitySettings.blockedDates = [new Date('2026-10-26')];
    vendor.availabilitySettings.blockedDateReasons = reason ? [{ date: '2026-10-26', reason }] : [];
    const day = await s.getPublicSchedule(id, '2026-10-26');
    expect(day).toMatchObject({ unavailable: true, reason, slots: [] });
    expect(model.find).not.toHaveBeenCalled();
  });

  it('reports a closed legacy working day as unavailable', async () => {
    const { s, vendor } = fixture();
    vendor.availabilitySettings.workingDays = [{ day: 'MON', enabled: false }];
    await expect(s.getPublicSchedule(id, '2026-10-26')).resolves.toMatchObject({
      unavailable: true, slots: [],
    });
  });
});

describe('Authoritative calendar and half-hour availability',()=>{
 beforeEach(()=>{jest.useFakeTimers();jest.setSystemTime(new Date('2026-10-25T12:00:00Z'))});afterEach(()=>jest.useRealTimers());
 it('accepts ISO calendar dates and returns bookings without the orders page limit',async()=>{const f=fixture();const day=await f.s.getDaySlots(id,'2026-10-26');expect(day.bookings).toHaveLength(1);expect(day.bookings[0].start).toEqual(new Date('2026-10-26T15:00:00Z'));expect(f.model.find.mock.calls[0][0].status.$in).toEqual(['pending','accepted','completed']);expect(day.date).toBe('2026-10-26')});
 it('rejects malformed dates',async()=>{await expect(fixture().s.getDaySlots(id,'26-10-2026')).rejects.toThrow('YYYY-MM-DD')});
 it('preserves the correct 8:30 overlap rejection and permits the 9:00 boundary',async()=>{const{s}=fixture();const overlap=await s.checkVendorAvailability(id,new Date('2026-10-26T15:30:00Z'),new Date('2026-10-26T16:30:00Z'));expect(overlap.available).toBe(false);expect(overlap.reason).toContain('already booked');const adjacent=await s.checkVendorAvailability(id,new Date('2026-10-26T16:00:00Z'),new Date('2026-10-26T17:00:00Z'));expect(adjacent.available).toBe(true)});
 it('uses the saved vendor limit for overlapping bookings', async () => {
   const { s, model, vendor } = fixture();
   const start = new Date('2026-10-26T15:30:00Z');
   const end = new Date('2026-10-26T16:30:00Z');
   vendor.availabilitySettings.maxConcurrentBookings = 2;
   await expect(s.checkVendorAvailability(id, start, end)).resolves.toMatchObject({
     available: true, maxConcurrentBookings: 2, overlapCount: 1,
   });
   model.countDocuments.mockReturnValue(q(2));
   await expect(s.checkVendorAvailability(id, start, end)).resolves.toMatchObject({ available: false });
 });
});


describe('Vendor concurrent booking setting', () => {
  const Vendor = model('AvailabilitySettingsTestVendor', new Schema({
    role: String,
    availabilitySettings: { type: VendorAvailabilitySettingsSchema, default: () => ({}) },
  }));

  it('defaults to one, persists a changed limit and preserves it on unrelated edits', async () => {
    const { s } = fixture();
    const vendor = new Vendor({ role: 'Vendor' });
    expect(vendor.availabilitySettings.maxConcurrentBookings).toBe(1);
    const save = jest.spyOn(vendor, 'save').mockImplementation(async () => {
      await vendor.validate();
      return vendor;
    });
    s.userModel.findById = () => ({ ...q(vendor), select: () => q(vendor.toObject()) });
    await s.setAvailability(id, { maxConcurrentBookings: 2 });
    await s.setAvailability(id, { blockedDates: [] });
    await expect(s.getAvailability(id)).resolves.toMatchObject({ maxConcurrentBookings: 2 });
    const reloaded = Vendor.hydrate(vendor.toObject());
    expect(reloaded.availabilitySettings.maxConcurrentBookings).toBe(2);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it.each([0, -1, 1.5, null, '2', Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid API limit %p', async value => {
      const dto = Object.assign(new SetAvailabilityDto(), { maxConcurrentBookings: value });
      expect((await validate(dto)).some(error => error.property === 'maxConcurrentBookings')).toBe(true);
    },
  );

  it('accepts a positive limit and allows partial updates without the field', async () => {
    for (const input of [{ maxConcurrentBookings: 2 }, {}]) {
      expect(await validate(Object.assign(new SetAvailabilityDto(), input))).toEqual([]);
    }
  });
});
