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
