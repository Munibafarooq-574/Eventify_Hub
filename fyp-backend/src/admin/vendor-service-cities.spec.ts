import { adminVendorServiceCities } from './vendor-service-cities';

describe('adminVendorServiceCities', () => {
  it('displays multiple configured service locations with state and country', () => {
    expect(adminVendorServiceCities({ serviceLocationCityIds: [
      { name: 'San Francisco', stateProvinceName: 'California', countryName: 'United States' },
      { name: 'New York City', stateProvinceName: 'New York', countryName: 'United States' },
    ] })).toEqual(['San Francisco, California, United States', 'New York City, New York, United States']);
  });

  it('does not duplicate the same coverage city', () => {
    expect(adminVendorServiceCities({ serviceLocationCityIds: [
      { name: 'Islamabad', stateProvinceName: 'Islamabad', countryName: 'Pakistan' },
      { name: 'Islamabad', stateProvinceName: 'Islamabad', countryName: 'Pakistan' },
    ] })).toEqual(['Islamabad, Pakistan']);
  });

  it('never invents coverage from a business city or unpopulated IDs', () => {
    expect(adminVendorServiceCities({ serviceLocationCityIds: ['507f1f77bcf86cd799439011'] })).toEqual([]);
    expect(adminVendorServiceCities({})).toEqual([]);
    expect(adminVendorServiceCities({ serviceLocationCityIds: [null, { name: '  ' }] })).toEqual([]);
  });
});
