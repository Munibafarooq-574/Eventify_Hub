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
    const features = await catalog.getFeatures();
    expect(features.map(feature => feature.key)).toContain(FeatureKey.COUPONS);
    expect(features.every(feature => feature.controlsAccess)).toBe(true);
    const input = { ...planInput };
    await catalog.savePlan('studio-plus', input, true);
    expect(await catalog.getPurchasable('studio-plus')).toMatchObject({
      monthlyPrice: 7500, featureLabels: expect.arrayContaining(['Coupons', 'Up to 4 packages']),
      features: { coupons: true, campaigns: false },
    });
    await expect(catalog.savePlan('studio-plus', input, true)).rejects.toThrow('already exists');
    await catalog.savePlan('studio-plus', { ...input, isPurchasable: false }, false);
    await expect(catalog.getPurchasable('studio-plus')).rejects.toThrow('available subscription plan');
    expect((await catalog.get('studio-plus'))?.features.coupons).toBe(true);
  });

  it('validates prices, limits, keys and feature selections before saving', async () => {
    const catalog = createCatalog();
    await expect(catalog.savePlan('studio-plus', { ...planInput, monthlyPrice: 0 }, true)).rejects.toThrow();
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
      getCurrentSubscription: async () => current,
    }) as SubscriptionService;
    const purchase = (amount: number) => service.requestSubscriptionPayment(
      vendorId, 'studio-plus', PaymentProvider.EASYPAISA, 'REF-01', SubscriptionActivationType.IMMEDIATE, amount,
    );
    await expect(purchase(7000)).rejects.toThrow('price changed');
    await expect(purchase(7500)).resolves.toMatchObject({
      plan: 'studio-plus', amountDue: 7500, isCurrent: false, planChangeType: 'upgrade', activationType: 'immediate',
    });
    expect(create).toHaveBeenCalledTimes(1);
    current.plan = 'studio-plus';
    const access = new FeatureAccessService(service);
    expect(await access.hasPaidSubscription(vendorId)).toBe(true);
    expect(await access.canUseFeature(vendorId, FeatureKey.COUPONS)).toBe(true);
    expect(await access.canUseFeature(vendorId, FeatureKey.CAMPAIGNS)).toBe(false);
    expect(await access.getFeatureLimit(vendorId, LimitKey.MAX_PACKAGES)).toBe(4);
  });
});
