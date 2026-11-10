import { Connection, Types } from 'mongoose';
import { PlanCatalogService } from './plan-catalog.service';
import { SubscriptionService } from './subscription.service';
import { FeatureAccessService } from '../feature-access.service';
import { FeatureKey, LimitKey, PaymentProvider, SubscriptionActivationType } from './subscription.types';

function createCatalog() {
  const collections = new Map<string, Map<string, any>>();
  const connection = {
    db: {
      collection(name: string) {
        const docs = collections.get(name) ?? new Map();
        collections.set(name, docs);
        const toArray = async () => [...docs.values()];
        return {
          find: () => ({ toArray, sort: () => ({ toArray }) }),
          findOne: async ({ _id }: { _id: string }) => docs.get(_id) ?? null,
          insertOne: async (row: { _id: string }) => {
            if (docs.has(row._id)) throw Object.assign(new Error('duplicate'), { code: 11000 });
            docs.set(row._id, row);
          },
          updateOne: async ({ _id }: { _id: string }, { $set }: { $set: object }, { upsert }: { upsert: boolean }) => {
            const exists = docs.has(_id);
            if (exists || upsert) docs.set(_id, { _id, ...$set });
            return { matchedCount: Number(exists), upsertedCount: Number(!exists && upsert) };
          },
        };
      },
    },
  };
  return new PlanCatalogService(connection as unknown as Connection);
}

const planInput = {
  name: 'Studio Plus',
  description: 'For event studios',
  monthlyPrice: 7500,
  rank: 4,
  isPurchasable: true,
  isMostPopular: false,
  featureKeys: [FeatureKey.COUPONS] as string[],
  limits: Object.fromEntries(Object.values(LimitKey).map(key => [key, 4])),
};

