import { adminVendorCity } from './admin-city-display';

describe('admin vendor city display', () => {
  it('uses canonical business city for new vendors', () => {
    expect(adminVendorCity({
      businessCityId: { name: 'New York City' },
      contactDetails: { city: '' },
    })).toBe('New York City');
  });
  it('prefers canonical city over outdated legacy text', () => {
    expect(adminVendorCity({
      businessCityId: { name: 'Los Angeles' },
      contactDetails: { city: 'Old Location' },
    })).toBe('Los Angeles');
  });
  it('preserves city display for existing legacy vendors', () => {
    expect(adminVendorCity({ contactDetails: { city: 'Islamabad' } })).toBe('Islamabad');
  });
  it('does not display an ObjectId as a city', () => {
    expect(adminVendorCity({ businessCityId: '6af493d71886cdf8cf05b834' })).toBe('N/A');
  });
  it('returns N/A only if no city is recorded', () => {
    expect(adminVendorCity({})).toBe('N/A');
    expect(adminVendorCity({ businessCityId: { name: '   ' }, contactDetails: { city: '  ' } })).toBe('N/A');
  });
});
