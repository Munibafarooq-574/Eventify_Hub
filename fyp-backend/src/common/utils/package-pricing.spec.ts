import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { allowedPricingMethods, legacyPricingMethod, quotePackage, validatePackagePricing } from './package-pricing';
import { CategoryPricingDto } from '../../category/dto/category-pricing.dto';

describe('package pricing methods', () => {
  it('preserves legacy catering and fixed prices without adding schema defaults', () => {
    expect(legacyPricingMethod({ name: 'Caterings' })).toBe('PER_PERSON');
    expect(legacyPricingMethod({ businessDetailsType: 'CATERING', name: 'Renamed service' })).toBe('PER_PERSON');
    expect(allowedPricingMethods({ name: 'New category' })).toEqual(['FIXED']);
  });
  it('validates admin JSON and multipart selections', () => {
    for (const methods of [['PER_PERSON', 'GROUP'], JSON.stringify(['FIXED'])]) {
      const dto = plainToInstance(CategoryPricingDto, { allowedPricingMethods: methods });
      expect(validateSync(dto)).toHaveLength(0);
    }
    for (const methods of [[], ['UNKNOWN'], ['FIXED', 'FIXED'], 'broken-json']) {
      expect(validateSync(plainToInstance(CategoryPricingDto, { allowedPricingMethods: methods })).length).toBeGreaterThan(0);
    }
  });
  it('requires allowed methods for new packages and preserves existing methods when options change', () => {
    const category = { allowedPricingMethods: ['FIXED'] as const };
    expect(() => validatePackagePricing({ pricingMethod: 'PER_PERSON' }, category as any)).toThrow('allowed');
    expect(validatePackagePricing({ pricingMethod: 'PER_PERSON' }, category as any, { pricingMethod: 'PER_PERSON' })).toEqual({ pricingMethod: 'PER_PERSON', groupSize: null });
    expect(() => validatePackagePricing({ pricingMethod: 'GROUP', groupSize: 1.5 }, { allowedPricingMethods: ['GROUP'] })).toThrow('people');
  });
  it('prices selected people independently from the total event attendees', () => {
    expect(quotePackage({ pricingMethod: 'PER_PERSON' }, 1500, 1, 50)).toMatchObject({ packageAmount: 75000, personCount: 50 });
    expect(quotePackage({ pricingMethod: 'FIXED' }, 1500, 2, 100).packageAmount).toBe(3000);
    expect(quotePackage({ pricingMethod: 'GROUP', groupSize: 10 }, 12000, 2, 100)).toMatchObject({ packageAmount: 24000, groupSize: 10, personCount: null });
  });
  it.each([0, -1, 1.5, NaN, Infinity])('rejects invalid group sizes and participant counts %s', invalid => {
    expect(() => quotePackage({ pricingMethod: 'GROUP', groupSize: invalid }, 100, 1, 10)).toThrow();
    expect(() => quotePackage({ pricingMethod: 'PER_PERSON' }, 100, 1, invalid)).toThrow();
  });
});