describe('Admin subscription catalog', () => {
  it('uses a fixed feature catalog and hides plans from sale without removing access', async () => {
    const catalog = createCatalog();
    const defaults = await catalog.list();
    expect(defaults.map(plan => plan.key)).toEqual(['basic', 'growth', 'premium']);
    expect(defaults.find(plan => plan.key === 'growth')?.features.coupons).toBe(true);
    expect(defaults.find(plan => plan.key === 'growth')?.featureLabels).toContain('Up to 1 featured vendor slot');
    expect(defaults.find(plan => plan.key === 'growth')?.featureLabels).toContain('Up to 1 featured package slot');
    expect(defaults.find(plan => plan.key === 'growth')?.featureLabels).toContain('Up to 5 active coupons');
    expect(defaults.find(plan => plan.key === 'growth')?.featureLabels).toContain('Up to 5 active discount codes');
    expect(defaults.find(plan => plan.key === 'growth')?.featureLabels).toContain('Up to 2 promotional campaigns per month');
    const growthBenefits = defaults.find(plan => plan.key === 'growth')!.featureLabels;
    expect(growthBenefits.indexOf('Up to 10 packages')).toBeLessThan(growthBenefits.indexOf('Up to 30 portfolio images'));
    expect(growthBenefits.indexOf('Up to 30 portfolio images')).toBeLessThan(growthBenefits.indexOf('Up to 20 images per package'));
    expect(growthBenefits.indexOf('Up to 20 images per package')).toBeLessThan(growthBenefits.indexOf('Up to 1 featured vendor slot'));
    expect(growthBenefits.indexOf('Up to 1 featured vendor slot')).toBeLessThan(growthBenefits.indexOf('Up to 1 featured package slot'));
    expect(growthBenefits.indexOf('Up to 1 featured package slot')).toBeLessThan(growthBenefits.indexOf('Up to 2 promotional campaigns per month'));
    expect(growthBenefits.indexOf('Up to 2 promotional campaigns per month')).toBeLessThan(growthBenefits.indexOf('Up to 5 active coupons'));
    expect(growthBenefits.indexOf('Up to 5 active coupons')).toBeLessThan(growthBenefits.indexOf('Up to 5 active discount codes'));
    expect(defaults.find(plan => plan.key === 'growth')?.featureLabels).toContain('Advanced analytics & business insights');
    expect(defaults.find(plan => plan.key === 'growth')?.featureLabels).not.toContain('Promotional campaigns');
    expect(defaults.find(plan => plan.key === 'growth')?.featureLabels).not.toContain('Growth visibility & featured eligibility');
    expect(defaults.find(plan => plan.key === 'growth')?.featureLabels).not.toContain('Growth analytics');
    expect(defaults.find(plan => plan.key === 'growth')?.featureLabels).not.toContain('Campaign analytics');
    expect(defaults.find(plan => plan.key === 'premium')?.featureLabels).toContain('Premium Partner visibility');
    expect(defaults.find(plan => plan.key === 'premium')?.featureLabels).toContain('Up to 2 featured vendor slots');
    expect(defaults.find(plan => plan.key === 'premium')?.featureLabels).toContain('Up to 3 featured package slots');
    expect(defaults.find(plan => plan.key === 'premium')?.featureLabels).toContain('Up to 15 active coupons');
    expect(defaults.find(plan => plan.key === 'premium')?.featureLabels).toContain('Up to 15 active discount codes');
    expect(defaults.find(plan => plan.key === 'premium')?.featureLabels).not.toContain('Campaign analytics');
    const features = await catalog.getFeatures();
    expect(features.map(feature => feature.key)).toContain(FeatureKey.COUPONS);
    expect(features.every(feature => feature.controlsAccess)).toBe(true);
    expect(features.find(feature => feature.key === FeatureKey.FEATURED_VENDOR)?.name).toBe('Featured vendor slots');
    expect(features.find(feature => feature.key === FeatureKey.PREMIUM_BADGE)?.name).toBe('Premium Partner visibility');
    const input = { ...planInput };
    await catalog.savePlan('studio-plus', input, true);
    expect(await catalog.getPurchasable('studio-plus')).toMatchObject({
      monthlyPrice: 7500, featureLabels: expect.arrayContaining(['Up to 4 active coupons', 'Up to 4 packages']),
      features: { coupons: true, campaigns: false },
    });
    await expect(catalog.savePlan('studio-plus', input, true)).rejects.toThrow('already exists');
    await catalog.savePlan('studio-plus', { ...input, isPurchasable: false }, false);
    await expect(catalog.getPurchasable('studio-plus')).rejects.toThrow('available subscription plan');
    expect((await catalog.get('studio-plus'))?.features.coupons).toBe(true);
  });

  it('only advertises active feature limits, while keeping campaign analytics access available', async () => {
    const catalog = createCatalog();
    const custom = {
      ...planInput,
      featureKeys: [FeatureKey.CAMPAIGN_ANALYTICS, FeatureKey.COUPONS, FeatureKey.GROWTH_ANALYTICS],
      limits: { ...planInput.limits, couponLimit: 0, monthlyCampaignLimit: 3 },
    };
    await catalog.savePlan('display-test', custom, true);
    const plan = await catalog.get('display-test');
    expect(plan?.features.campaignAnalytics).toBe(true);
    expect(plan?.featureLabels).not.toContain('Campaign analytics');
    expect(plan?.featureLabels).not.toContain('Up to 3 promotional campaigns per month');
    expect(plan?.featureLabels).not.toContain('Up to 0 active coupons');
    expect(plan?.featureLabels).toContain('Growth analytics');
  });

  it('validates prices, limits, keys and feature selections before saving', async () => {
    const catalog = createCatalog();
    await expect(catalog.savePlan('studio-plus', { ...planInput, monthlyPrice: 0 }, true)).rejects.toThrow();
    await expect(catalog.savePlan('studio-plus', { ...planInput, monthlyPriceUSD: -5 }, true)).rejects.toThrow();
    await expect(catalog.savePlan('studio-plus', { ...planInput, monthlyPriceUSD: 3.999 }, true)).rejects.toThrow();
    await expect(catalog.savePlan('studio-plus', { ...planInput, featureKeys: ['unknown'] }, true)).rejects.toThrow();
    await expect(catalog.savePlan('studio-plus', { ...planInput, featureKeys: ['custom:fake feature'] }, true)).rejects.toThrow();
    await expect(catalog.savePlan('studio-plus', { ...planInput, limits: { ...planInput.limits, maxPackages: -1 } }, true)).rejects.toThrow();
    await expect(catalog.savePlan('free', planInput, true)).rejects.toThrow();
    expect(await catalog.get('studio-plus')).toBeNull();
  });

  it('uses catalog rank and price for payment requests and catalog limits for paid access', async () => {
    const catalog = createCatalog();
    await catalog.savePlan('studio-plus', planInput, true);
    const vendorId = new Types.ObjectId().toString();
    const current = { plan: 'growth', status: 'active', paymentStatus: 'paid', endDate: new Date(Date.now() + 86400000) };
    const create = jest.fn(async input => input);
    const service = Object.assign(Object.create(SubscriptionService.prototype), {
      catalog, subscriptionModel: { findOne: async () => null, create },
      userModel: { findById: () => ({ select: () => ({ lean: async () => ({ marketplaceCountryCode: 'PK' }) }) }) },
      getPaymentInstructions: async () => ({ provider: PaymentProvider.EASYPAISA, currency: 'PKR' }),
      getCurrentSubscription: async () => current,
    }) as SubscriptionService;
    const purchase = (amount: number) => service.requestSubscriptionPayment(
      vendorId, 'studio-plus', PaymentProvider.EASYPAISA, 'REF-01', SubscriptionActivationType.IMMEDIATE, amount,
    );
    await expect(purchase(7000)).rejects.toThrow('price changed');
    await expect(purchase(7500)).resolves.toMatchObject({
      plan: 'studio-plus', amountDue: 7500, isCurrent: false, planChangeType: 'upgrade', activationType: 'immediate',
      entitlementSnapshot: {
        name: 'Studio Plus',
        limits: { maxPackages: 4 },
        features: { coupons: true },
      },
    });
    expect(create).toHaveBeenCalledTimes(1);
    current.plan = 'studio-plus';
    const access = new FeatureAccessService(service);
    expect(await access.hasPaidSubscription(vendorId)).toBe(true);
    expect(await access.canUseFeature(vendorId, FeatureKey.COUPONS)).toBe(true);
    expect(await access.canUseFeature(vendorId, FeatureKey.CAMPAIGNS)).toBe(false);
    expect(await access.getFeatureLimit(vendorId, LimitKey.MAX_PACKAGES)).toBe(4);
  });

  it('uses USD admin price and snapshots USD for a USA vendor without converting PKR', async () => {
    const catalog = createCatalog();
    await catalog.savePlan('studio-plus', { ...planInput, monthlyPriceUSD: 29.95 }, true);
    const vendorId = new Types.ObjectId().toString();
    const create = jest.fn(async input => input);
    const service = Object.assign(Object.create(SubscriptionService.prototype), {
      catalog,
      userModel: { findById: () => ({ select: () => ({ lean: async () => ({ marketplaceCountryCode: 'US' }) }) }) },
      subscriptionModel: { findOne: async () => null, create },
      getPaymentInstructions: async () => ({ provider: PaymentProvider.BANK_TRANSFER, currency: 'USD', configured: true }),
      getCurrentSubscription: async () => ({ plan: 'basic', status: 'trial', endDate: new Date(Date.now() + 86400000) }),
    }) as SubscriptionService;
    const plan = (await service.getPlans(vendorId)).find(item => item.key === 'studio-plus');
    expect(plan).toMatchObject({ monthlyPrice: 29.95, currency: 'USD', priceLabel: '$ 29.95 / month' });
    await expect(service.requestSubscriptionPayment(
      vendorId, 'studio-plus', PaymentProvider.EASYPAISA, 'US-01', SubscriptionActivationType.IMMEDIATE, 29.95,
    )).rejects.toThrow('payment provider');
    await expect(service.requestSubscriptionPayment(
      vendorId, 'studio-plus', PaymentProvider.BANK_TRANSFER, 'US-01', SubscriptionActivationType.IMMEDIATE, 29.95,
    )).resolves.toMatchObject({ amountDue: 29.95, currency: 'USD', paymentProvider: PaymentProvider.BANK_TRANSFER });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('preserves purchased features and limits after an admin edits the live plan', async () => {
    const catalog = createCatalog();
    await catalog.savePlan('studio-plus', planInput, true);
    const purchased = await catalog.get('studio-plus');
    const subscription: any = {
      plan: 'studio-plus', status: 'active', paymentStatus: 'paid',
      endDate: new Date(Date.now() + 86400000),
      entitlementSnapshot: {
        name: purchased!.name, rank: purchased!.rank,
        features: { ...purchased!.features },
        limits: { ...purchased!.limits },
        featureLabels: [...purchased!.featureLabels],
      },
    };
    await catalog.savePlan('studio-plus', {
      ...planInput, featureKeys: [], limits: { ...planInput.limits, maxPackages: 1, couponLimit: 0 },
    }, false);
    const subscriptionService = Object.assign(Object.create(SubscriptionService.prototype), {
      catalog, getCurrentSubscription: async () => subscription,
    }) as SubscriptionService;
    const access = new FeatureAccessService(subscriptionService);
    expect((await catalog.get('studio-plus'))?.limits.maxPackages).toBe(1);
    expect(await access.getFeatureLimit('vendor', LimitKey.MAX_PACKAGES)).toBe(4);
    expect(await access.canUseFeature('vendor', FeatureKey.COUPONS)).toBe(true);
    expect((await subscriptionService.getPlanForSubscription(subscription as any)).featureLabels)
      .toContain('Up to 4 active coupons');

    // A new renewal without its predecessor's snapshot takes the edited plan.
    const renewal = await catalog.get('studio-plus');
    expect(renewal?.features.coupons).toBe(false);
    expect(renewal?.limits.maxPackages).toBe(1);
  });
});
