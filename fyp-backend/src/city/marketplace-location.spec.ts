import { Types } from 'mongoose';
import { CityService } from './city.service';

describe('Marketplace country without a preferred city', () => {
  const cityId = new Types.ObjectId();

  function setup(city: object | null = null) {
    const model = {
      findById: jest.fn(() => ({ lean: async () => city })),
      distinct: jest.fn(async () => [cityId]),
    };
    return { service: new CityService(model as any), model };
  }

  it('uses the saved country to scope all cities without choosing a city', async () => {
    const { service, model } = setup();
    await expect(service.getMarketplaceScope({ marketplaceCountryCode: 'US' })).resolves.toMatchObject({
      countryCode: 'US', cityId: null, businessCityIds: [cityId],
    });
    expect(model.findById).not.toHaveBeenCalled();
    expect(model.distinct).toHaveBeenCalledWith('_id', { countryCode: 'US', isActive: true });
  });

  it('keeps the country even if the stored city now belongs to another country', async () => {
    const { service } = setup({ _id: cityId, countryCode: 'US', isActive: true });
    await expect(service.getMarketplaceLocation({
      clientCityId: String(cityId), marketplaceCountryCode: 'PK',
    })).resolves.toMatchObject({ countryCode: 'PK', cityId: null });
  });

  it('resolves existing clients who previously saved only a city', async () => {
    const { service } = setup({ _id: cityId, name: 'Islamabad', countryCode: 'PK', isActive: true });
    await expect(service.getMarketplaceLocation({ clientCityId: String(cityId) })).resolves.toEqual({
      countryCode: 'PK', cityId: String(cityId), cityName: 'Islamabad',
    });
  });

  it('requires a country when neither a saved country nor a legacy city exists', async () => {
    const { service } = setup();
    await expect(service.getMarketplaceScope({})).resolves.toBeNull();
  });
});
