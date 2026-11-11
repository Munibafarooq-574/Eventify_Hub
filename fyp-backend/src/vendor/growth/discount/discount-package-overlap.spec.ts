import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { DiscountService } from './discount.service';
import { DiscountEntryType, DiscountKind, DiscountStatus } from './discount.types';

// Isolated creation-rule tests: no MongoMemoryServer or production database.
describe('DiscountService — coupon package occupancy', () => {
  const vendorId = new Types.ObjectId().toString();
  const packageA = new Types.ObjectId().toString();
  const packageB = new Types.ObjectId().toString();

  const payload = (packageIds?: string[]) => ({
    code: 'NEW10',
    discountType: DiscountKind.PERCENTAGE,
    discountValue: 10,
    minimumOrderAmount: 0,
    ...(packageIds ? { packageIds } : {}),
    startDate: new Date(Date.now() - 60_000).toISOString(),
    endDate: new Date(Date.now() + 86_400_000).toISOString(),
    usageLimit: 10,
  });

  function setup(existing: any[] = []) {
    const service: any = Object.create(DiscountService.prototype);
    service.assertValidId = jest.fn();
    service.validatePayload = jest.fn();
    service.assertOwnsPackage = jest.fn();
    service.expireStale = jest.fn();
    service.featureAccessService = {
      canUseFeature: jest.fn().mockResolvedValue(true),
      getFeatureLimit: jest.fn().mockResolvedValue(5),
    };
    const create = jest.fn().mockImplementation(async (data: any) => data);
    const findOne = jest.fn().mockImplementation(async (filter: any) => {
      const active = existing.filter(entry =>
        entry.status === DiscountStatus.ACTIVE && entry.endDate >= new Date());
      if (filter.code) return active.find(entry => entry.code === filter.code) || null;
      const ids: string[] = filter.$or?.[1]?.packageId?.$in || [];
      return active.filter(entry => !filter.type || entry.type === filter.type).find(entry =>
        !filter.$or || // Creating an all-packages offer conflicts with any active offer.
        (!entry.packageId && (!entry.packageIds || !entry.packageIds.length)) ||
        (entry.packageId && ids.includes(entry.packageId)) ||
        (entry.packageIds || []).some((id: string) => ids.includes(id))
      ) || null;
    });
    service.discountModel = {
      findOne,
      countDocuments: jest.fn().mockResolvedValue(0),
      create,
    };
    service.userModel = {
      findById: jest.fn().mockReturnValue({
        select: () => ({ lean: async () => ({ marketplaceCountryCode: 'US' }) }),
      }),
    };
    return { service, create, findOne };
  }

  const existingOffer = (overrides: Record<string, any> = {}) => ({
    code: 'OLD20',
    status: DiscountStatus.ACTIVE,
    type: DiscountEntryType.COUPON,
    packageId: null,
    packageIds: [packageA],
    endDate: new Date(Date.now() + 86_400_000),
    ...overrides,
  });

  const options: any = { featureKey: 'coupons', limitKey: 'couponLimit', noun: 'coupon' };

  it('blocks a new coupon on an occupied selected package', async () => {
    const { service, create } = setup([existingOffer()]);
    await expect(service.createDiscountEntry(vendorId, DiscountEntryType.COUPON, payload([packageA]), options))
      .rejects.toThrow('Cancel it before creating a new coupon.');
    expect(create).not.toHaveBeenCalled();
  });

  it('allows an emailed discount code even if a coupon covers all packages', async () => {
    const { service, create } = setup([existingOffer({ packageIds: [] })]);
    await service.createDiscountEntry(vendorId, DiscountEntryType.DISCOUNT_CODE, payload(), options);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ packageIds: [], packageId: null }));
  });

  it('allows a coupon even when an emailed discount code exists', async () => {
    const { service, create } = setup([existingOffer({ type: DiscountEntryType.DISCOUNT_CODE })]);
    await service.createDiscountEntry(vendorId, DiscountEntryType.COUPON, payload(), options);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('allows a different unoccupied package', async () => {
    const { service, create } = setup([existingOffer()]);
    await service.createDiscountEntry(vendorId, DiscountEntryType.COUPON, payload([packageB]), options);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ packageIds: [packageB] }));
  });

  it('allows creating again after cancellation', async () => {
    const { service, create } = setup([existingOffer({ status: DiscountStatus.CANCELLED })]);
    await service.createDiscountEntry(vendorId, DiscountEntryType.COUPON, payload([packageA]), options);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('allows creating again after expiry', async () => {
    const { service, create } = setup([existingOffer({ endDate: new Date(Date.now() - 86_400_000) })]);
    await service.createDiscountEntry(vendorId, DiscountEntryType.COUPON, payload([packageA]), options);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('blocks a legacy single-package offer', async () => {
    const { service } = setup([existingOffer({ packageId: packageA, packageIds: [] })]);
    await expect(service.createDiscountEntry(vendorId, DiscountEntryType.COUPON, payload([packageA]), options))
      .rejects.toThrow(BadRequestException);
  });
});

describe('DiscountService public package price previews', () => {
  const vendorId = new Types.ObjectId().toString();
  const packageId = new Types.ObjectId();
  const otherId = new Types.ObjectId();
  const basePackage = { _id: packageId, currency: 'USD', price: 200, bookingType: 'DURATION_BASED',
    baseIncludedDurationMinutes: 300, durations: [{ value: 6, unit: 'HOURS', price: 260 }] };
  const baseCoupon = { _id: new Types.ObjectId(), code: 'SAVE10', currency: 'USD',
    discountType: DiscountKind.PERCENTAGE, discountValue: 10, minimumOrderAmount: 0,
    packageIds: [packageId.toString()] };

  function setup(overrides: object = {}) {
    const coupon = { ...baseCoupon, ...overrides };
    const service = Object.create(DiscountService.prototype);
    service.featureAccessService = { hasActiveSubscription: async () => true };
    service.discountModel = {
      find: () => ({ sort: () => ({ exec: async () => [{ ...coupon, toObject: () => coupon }] }) }),
    };
    service.userModel = {
      findById: () => ({ select: () => ({
        lean: async () => ({ packages: [basePackage, { ...basePackage, _id: otherId }] }),
      }) }),
    };
    service.findActiveEntryByCode = async () => coupon;
    service.redemptionModel = { exists: async () => false };
    return service as DiscountService;
  }

  it('shows $180 alongside the original $200 and matches checkout validation', async () => {
    const service = setup();
    const [offer] = await service.getPublicCoupons(vendorId, undefined, { durationMinutes: NaN });
    const checkout = await service.validateCoupon(
      vendorId, 'SAVE10', 200, new Types.ObjectId().toString(), packageId.toString(),
    );
    expect(checkout.finalAmount).toBe(180);
    expect(offer).toMatchObject({
      packagePricePreviews: {
        [packageId.toString()]: { originalPrice: 200, finalAmount: checkout.finalAmount, currency: 'USD' },
      },
    });
    expect(Object.keys((offer as any).packagePricePreviews)).toEqual([packageId.toString()]);
  });

  it('uses the duration tier and respects the discount cap', async () => {
    const [offer] = await setup({ maximumDiscountAmount: 15 }).getPublicCoupons(
      vendorId, undefined, { durationMinutes: 360 },
    );
    expect(offer).toMatchObject({
      packagePricePreviews: { [packageId.toString()]: { originalPrice: 260, finalAmount: 245 } },
    });
  });

  it('omits previews below the minimum or for an unavailable duration', async () => {
    const [belowMinimum] = await setup({ minimumOrderAmount: 250 }).getPublicCoupons(
      vendorId, undefined, { durationMinutes: NaN },
    );
    const [unavailable] = await setup().getPublicCoupons(vendorId, undefined, { durationMinutes: 420 });
    expect(belowMinimum).toMatchObject({ packagePricePreviews: {} });
    expect(unavailable).toMatchObject({ packagePricePreviews: {} });
  });
});
