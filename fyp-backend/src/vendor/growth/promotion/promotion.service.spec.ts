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
});
