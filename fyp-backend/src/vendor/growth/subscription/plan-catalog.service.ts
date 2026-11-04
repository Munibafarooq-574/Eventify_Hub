import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { getAllPlanDefinitions, getPlanDefinition, PlanDefinition } from '../plan-config';
import { FeatureKey, LimitKey, SubscriptionPlan } from './subscription.types';

type CatalogPlan = Omit<PlanDefinition, 'key' | 'priceLabel' | 'features'> & {
  rank: number;
  featureKeys: string[];
};

type Feature = { key: string; name: string; controlsAccess: boolean };
type PlanDocument = { _id: string; plan: CatalogPlan };
type FeatureDocument = { _id: string; name: string };

export const PLAN_KEY = /^[a-z][a-z0-9-]{0,63}$/;
const LABELS: Record<string, string> = {
  standardListing: 'Standard marketplace listing',
  bookingTools: 'Bookings, messages & availability',
  basicStats: 'Reviews and basic business stats',
};
const BASE_BENEFITS = Object.keys(LABELS);
const DEFAULT_RANK: Record<string, number> = { basic: 1, growth: 2, premium: 3 };
const humanize = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());
const BUILT_IN_FEATURES: Feature[] = [
  ...Object.values(FeatureKey).map(key => ({ key, name: humanize(key), controlsAccess: true })),
  ...BASE_BENEFITS.map(key => ({ key, name: LABELS[key], controlsAccess: false })),
];

