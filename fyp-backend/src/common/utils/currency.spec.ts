import { countryCurrency, currencyOf, currencyMatch, formatMoney, roundForCurrency } from './currency';
import { quotePackage } from './package-pricing';

describe('country currency and historical money', () => {
  it('maps supported countries without converting numeric prices', () => {
    expect(countryCurrency('PK')).toBe('PKR'); expect(countryCurrency('US')).toBe('USD');
    expect(currencyOf({ currency: 'USD' })).toBe('USD');
    expect(currencyOf({ eventCityId: { countryCode: 'US' } })).toBe('PKR');
    expect(formatMoney(200, 'USD')).toBe('$ 200.00');
    expect(formatMoney(200)).toBe('Rs. 200');
  });
  it('keeps percentage and per-person arithmetic in cents for USD', () => {
    expect(roundForCurrency(200.25 * .2, 'USD')).toBe(40.05);
    expect(roundForCurrency(19.99 * 3, 'USD')).toBe(59.97);
    expect(quotePackage({pricingMethod:'PER_PERSON'}, 20.25, 1, 10).packageAmount).toBe(202.5);
    expect(roundForCurrency(200.25 * .2, 'PKR')).toBe(40);
  });
  it('includes legacy records only in the PKR aggregation bucket', () => {
    expect(currencyMatch('USD')).toEqual({$expr:{$eq:[{$ifNull:['$currency','PKR']},'USD']}});
    expect(currencyMatch('PKR')).toEqual({$expr:{$eq:[{$ifNull:['$currency','PKR']},'PKR']}});
  });
});
