import { VendorService } from './vendor.service';

describe('package minute window validation', () => {
  const validate = (pkg: any) => (VendorService.prototype as any).validatePackageBookingConfiguration(pkg);
  it.each(['DELIVERY_BASED', 'SETUP_BASED', 'CUSTOM'])('%s accepts minute offsets and rejects reversed or insufficient windows', bookingType => {
    const pkg = { bookingType, requiredServiceDurationMinutes: 30, serviceWindowStartOffsetMinutes: -45, serviceWindowEndOffsetMinutes: -15 };
    expect(() => validate(pkg)).not.toThrow();
    expect(() => validate({ ...pkg, requiredServiceDurationMinutes: 31 })).toThrow('Time needed must fit');
    expect(() => validate({ ...pkg, serviceWindowStartOffsetMinutes: -10 })).toThrow();
    expect(() => validate({ ...pkg, serviceWindowEndOffsetMinutes: 15 })).not.toThrow();
  });
  it('preserves optional custom duration and other booking types', () => {
    expect(() => validate({ bookingType: 'CUSTOM', serviceWindowStartOffsetMinutes: -45, serviceWindowEndOffsetMinutes: -15 })).not.toThrow();
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
    const result = await service.checkVendorAvailability(id, new Date('2026-10-26T19:10:00Z'),
      new Date('2026-10-26T20:10:00Z'), 'minute-package');
    expect(result.available).toBe(true);
    expect(result.requiredServiceWindow.startDateTime.toISOString()).toBe('2026-10-26T18:25:00.000Z');
    expect(result.requiredServiceWindow.endDateTime.toISOString()).toBe('2026-10-26T18:55:00.000Z');
  });
});
