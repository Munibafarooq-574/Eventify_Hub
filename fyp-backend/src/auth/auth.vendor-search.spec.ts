jest.mock('bcrypt', () => ({ hash: jest.fn(), compare: jest.fn() }));
jest.mock('src/file-upload/file-upload.service', () => ({ FileUploadService: class {} }));
import { AuthService } from './auth.service';

const CITY_A = '507f1f77bcf86cd799439011';
const CITY_B = '507f191e810c19729de860ea';
describe('marketplace filter composition', () => {
  let service: AuthService;
  let query: any;
  beforeEach(() => {
    service = Object.create(AuthService.prototype);
    Object.assign(service, {
      userModel: { find: jest.fn((value) => { query = value; return { select: () => ({ lean: async () => [] }) }; }) },
      cityService: { requireActiveCity: jest.fn(async () => ({})) },
      subscriptionService: { getSubscriptionAccessState: jest.fn() },
    });
  });
  it('uses OR inside staff and policy facets, but AND between them', async () => {
    await service.searchVendorsByFilters({ cityIds: [CITY_A, CITY_B], staffOptions: ['MALE', 'FEMALE'], policies: ['REFUNDABLE', 'NON-REFUNDABLE'] });
    expect(query.serviceLocationCityIds.$in.map(String)).toEqual([CITY_A, CITY_B]);
    expect(query.$and).toHaveLength(2);
    expect(query.$and[0].$or).toContainEqual({ 'photographerBusinessDetails.staffGender': { $in: ['MALE', 'FEMALE'] } });
    expect(query.$and[1].$or).toContainEqual({ 'cakeBusinessDetails.cancellationPolicy': { $in: ['REFUNDABLE', 'NON-REFUNDABLE'] } });
  });
  it('preserves the mandatory event city over browsing city preferences', async () => {
    await service.searchVendorsByFilters({ eventCityId: CITY_A, cityIds: [CITY_B] });
    expect(String(query.serviceLocationCityIds)).toBe(CITY_A);
  });
  it('keeps name search separate from staff and policy conditions', async () => {
    await service.searchVendorsByFilters({ name: 'Cake.*', staffOptions: ['FEMALE'], policies: ['REFUNDABLE'] });
    expect(query.$or).toHaveLength(2);
    expect(query.$or[0].name.$regex).toBe('Cake\\.\\*');
    expect(query.$and).toHaveLength(2);
  });
});

describe('event-city timezone in vendor search', () => {
  const VENDOR_ID = '507f1f77bcf86cd799439012';
  let service: AuthService;
  let checkAvailability: jest.Mock;
  let cityService: any;
  const vendor = {
    _id: VENDOR_ID, role: 'Vendor', packages: [{ _id: 'delivery', bookingType: 'DELIVERY_BASED', serviceWindowStartOffsetMinutes: 0, serviceWindowEndOffsetMinutes: 60 }],
    businessCityId: CITY_A, availabilitySettings: { workingHoursStart: '09:00', workingHoursEnd: '18:00' },
  };
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-17T08:00:00Z'));
    checkAvailability = jest.fn(async (_id, start, end) => ({ available: true, requiredServiceWindow: { startDateTime: start, endDateTime: end } }));
    cityService = { requireActiveCity: jest.fn(async () => ({})), requireCityTimeZone: jest.fn(async () => 'Asia/Karachi') };
    service = Object.create(AuthService.prototype);
    Object.assign(service, {
      userModel: { find: () => ({ select: () => ({ lean: async () => [vendor] }) }) },
      cityService, availabilityService: { checkVendorAvailability: checkAvailability },
      filterVendorsWithActiveSubscription: async (value: any[]) => value,
    });
  });
  afterEach(() => jest.restoreAllMocks());
  it.each([
    ['Asia/Karachi', '2026-11-09', '2026-11-09T08:00:00.000Z'],
    ['Asia/Kathmandu', '2026-11-09', '2026-11-09T07:15:00.000Z'],
    ['America/New_York', '2027-07-01', '2027-07-01T17:00:00.000Z'],
    ['America/New_York', '2026-12-01', '2026-12-01T18:00:00.000Z'],
  ])('uses %s independently of the server timezone', async (zone, date, expected) => {
    cityService.requireCityTimeZone.mockResolvedValue(zone);
    const result = await service.searchVendorsByFilters({ eventCityId: CITY_A, eventDate: date, startTime: '13:00', durationMinutes: '120' });
    expect(checkAvailability).toHaveBeenCalledWith(VENDOR_ID, new Date(expected), new Date(Date.parse(expected) + 120 * 60000), 'delivery');
    expect(result[0].eventTimeZone).toBe(zone);
  });
  it('keeps a 1 PM Pakistan delivery within 9 AM–6 PM working hours', async () => {
    const { VendorAvailabilityService } = await import('../vendor-availability/vendor-availability.service');
    const availability = Object.create(VendorAvailabilityService.prototype);
    Object.assign(availability, {
      cityService,
      userModel: { findById: () => ({ select: () => ({ lean: async () => vendor }) }) },
      vendorOrderModel: { countDocuments: jest.fn(async () => 0) },
    });
    Object.assign(service, { availabilityService: availability });
    const result = await service.searchVendorsByFilters({ eventCityId: CITY_A, eventDate: '2026-11-09', startTime: '13:00', durationMinutes: '120' });
    expect(result).toHaveLength(1);
    expect(result[0].packages[0].requiredServiceWindow.startDateTime.toISOString()).toBe('2026-11-09T08:00:00.000Z');
    expect(result[0].packages[0].requiredServiceWindow.endDateTime.toISOString()).toBe('2026-11-09T09:00:00.000Z');
    expect(await service.searchVendorsByFilters({ eventCityId: CITY_A, eventDate: '2026-11-09', startTime: '18:00', durationMinutes: '120' })).toHaveLength(0);
  });
  it('does not run availability during ordinary browsing', async () => {
    await service.searchVendorsByFilters({ categoryId: CITY_B });
    expect(checkAvailability).not.toHaveBeenCalled();
    expect(cityService.requireCityTimeZone).not.toHaveBeenCalled();
  });
  it('rejects missing event city and invalid duration rather than guessing', async () => {
    await expect(service.searchVendorsByFilters({ eventDate: '2026-11-09', startTime: '13:00', durationMinutes: '120' })).rejects.toThrow('Event city is required');
    await expect(service.searchVendorsByFilters({ eventCityId: CITY_A, eventDate: '2026-11-09', startTime: '13:00', durationMinutes: '-1' })).rejects.toThrow('positive');
  });
  it.each([['2027-03-14', '02:30'], ['2026-11-01', '01:30']])('rejects invalid/ambiguous DST time %s %s', async (date, time) => {
    cityService.requireCityTimeZone.mockResolvedValue('America/New_York');
    await expect(service.searchVendorsByFilters({ eventCityId: CITY_A, eventDate: date, startTime: time, durationMinutes: '120' })).rejects.toThrow();
  });
});
