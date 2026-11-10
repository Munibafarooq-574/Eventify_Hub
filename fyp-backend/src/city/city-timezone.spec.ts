import { Types } from 'mongoose';
import { CityService } from './city.service';

describe('City timezone lookup for vendor receipts', () => {
  const vendorCityId = new Types.ObjectId();
  const createService = (cities: Array<{ timeZone?: string; name?: string; countryCode?: string }>) => {
    const findOne = jest.fn(() => ({ lean: async () => cities[0] ?? null }));
    const find = jest.fn(() => ({
      select: () => ({ lean: async () => cities }),
    }));
    const service = new CityService({ findOne, find } as any);
    return { service, findOne, find };
  };

  it('uses linked city ID with a real IANA timezone, not the country default', async () => {
    const { service, findOne } = createService([{ timeZone: 'America/Los_Angeles' }]);
    const actual = await service.getUserTimeZone({
      clientCityId: vendorCityId, marketplaceCountryCode: 'US', city: 'San Francisco',
    });
    expect(actual).toBe('America/Los_Angeles');
    expect(findOne).toHaveBeenCalledWith(expect.objectContaining({ countryCode: 'US' }));
  });

  it('uses an unambiguous legacy city name, safely scoped to country', async () => {
    const { service, find } = createService([{ timeZone: 'America/New_York' }]);
    const zone = await service.getUserTimeZone({
      city: 'New York', marketplaceCountryCode: 'US',
    });
    expect(zone).toBe('America/New_York');
    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      countryCode: 'US', isActive: true,
    }));
  });

  it('refuses to guess timezone for ambiguous cities or missing city', async () => {
    const { service } = createService([{ timeZone: 'America/Chicago' }, { timeZone: 'America/Los_Angeles' }]);
    expect(await service.getUserTimeZone({ city: 'Springfield', marketplaceCountryCode: 'US' })).toBeNull();
    expect(await service.getUserTimeZone({ marketplaceCountryCode: 'US' })).toBeNull();
  });

  it('rejects invalid timezone and does not guess from country', async () => {
    const { service } = createService([{ timeZone: 'Invalid/Zone' }]);
    expect(await service.getUserTimeZone({ city: 'San Francisco', marketplaceCountryCode: 'US' })).toBeNull();
  });
});
