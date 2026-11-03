import { validateSync } from 'class-validator';
import { PackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { VendorService } from './vendor.service';

describe('package minute window validation', () => {
  it.each([PackageDto, UpdatePackageDto])('rejects the retired type in %p', Dto => {
    const dto = Object.assign(new Dto(), { bookingType: 'CUSTOM' });
    expect(validateSync(dto).find(error => error.property === 'bookingType')?.constraints).toHaveProperty('isEnum');
  });
  const validate = (pkg: any) => (VendorService.prototype as any).validatePackageBookingConfiguration(pkg);
  it.each(['DELIVERY_BASED', 'SETUP_BASED'])('%s accepts minute offsets and rejects reversed or insufficient windows', bookingType => {
    const pkg = { bookingType, requiredServiceDurationMinutes: 30, serviceWindowStartOffsetMinutes: -45, serviceWindowEndOffsetMinutes: -15 };
    expect(() => validate(pkg)).not.toThrow();
    if (bookingType === 'DELIVERY_BASED') {
      expect(() => validate({ ...pkg, requiredServiceDurationMinutes: 120 })).not.toThrow();
      expect(() => validate({ ...pkg, requiredServiceDurationMinutes: undefined })).not.toThrow();
    } else {
      expect(() => validate({ ...pkg, requiredServiceDurationMinutes: 31 })).toThrow('Time needed must fit');
    }
    expect(() => validate({ ...pkg, serviceWindowStartOffsetMinutes: -10 })).toThrow();
    if (bookingType === 'SETUP_BASED') expect(() => validate({ ...pkg, serviceWindowEndOffsetMinutes: 15 })).toThrow('Setup must finish');
    else expect(() => validate({ ...pkg, serviceWindowEndOffsetMinutes: 15 })).not.toThrow();
  });
  it('rejects setup windows after event start and allows zero deadline', () => {
    const pkg = { bookingType: 'SETUP_BASED', requiredServiceDurationMinutes: 60, serviceWindowStartOffsetMinutes: -180, serviceWindowEndOffsetMinutes: 0 };
    expect(() => validate(pkg)).not.toThrow();
    expect(() => validate({ ...pkg, serviceWindowStartOffsetMinutes: 1 })).toThrow('Setup must start');
    expect(() => validate({ ...pkg, serviceWindowEndOffsetMinutes: 1 })).toThrow('Setup must finish');
  });
  it('rejects retired package configuration and keeps other booking types', () => {
    expect(() => validate({ bookingType: 'CUSTOM', serviceWindowStartOffsetMinutes: -45, serviceWindowEndOffsetMinutes: -15 })).toThrow('Choose a supported booking type');
    expect(() => validate({ bookingType: 'DURATION_BASED' })).not.toThrow();
    expect(() => validate({ bookingType: 'TIME_SLOT_BASED', requiredServiceDurationMinutes: 15 })).not.toThrow();
    expect(() => validate({})).not.toThrow();
  });
});

import { VendorAvailabilityService } from '../vendor-availability/vendor-availability.service';

describe('minute offsets through booking availability', () => {
  beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-01T00:00:00Z')); });
  afterEach(() => jest.useRealTimers());
  it.each(['DELIVERY_BASED', 'SETUP_BASED', 'CUSTOM'])('%s uses exact saved minute offsets across dates', async bookingType => {
    const id = '6abbc3ff910b091749a9d856';
    const vendor = { role: 'Vendor', businessCityId: id,
      availabilitySettings: { workingHoursStart: '00:00', workingHoursEnd: '23:59' },
      packages: [{ _id: 'minute-package', bookingType, requiredServiceDurationMinutes: 30,
        serviceWindowStartOffsetMinutes: -45, serviceWindowEndOffsetMinutes: -15 }] };
    const query = (value: any): any => { const q: any = { select: () => q, lean: async () => value,
      then: (resolve: any, reject: any) => Promise.resolve(value).then(resolve, reject) }; return q; };
    const service: any = Object.create(VendorAvailabilityService.prototype);
    Object.assign(service, { userModel: { findById: () => query(vendor) },
      vendorOrderModel: { countDocuments: () => query(0) },
      cityService: { requireCityTimeZone: async () => 'Asia/Karachi' },
      featureAccessService: { hasActiveSubscription: async () => true } });
    // Event is 12:10 AM local: the start falls on the previous local day.
    if (bookingType === 'CUSTOM') {
      const newBooking = await service.checkVendorAvailability(id, new Date('2026-10-26T19:10:00Z'),
        new Date('2026-10-26T20:10:00Z'), 'minute-package');
      expect(newBooking).toMatchObject({ available: false, reason: 'Package booking type is no longer available.' });
    }
    const result = await service.checkVendorAvailability(id, new Date('2026-10-26T19:10:00Z'),
      new Date('2026-10-26T20:10:00Z'), 'minute-package', undefined, bookingType === 'CUSTOM' ? id : undefined);
    expect(result.available).toBe(true);
    expect(result.requiredServiceWindow.startDateTime.toISOString()).toBe('2026-10-26T18:25:00.000Z');
    expect(result.requiredServiceWindow.endDateTime.toISOString()).toBe('2026-10-26T18:55:00.000Z');
  });
});

describe('Delivery package settings save through existing package actions',()=>{
 const config:any={bookingType:'DELIVERY_BASED',packageName:'Cake',services:'Cake',price:8000,deliveryFeeType:'PAID',deliveryFee:300,deliveryReserveMinutes:30,serviceWindowStartOffsetMinutes:-60,serviceWindowEndOffsetMinutes:0};
 function fixture(category='Cake'){
  const old:any={_id:'old',packageName:'Existing',price:2000,bookingType:'CUSTOM',serviceWindowStartOffsetMinutes:0,serviceWindowEndOffsetMinutes:60};
  const user:any={buisnessCategory:'category',packages:[old],markModified:jest.fn(),save:jest.fn(async()=>user)};
  const service:any=Object.create(VendorService.prototype);
  const update=jest.fn(async(_filter:any,_payload:any)=>({matchedCount:1}));
  Object.assign(service,{userModel:{findById:async()=>user,findOne:async()=>user,updateOne:update},featureAccessService:{getFeatureLimit:async()=>10},categoryModel:{findById:()=>({select:()=>({lean:async()=>({name:category})})})}});
  return {service,user,old,update};
 }
 it('adds delivery settings without replacing an existing package',async()=>{const f=fixture();await f.service.addPackages('vendor',{packages:[config]});expect(f.user.packages).toHaveLength(2);expect(f.user.packages[0]).toBe(f.old);expect(f.user.packages[1]).toMatchObject(config);expect(f.user.save).toHaveBeenCalledTimes(1)});
 it('updates only requested delivery fields and keeps existing package data',async()=>{const f=fixture();f.user.packages=[{...config,_id:'delivery'}];await f.service.updatePackage('delivery',{deliveryFee:500});expect(f.update.mock.calls[0][1]).toEqual({$set:{'packages.$.deliveryFee':500}})});
 it('keeps flat delivery fees for Catering without weight settings',async()=>{const f=fixture('Catering');await f.service.addPackages('vendor',{packages:[config]});expect(f.user.packages[1]).toMatchObject(config);expect(f.user.packages[1]).not.toHaveProperty('deliveryWeightBasis');expect(f.user.packages[1]).not.toHaveProperty('deliveryExtraWeightEnabled');expect(f.user.save).toHaveBeenCalledTimes(1)});
});
