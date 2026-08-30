
// fyp-backend/src/vendor/growth/promotion/promotion.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { VendorPromotion } from '../../../schemas/vendor-promotion.schema';
import { Review } from '../../../schemas/review.schema';
import { VendorOrder } from '../../../schemas/vendor-order.schema';
import { PromotionStatus, PromotionType } from './promotion.types';
import { FeatureAccessService } from '../feature-access.service';
import { FeatureKey, LimitKey } from '../subscription/subscription.types';
import { User } from 'src/schemas/user.schema';

/*export interface FeaturedVendorPublicEntry {
  promotionId: string;
  vendorId: string;
  vendorName: string;
  coverImage: string | null;
  businessCategoryName: string | null;
  city: string | null;
  rating: number | null;
  featuredUntil: Date;
}*/
export interface FeaturedVendorPublicEntry {
  promotionId: string;
  vendorId: string;
  vendorName: string;
  coverImage: string | null;
  businessCategoryName: string | null;
  city: string | null;
  rating: number | null;
  totalReviews: number;
  customerCount: number;
  featuredUntil: Date;
}
export interface FeaturedPackagePublicEntry {
  promotionId: string;
  vendorId: string;
  vendorName: string;
  coverImage: string | null;
  packageId: string;
  packageName: string;
  price: number;
}

@Injectable()
export class PromotionService {
  constructor(
    @InjectModel(VendorPromotion.name)
    private readonly promotionModel: Model<VendorPromotion>,

       @InjectModel(User.name)
    private readonly userModel: Model<User>,

        @InjectModel(Review.name)
    private readonly reviewModel: Model<Review>,

    @InjectModel(VendorOrder.name)
    private readonly vendorOrderModel: Model<VendorOrder>,

    private readonly featureAccessService: FeatureAccessService,
  ) {}

  // ---------------------------------------------------------------
  // Featured Vendor — vendor-facing
  // ---------------------------------------------------------------

  async activateFeaturedVendor(
    vendorId: string,
    durationDays: number,
  ): Promise<VendorPromotion> {
    this.assertValidId(vendorId);

    // Backend enforcement — never trust that the frontend already hid
    // this button for Free vendors.
    const allowed = await this.featureAccessService.canUseFeature(
      vendorId,
      FeatureKey.FEATURED_VENDOR,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'Your current plan does not include Featured Vendor. Upgrade to Growth or Premium.',
      );
    }

    await this.expireStalePromotions(
      vendorId,
      PromotionType.FEATURED_VENDOR,
    );

    const activeCount = await this.promotionModel.countDocuments({
      vendorId: new Types.ObjectId(vendorId),
      type: PromotionType.FEATURED_VENDOR,
      status: PromotionStatus.ACTIVE,
    });

    const limit = await this.featureAccessService.getFeatureLimit(
      vendorId,
      LimitKey.FEATURED_VENDOR_LIMIT,
    );

    if (activeCount >= limit) {
      throw new BadRequestException(
        `Featured Vendor limit reached (${activeCount}/${limit}). Deactivate an existing campaign or upgrade your plan.`,
      );
    }

    const now = new Date();
    const endDate = new Date(now);

    endDate.setDate(endDate.getDate() + durationDays);

