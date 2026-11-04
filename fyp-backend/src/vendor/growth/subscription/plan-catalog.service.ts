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

export const PLAN_KEY = /^[a-z][a-z0-9-]{0,63}$/;
// The catalog is intentionally fixed to app capabilities. Admins can assign
// these entitlements to any plan, but cannot invent a new functional feature.
// Use the same customer-facing wording in the admin catalog and vendor plans.
// Only feature keys with existing app behavior are exposed.
const FEATURE_LABELS: Partial<Record<FeatureKey, string>> = {
  [FeatureKey.FEATURED_VENDOR]: 'Featured vendor slots',
  [FeatureKey.FEATURED_PACKAGE]: 'Featured package slots',
  [FeatureKey.PROMOTIONAL_BADGES]: 'Promotional badges',
  [FeatureKey.COUPONS]: 'Coupons',
  [FeatureKey.DISCOUNT_CODES]: 'Discount codes',
  [FeatureKey.CAMPAIGNS]: 'Promotional campaigns',
  [FeatureKey.GROWTH_ANALYTICS]: 'Growth analytics',
  [FeatureKey.ADVANCED_ANALYTICS]: 'Advanced analytics & business insights',
  [FeatureKey.BUSINESS_INSIGHTS]: 'Business insights',
  [FeatureKey.CAMPAIGN_ANALYTICS]: 'Campaign analytics',
  [FeatureKey.PREMIUM_BADGE]: 'Premium Partner visibility',
};
const FIXED_FEATURES: Feature[] = Object.entries(FEATURE_LABELS).map(([key, name]) => ({
  key, name: name!, controlsAccess: true,
}));

// These are available to every vendor and are not paid feature toggles.
const CORE_BENEFITS = [
  'Standard marketplace listing',
  'Bookings, messages & availability',
  'Reviews and basic business stats',
];

const DEFAULT_RANK: Record<string, number> = { basic: 1, growth: 2, premium: 3 };
const humanize = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase());

@Injectable()
export class PlanCatalogService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  private get plans() {
    return this.connection.db!.collection<PlanDocument>('subscriptionplanconfigs');
  }

  async getFeatures(): Promise<Feature[]> {
    // Old custom benefits and removed-feature tombstones are intentionally
    // ignored. Neither should alter executable feature entitlements.
    return FIXED_FEATURES;
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
      featureKeys: FIXED_FEATURES.filter(feature => plan.features[feature.key as FeatureKey]).map(feature => feature.key),
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
      featureLabels: [
        ...(key === SubscriptionPlan.FREE ? [] : CORE_BENEFITS),
        ...([
          [LimitKey.MAX_PACKAGES, 'packages'],
          [LimitKey.MAX_PORTFOLIO_IMAGES, 'portfolio images'],
          [LimitKey.MAX_IMAGES_PER_PACKAGE, 'images per package'],
        ] as const).filter(([limit]) => plan.limits[limit] > 0)
          .map(([limit, label]) => `Up to ${plan.limits[limit]} ${label}`),
        ...(enabled.has(FeatureKey.CAMPAIGNS) && plan.limits[LimitKey.MONTHLY_CAMPAIGN_LIMIT] > 0
          ? [`Up to ${plan.limits[LimitKey.MONTHLY_CAMPAIGN_LIMIT]} promotional campaigns per month`] : []),
        ...(enabled.has(FeatureKey.FEATURED_VENDOR) && plan.limits[LimitKey.FEATURED_VENDOR_LIMIT] > 0
          ? [`Up to ${plan.limits[LimitKey.FEATURED_VENDOR_LIMIT]} featured vendor ${plan.limits[LimitKey.FEATURED_VENDOR_LIMIT] === 1 ? 'slot' : 'slots'}`] : []),
        ...(enabled.has(FeatureKey.FEATURED_PACKAGE) && plan.limits[LimitKey.FEATURED_PACKAGE_LIMIT] > 0
          ? [`Up to ${plan.limits[LimitKey.FEATURED_PACKAGE_LIMIT]} featured package ${plan.limits[LimitKey.FEATURED_PACKAGE_LIMIT] === 1 ? 'slot' : 'slots'}`] : []),
        ...(enabled.has(FeatureKey.COUPONS) && plan.limits[LimitKey.COUPON_LIMIT] > 0
          ? [`Up to ${plan.limits[LimitKey.COUPON_LIMIT]} active coupons`] : []),
        ...(enabled.has(FeatureKey.DISCOUNT_CODES) && plan.limits[LimitKey.DISCOUNT_CODE_LIMIT] > 0
          ? [`Up to ${plan.limits[LimitKey.DISCOUNT_CODE_LIMIT]} active discount codes`] : []),
        ...(enabled.has(FeatureKey.PROMOTIONAL_BADGES) ? ['Promotional badges'] : []),
        ...(enabled.has(FeatureKey.GROWTH_ANALYTICS) && !enabled.has(FeatureKey.ADVANCED_ANALYTICS)
          ? ['Growth analytics'] : []),
        ...(enabled.has(FeatureKey.ADVANCED_ANALYTICS) && enabled.has(FeatureKey.BUSINESS_INSIGHTS)
          ? ['Advanced analytics & business insights']
          : enabled.has(FeatureKey.ADVANCED_ANALYTICS)
            ? ['Advanced analytics']
            : enabled.has(FeatureKey.BUSINESS_INSIGHTS) ? ['Business insights'] : []),
        ...(enabled.has(FeatureKey.PREMIUM_BADGE) ? ['Premium Partner visibility'] : []),
        // Campaign analytics stays available in feature access, but is not
        // advertised as a second benefit alongside promotional campaigns.
      ],
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

}
