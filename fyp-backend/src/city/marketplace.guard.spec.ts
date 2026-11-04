import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MarketplaceGuard } from './marketplace.guard';

describe('MarketplaceGuard', () => {
  const localCity = new Types.ObjectId();
  const otherCity = new Types.ObjectId();
  const localVendor = new Types.ObjectId();
  const foreignVendor = new Types.ObjectId();

  function setup(request: Record<string, any>, hasMarketplace = true) {
    const cities = {
      getMarketplaceScope: jest.fn().mockResolvedValue(hasMarketplace ? {
        countryCode: 'PK', cityId: String(localCity), businessCityIds: [localCity, otherCity],
      } : null),
      requireActiveCity: jest.fn().mockImplementation(async id => ({
        countryCode: id === String(otherCity) ? 'PK' : 'US',
      })),
    };
    const users = { countDocuments: jest.fn(async query => query._id.$in.includes(String(localVendor)) ? 1 : 0) };
    const guard = new MarketplaceGuard(cities as any, users as any);
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
    return { check: () => guard.canActivate(context), cities, users };
  }

  it('requires a marketplace before a legacy client can browse or check out', async () => {
    const { check } = setup({ user: { role: 'Organizer' } }, false);
    await expect(check()).rejects.toThrow(ForbiddenException);
  });

  it('allows another city in the same country when the vendor serves it', async () => {
    const request = { user: { role: 'Client' }, body: { eventCityId: String(otherCity), services: [{ vendorId: String(localVendor) }] } };
    const { check, users } = setup(request);
    await expect(check()).resolves.toBe(true);
    expect(users.countDocuments).toHaveBeenCalledWith({
      _id: { $in: [String(localVendor)] }, role: 'Vendor',
      businessCityId: { $in: [localCity, otherCity] }, serviceLocationCityIds: String(otherCity),
    });
  });

  it('rejects cross-country event cities, vendor links and cart items', async () => {
    const user = { role: 'Client' };
    const foreignCity = String(new Types.ObjectId());
    for (const request of [
      { user, body: { eventCityId: foreignCity } },
      { user, query: { marketplaceVendorId: String(foreignVendor) } },
      { user, body: { eventCityId: String(otherCity), services: [{ vendorId: String(foreignVendor) }] } },
    ]) {
      await expect(setup(request).check()).rejects.toThrow(ForbiddenException);
    }
  });

  it('preserves vendor access to their own tools', async () => {
    const { check, cities } = setup({ user: { role: 'Vendor' } });
    await expect(check()).resolves.toBe(true);
    expect(cities.getMarketplaceScope).not.toHaveBeenCalled();
  });
});