    return this.promotionModel.create({
      vendorId: new Types.ObjectId(vendorId),
      type: PromotionType.FEATURED_VENDOR,
      packageId: null,
      durationDays,
      startDate: now,
      endDate,
      status: PromotionStatus.ACTIVE,
    });
  }

  async getVendorFeaturedVendorPromotions(
    vendorId: string,
  ): Promise<VendorPromotion[]> {
    this.assertValidId(vendorId);

    await this.expireStalePromotions(
      vendorId,
      PromotionType.FEATURED_VENDOR,
    );

    return this.promotionModel
      .find({
        vendorId: new Types.ObjectId(vendorId),
        type: PromotionType.FEATURED_VENDOR,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Used by BadgeService (Phase 5).
  // The "Featured" badge is earned by currently having
  // a live Featured Vendor campaign.
  async hasActiveFeaturedVendorPromotion(
    vendorId: string,
  ): Promise<boolean> {
    this.assertValidId(vendorId);

    const count = await this.promotionModel.countDocuments({
      vendorId: new Types.ObjectId(vendorId),
      type: PromotionType.FEATURED_VENDOR,
      status: PromotionStatus.ACTIVE,
      endDate: { $gt: new Date() },
    });

    return count > 0;
  }

  async deactivatePromotion(
    vendorId: string,
    promotionId: string,
  ): Promise<VendorPromotion> {
    this.assertValidId(vendorId);

    if (!Types.ObjectId.isValid(promotionId)) {
      throw new BadRequestException('Invalid promotionId');
    }

    const promotion = await this.promotionModel.findOne({
      _id: promotionId,
      vendorId: new Types.ObjectId(vendorId),
    });

    if (!promotion) {
      throw new NotFoundException(
        'Promotion not found for this vendor',
      );
    }

    if (promotion.status !== PromotionStatus.ACTIVE) {
      throw new BadRequestException('This promotion is not active');
    }

    promotion.status = PromotionStatus.CANCELLED;

    // Ends immediately. This also closes off open-ended
    // Featured Package rows.
    promotion.endDate = new Date();

    await promotion.save();

    return promotion;
  }

  // ---------------------------------------------------------------
  // Featured Package — vendor-facing
  // ---------------------------------------------------------------

  async activateFeaturedPackage(
  vendorId: string,
  packageId: string,
  durationDays: number,
): Promise<VendorPromotion> {
    this.assertValidId(vendorId);

    if (!Types.ObjectId.isValid(packageId)) {
      throw new BadRequestException('Invalid packageId');
    }

    const allowed = await this.featureAccessService.canUseFeature(
      vendorId,
      FeatureKey.FEATURED_PACKAGE,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'Your current plan does not include Featured Package. Upgrade to Growth or Premium.',
      );
    }

    // Confirm this package actually belongs to this vendor.
    // Never trust a packageId supplied by the client.
    const vendor = await this.userModel
      .findById(vendorId)
      .select('packages')
      .lean();

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const ownsPackage = (vendor.packages || []).some(
      (p: any) =>
        p?._id && p._id.toString() === packageId,
    );

    if (!ownsPackage) {
      throw new BadRequestException(
        'This package does not belong to this vendor',
      );
    }

    const existingActiveForPackage =
      await this.promotionModel.findOne({
        vendorId: new Types.ObjectId(vendorId),
        type: PromotionType.FEATURED_PACKAGE,
        packageId,
        status: PromotionStatus.ACTIVE,
      });

    if (existingActiveForPackage) {
      throw new BadRequestException(
        'This package is already featured',
      );
    }

    const activeCount = await this.promotionModel.countDocuments({
      vendorId: new Types.ObjectId(vendorId),
      type: PromotionType.FEATURED_PACKAGE,
      status: PromotionStatus.ACTIVE,
    });

    const limit = await this.featureAccessService.getFeatureLimit(
      vendorId,
      LimitKey.FEATURED_PACKAGE_LIMIT,
    );

    if (activeCount >= limit) {
      throw new BadRequestException(
        `Featured Package limit reached (${activeCount}/${limit}). Unfeature an existing package or upgrade your plan.`,
      );
    }

   const now = new Date();

const endDate = new Date(now);
endDate.setDate(endDate.getDate() + durationDays);

return this.promotionModel.create({
  vendorId: new Types.ObjectId(vendorId),
  type: PromotionType.FEATURED_PACKAGE,
  packageId,
  durationDays,
  startDate: now,
  endDate,
  status: PromotionStatus.ACTIVE,
});
  }

  async getVendorFeaturedPackages(
  vendorId: string,
): Promise<VendorPromotion[]> {
  this.assertValidId(vendorId);

  await this.expireStalePromotions(
    vendorId,
    PromotionType.FEATURED_PACKAGE,
  );

  return this.promotionModel
    .find({
        vendorId: new Types.ObjectId(vendorId),
        type: PromotionType.FEATURED_PACKAGE,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ---------------------------------------------------------------
  // Customer-facing
  // Used by Home / Vendor Search / Package Discovery.
  // ---------------------------------------------------------------

  async getActiveFeaturedVendors(
    limit = 20,
  ): Promise<FeaturedVendorPublicEntry[]> {
    const now = new Date();

    const activePromotions = await this.promotionModel
      .find({
        type: PromotionType.FEATURED_VENDOR,
        status: PromotionStatus.ACTIVE,
        endDate: { $gt: now },
      })
      .sort({ startDate: -1 })
      .limit(limit)
      .lean();

    if (!activePromotions.length) {
      return [];
    }

    const vendorIds = activePromotions.map(
      (promotion) => promotion.vendorId,
    );

        const vendors = await this.userModel
      .find({
        _id: { $in: vendorIds },
      })
      .select('name coverImage city buisnessCategory')
      .populate('buisnessCategory')
      .lean();

    const vendorById = new Map(
      vendors.map((vendor: any) => [
        vendor._id.toString(),
        vendor,
      ]),
    );

    // Average rating per vendor — computed from Review collection
    const ratingAgg = await this.reviewModel.aggregate([
      {
        $match: {
          vendorId: { $in: vendorIds.map((id) => new Types.ObjectId(id.toString())) },
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

        const ratingByVendor = new Map(
      ratingAgg.map((r: any) => [r._id.toString(), r]),
    );

    // Distinct customer (organizer) count per vendor — via VendorOrder -> Order join
    const customerAgg = await this.vendorOrderModel.aggregate([
      {
        $match: {
          vendorId: { $in: vendorIds.map((id) => new Types.ObjectId(id.toString())) },
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order',
        },
      },
      { $unwind: '$order' },
      {
        $group: {
          _id: '$vendorId',
          customers: { $addToSet: '$order.organizerId' },
        },
      },
      {
        $project: {
          _id: 1,
          customerCount: { $size: '$customers' },
        },
      },
    ]);

    const customerCountByVendor = new Map(
      customerAgg.map((c: any) => [c._id.toString(), c.customerCount]),
    );

    return activePromotions
      .map((promo: any) => {
        const vendor = vendorById.get(
          promo.vendorId.toString(),
        );

                if (!vendor) {
          // Vendor deleted/deactivated — skip.
          return null;
        }

        const ratingInfo = ratingByVendor.get(vendor._id.toString());

        return {
          promotionId: promo._id.toString(),
          vendorId: vendor._id.toString(),
          vendorName: vendor.name,
          coverImage: vendor.coverImage || null,
          businessCategoryName:
            vendor.buisnessCategory?.name || null,
          city: vendor.city || null,
          rating: ratingInfo
            ? Math.round(ratingInfo.averageRating * 10) / 10
            : null,
          totalReviews: ratingInfo ? ratingInfo.totalReviews : 0,
          customerCount: customerCountByVendor.get(vendor._id.toString()) || 0,
          featuredUntil: promo.endDate,
        };
      })
      .filter(
        (
          entry,
        ): entry is FeaturedVendorPublicEntry =>
          entry !== null,
      );
  }

  async getActiveFeaturedPackages(
    limit = 20,
  ): Promise<FeaturedPackagePublicEntry[]> {
    const now = new Date();

const activePromotions = await this.promotionModel
  .find({
    type: PromotionType.FEATURED_PACKAGE,
    status: PromotionStatus.ACTIVE,
    endDate: { $gt: now },
  })
      .sort({ startDate: -1 })
      .limit(limit)
      .lean();

    if (!activePromotions.length) {
      return [];
    }

    const vendorIds = [
      ...new Set(
        activePromotions.map(
          (promotion) => promotion.vendorId.toString(),
        ),
      ),
    ];

    const vendors = await this.userModel
      .find({
        _id: {
          $in: vendorIds.map(
            (id) => new Types.ObjectId(id),
          ),
        },
      })
      .select('name coverImage packages')
      .lean();

    const vendorById = new Map(
      vendors.map((vendor: any) => [
        vendor._id.toString(),
        vendor,
      ]),
    );

    return activePromotions
      .map((promo: any) => {
        const vendor = vendorById.get(
          promo.vendorId.toString(),
        );

        if (!vendor) {
          return null;
        }

        const pkg = (vendor.packages || []).find(
          (p: any) =>
            p?._id &&
            p._id.toString() === promo.packageId,
        );

        if (!pkg) {
          // Package was deleted after being featured.
          return null;
        }

        return {
          promotionId: promo._id.toString(),
          vendorId: vendor._id.toString(),
          vendorName: vendor.name,
          coverImage: vendor.coverImage || null,
          packageId: pkg._id.toString(),
          packageName: pkg.packageName,
          price: pkg.price,
        };
      })
      .filter(
        (
          entry,
        ): entry is FeaturedPackagePublicEntry =>
          entry !== null,
      );
  }

  // ---------------------------------------------------------------
  // Bulk lookups — Phase 9 DiscoveryService
  //
  // These return IDs only so DiscoveryService can cheaply determine
  // whether a vendor/package should receive a featured boost without
  // making a database query for every search result.
  // ---------------------------------------------------------------

  async getActiveFeaturedVendorIds(): Promise<Set<string>> {
    const now = new Date();

    const promotions = await this.promotionModel
      .find({
        type: PromotionType.FEATURED_VENDOR,
        status: PromotionStatus.ACTIVE,
        endDate: { $gt: now },
      })
      .select('vendorId')
      .lean();

    return new Set(
      promotions.map(
        (promotion: any) =>
          promotion.vendorId.toString(),
      ),
    );
  }

  async getActiveFeaturedPackageIds(): Promise<Set<string>> {
  const now = new Date();

  const promotions = await this.promotionModel
    .find({
      type: PromotionType.FEATURED_PACKAGE,
      status: PromotionStatus.ACTIVE,
      endDate: { $gt: now },
    })
      .select('packageId')
      .lean();

    return new Set(
      promotions
        .map((promotion: any) =>
          promotion.packageId?.toString(),
        )
        .filter(Boolean),
    );
  }

  // ---------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------

  private async expireStalePromotions(
    vendorId: string,
    type: PromotionType,
  ): Promise<void> {
    await this.promotionModel.updateMany(
      {
        vendorId: new Types.ObjectId(vendorId),
        type,
        status: PromotionStatus.ACTIVE,

        // $ne: null guards Featured Package rows,
        // which have no endDate.
        endDate: {
          $ne: null,
          $lt: new Date(),
        },
      },
      {
        $set: {
          status: PromotionStatus.EXPIRED,
        },
      },
    );
  }

  private assertValidId(vendorId: string): void {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException(
        'Invalid vendorId',
      );
    }
  }
}
