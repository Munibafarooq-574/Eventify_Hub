import { Types } from 'mongoose';
import { ReviewModerationStatus } from '../../../schemas/review.schema';
import { PromotionService } from './promotion.service';

describe('PromotionService featured package ranking', () => {
  it('ranks packages using public vendor reviews, including legacy reviews', async () => {
    const reviewedVendorId = new Types.ObjectId();
    const newVendorId = new Types.ObjectId();
    const vendors = [newVendorId, reviewedVendorId].map(_id => ({
      _id,
      name: 'Vendor',
      packages: [{ _id: new Types.ObjectId(), packageName: 'Package' }],
    }));
    const promotions = vendors.map(vendor => ({
      _id: new Types.ObjectId(),
      vendorId: vendor._id,
      packageId: vendor.packages[0]._id.toString(),
      startDate: new Date(),
    }));
    const aggregateReviews = jest.fn().mockResolvedValue([
      { _id: reviewedVendorId, averageRating: 4.5, totalReviews: 2 },
    ]);
    const service = new PromotionService(
      { find: () => ({ sort: () => ({ lean: async () => promotions }) }) } as any,
      { find: () => ({ select: () => ({ lean: async () => vendors }) }) } as any,
      { aggregate: aggregateReviews } as any,
      { aggregate: async () => [], countDocuments: async () => 0 } as any,
      { canUseFeature: async () => true } as any,
      {} as any,
      {} as any,
    );

    const results = await service.getActiveFeaturedPackages();

    expect(aggregateReviews).toHaveBeenCalledWith([
      {
        $match: {
          vendorId: { $in: [newVendorId, reviewedVendorId] },
          $or: [
            { status: ReviewModerationStatus.VISIBLE },
            { status: { $exists: false } },
          ],
        },
      },
      {
        $group: {
          _id: '$vendorId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);
    expect(results).toMatchObject([
      { vendorId: reviewedVendorId.toString(), rating: 4.5, totalReviews: 2 },
      { vendorId: newVendorId.toString(), rating: null, totalReviews: 0 },
    ]);
    expect(results[0].featuredScore).toBeGreaterThan(results[1].featuredScore);
  });

  it.each(['vendor', 'package'] as const)('checks featured %s availability in the event city timezone', async type => {
    const vendorId = new Types.ObjectId();
    const packageId = new Types.ObjectId();
    const cityId = new Types.ObjectId().toString();
    const vendor = { _id: vendorId, packages: [{ _id: packageId }] };
    const promotion = { _id: new Types.ObjectId(), vendorId, packageId, startDate: new Date() };
    const checkVendorAvailability = jest.fn().mockResolvedValue({ available: false });
    const requireCityTimeZone = jest.fn().mockResolvedValue('America/Los_Angeles');
    const service = new PromotionService(
      { find: () => ({ sort: () => ({ lean: async () => [promotion] }) }) } as any,
      {
        find: () => ({ select: () => ({ lean: async () => [vendor] }) }),
        findOne: () => ({
          select: () => ({ populate: () => ({ populate: () => ({ lean: async () => vendor }) }) }),
        }),
      } as any,
      { aggregate: async () => [] } as any,
      { aggregate: async () => [] } as any,
      { canUseFeature: async () => true } as any,
      { checkVendorAvailability } as any,
      { requireCityTimeZone } as any,
    );

    const context = {
      eventCityId: cityId,
      eventDate: '2026-11-12',
      startTime: '14:00',
      durationMinutes: 60,
    };
    const results = type === 'vendor'
      ? await service.getActiveFeaturedVendors(5, context)
      : await service.getActiveFeaturedPackages(5, context);

    expect(results).toEqual([]);
    expect(requireCityTimeZone).toHaveBeenCalledWith(cityId);
    expect(checkVendorAvailability).toHaveBeenCalledWith(
      vendorId.toString(),
      new Date('2026-11-12T22:00:00Z'),
      new Date('2026-11-12T23:00:00Z'),
      packageId.toString(),
      undefined,
      undefined,
      false,
      'America/Los_Angeles',
    );
  });
});