@Injectable()
export class PlanCatalogService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private get plans() {
    return this.connection.db!.collection<PlanDocument>('subscriptionplanconfigs');
  }

  private get removedFeatures() {
    return this.connection.db!.collection<{ _id: string }>('subscriptionremovedfeatures');
  }

  private get customFeatures() {
    return this.connection.db!.collection<FeatureDocument>('subscriptionfeatureconfigs');
  }

  async getFeatures(): Promise<Feature[]> {
    const custom = await this.customFeatures.find().sort({ name: 1 }).toArray();
    const removed = new Set((await this.removedFeatures.find().toArray()).map(row => row._id));
    return [...BUILT_IN_FEATURES, ...custom.map(feature => ({
      key: feature._id, name: feature.name, controlsAccess: false,
    }))].filter(feature => !removed.has(feature.key));
  }

  private defaultPlan(plan: PlanDefinition): CatalogPlan {
    return {
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      isMostPopular: plan.isMostPopular,
      isPurchasable: plan.isPurchasable,
      limits: plan.limits,
      rank: DEFAULT_RANK[plan.key] ?? 0,
      featureKeys: [
        ...(plan.key === SubscriptionPlan.FREE ? [] : BASE_BENEFITS),
        ...Object.values(FeatureKey).filter(key => plan.features[key]),
      ],
    };
  }

  private definition(key: string, plan: CatalogPlan, features: Feature[]) {
    const available = new Set(features.map(feature => feature.key));
    const enabled = new Set(plan.featureKeys.filter(key => available.has(key)));
    return {
      ...plan,
      featureKeys: [...enabled],
      key,
      priceLabel: plan.monthlyPrice === null
        ? 'Price not configured'
        : `Rs. ${plan.monthlyPrice.toLocaleString('en-PK')} / month`,
      features: Object.fromEntries(features.map(feature => [feature.key, enabled.has(feature.key)])),
      featureLabels: [...new Set([
        ...([
          [LimitKey.MAX_PACKAGES, 'Up to', 'packages'],
          [LimitKey.MAX_PORTFOLIO_IMAGES, 'Up to', 'portfolio images'],
          [LimitKey.MAX_IMAGES_PER_PACKAGE, 'Up to', 'images per package'],
          [LimitKey.MONTHLY_CAMPAIGN_LIMIT, 'Up to', 'promotional campaigns per month'],
        ] as const).filter(([limit]) => plan.limits[limit] > 0)
          .map(([limit, prefix, label]) => `${prefix} ${plan.limits[limit]} ${label}`),
        ...features.filter(feature => enabled.has(feature.key)).map(feature => feature.name),
      ])],
    };
  }

  async list() {
    const [stored, features] = await Promise.all([this.plans.find().toArray(), this.getFeatures()]);
    const plans = new Map(getAllPlanDefinitions().map(plan => [String(plan.key), this.defaultPlan(plan)]));
    for (const row of stored) plans.set(row._id, row.plan);
    return [...plans.entries()]
      .map(([key, plan]) => this.definition(key, plan, features))
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
  }

  async get(key: string) {
    const stored = await this.plans.findOne({ _id: key });
    if (stored) return this.definition(key, stored.plan, await this.getFeatures());
    if (Object.values(SubscriptionPlan).includes(key as SubscriptionPlan)) {
      return this.definition(key, this.defaultPlan(getPlanDefinition(key as SubscriptionPlan)), await this.getFeatures());
    }
    return null;
  }

  async getPurchasable(key: string) {
    const plan = await this.get(key);
    if (!plan?.isPurchasable || key === SubscriptionPlan.FREE) {
      throw new BadRequestException('Choose an available subscription plan.');
    }
    return plan;
  }

  async savePlan(key: string, body: unknown, create: boolean) {
    if (!PLAN_KEY.test(key) || ['free', 'trial', 'all'].includes(key)) {
      throw new BadRequestException('Use a plan key with lowercase letters, numbers or hyphens.');
    }
    const data = body as Partial<CatalogPlan> | null;
    if (!data || typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 80 ||
        typeof data.description !== 'string' || data.description.trim().length > 500 ||
        typeof data.monthlyPrice !== 'number' || !Number.isSafeInteger(data.monthlyPrice) || data.monthlyPrice <= 0 ||
        !Number.isSafeInteger(data.rank) || data.rank! < 1 ||
        typeof data.isPurchasable !== 'boolean' || typeof data.isMostPopular !== 'boolean' ||
        !Array.isArray(data.featureKeys) || !data.limits || typeof data.limits !== 'object') {
      throw new BadRequestException('Enter a name, a positive whole-rupee price and a valid plan rank.');
    }
    const features = await this.getFeatures();
    const keys = new Set(features.map(feature => feature.key));
    if (data.featureKeys.some(feature => !keys.has(feature))) {
      throw new BadRequestException('Select features from the feature catalog.');
    }
    const limits = {} as Record<LimitKey, number>;
    for (const key of Object.values(LimitKey)) {
      const value = data.limits[key];
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new BadRequestException(`${humanize(key)} must be a non-negative whole number.`);
      }
      limits[key] = value;
    }
    const plan: CatalogPlan = {
      name: data.name.trim(), description: data.description.trim(), monthlyPrice: data.monthlyPrice,
      rank: data.rank!, isPurchasable: data.isPurchasable, isMostPopular: data.isMostPopular,
      featureKeys: [...new Set(data.featureKeys)], limits,
    };
    const builtIn = Object.prototype.hasOwnProperty.call(DEFAULT_RANK, key);
    if (create && builtIn) throw new ConflictException('That plan key already exists.');
    if (create) {
      try {
        await this.plans.insertOne({ _id: key, plan });
      } catch (error) {
        if ((error as { code?: number }).code === 11000) throw new ConflictException('That plan key already exists.');
        throw error;
      }
    } else {
      const result = await this.plans.updateOne({ _id: key }, { $set: { plan } }, { upsert: builtIn });
      if (!result.matchedCount && !result.upsertedCount) throw new NotFoundException('Plan not found.');
    }
    return this.definition(key, plan, features);
  }

  async setPlanActive(key: string, active: unknown) {
    if (typeof active !== 'boolean') throw new BadRequestException('Active must be true or false.');
    const existing = await this.get(key);
    if (!existing) throw new NotFoundException('Plan not found.');
    if (key === SubscriptionPlan.FREE) throw new BadRequestException('The legacy free plan cannot be sold.');
    const stored = await this.plans.findOne({ _id: key });
    const plan = stored?.plan ?? this.defaultPlan(getPlanDefinition(key as SubscriptionPlan));
    await this.plans.updateOne({ _id: key }, { $set: { plan: { ...plan, isPurchasable: active } } }, { upsert: true });
    return { key, isPurchasable: active };
  }

  async deleteFeature(key: string) {
    const feature = (await this.getFeatures()).find(item => item.key === key);
    if (!feature) throw new NotFoundException('Feature not found.');
    if (!key.startsWith('custom:')) {
      await this.removedFeatures.updateOne({ _id: key }, { $set: { _id: key } }, { upsert: true });
    }
    await this.connection.db!.collection<PlanDocument>('subscriptionplanconfigs').updateMany(
      { 'plan.featureKeys': key },
      { $pull: { 'plan.featureKeys': key } } as any,
    );
    if (key.startsWith('custom:')) await this.customFeatures.deleteOne({ _id: key });
    return { deleted: true, key };
  }

  async addFeature(name: unknown) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
      throw new BadRequestException('Enter a feature name of up to 100 characters.');
    }
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (BUILT_IN_FEATURES.some(feature => feature.name.toLowerCase() === cleanName.toLowerCase())) {
      throw new ConflictException('That feature already exists.');
    }
    const key = `custom:${cleanName.toLowerCase()}`;
    try {
      await this.customFeatures.insertOne({ _id: key, name: cleanName });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new ConflictException('That feature already exists.');
      throw error;
    }
    return { key, name: cleanName, controlsAccess: false };
  }
}
