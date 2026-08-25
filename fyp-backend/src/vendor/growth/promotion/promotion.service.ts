// fyp-backend/src/vendor/growth/promotion/promotion.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VendorPromotion } from '../../../schemas/vendor-promotion.schema';
import { PromotionStatus, PromotionType } from './promotion.types';
import { FeatureAccessService } from '../feature-access.service';
import { FeatureKey, LimitKey } from '../subscription/subscription.types';
import { User } from 'src/schemas/user.schema';

export interface FeaturedVendorPublicEntry {
  promotionId: string;
  vendorId: string;
  vendorName: string;
  coverImage: string | null;
  businessCategoryName: string | null;
  city: string | null;
  featuredUntil: Date;
}

@Injectable()
export class PromotionService {
  constructor(
    @InjectModel(VendorPromotion.name) private readonly promotionModel: Model<VendorPromotion>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly featureAccessService: FeatureAccessService,
  ) {}

  // ---------------------------------------------------------------
  // Featured Vendor — vendor-facing
  // ---------------------------------------------------------------

  async activateFeaturedVendor(vendorId: string, durationDays: number): Promise<VendorPromotion> {
    this.assertValidId(vendorId);

    // Backend enforcement — never trust that the frontend already hid this
    // button for Free vendors.
    const allowed = await this.featureAccessService.canUseFeature(vendorId, FeatureKey.FEATURED_VENDOR);
    if (!allowed) {
      throw new ForbiddenException('Your current plan does not include Featured Vendor. Upgrade to Growth or Premium.');
    }

    await this.expireStalePromotions(vendorId, PromotionType.FEATURED_VENDOR);

    const activeCount = await this.promotionModel.countDocuments({
      vendorId: new Types.ObjectId(vendorId),
      type: PromotionType.FEATURED_VENDOR,
      status: PromotionStatus.ACTIVE,
    });

    const limit = await this.featureAccessService.getFeatureLimit(vendorId, LimitKey.FEATURED_VENDOR_LIMIT);

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

  async getVendorFeaturedVendorPromotions(vendorId: string): Promise<VendorPromotion[]> {
    this.assertValidId(vendorId);
    await this.expireStalePromotions(vendorId, PromotionType.FEATURED_VENDOR);

    return this.promotionModel
      .find({ vendorId: new Types.ObjectId(vendorId), type: PromotionType.FEATURED_VENDOR })
      .sort({ createdAt: -1 })
      .exec();
  }

  async deactivateFeaturedVendor(vendorId: string, promotionId: string): Promise<VendorPromotion> {
    this.assertValidId(vendorId);
    if (!Types.ObjectId.isValid(promotionId)) {
      throw new BadRequestException('Invalid promotionId');
    }

    const promotion = await this.promotionModel.findOne({
      _id: promotionId,
      vendorId: new Types.ObjectId(vendorId),
      type: PromotionType.FEATURED_VENDOR,
    });

    if (!promotion) {
      throw new NotFoundException('Featured Vendor promotion not found for this vendor');
    }

    if (promotion.status !== PromotionStatus.ACTIVE) {
      throw new BadRequestException('This promotion is not active');
    }

    promotion.status = PromotionStatus.CANCELLED;
    promotion.endDate = new Date(); // ends immediately
    await promotion.save();

    return promotion;
  }

  // ---------------------------------------------------------------
  // Customer-facing (used by Home / Vendor Search — full ranking
  // integration happens in Phase 9, this just exposes the raw data)
  // ---------------------------------------------------------------

  async getActiveFeaturedVendors(limit = 20): Promise<FeaturedVendorPublicEntry[]> {
    const now = new Date();

    const activePromotions = await this.promotionModel
      .find({ type: PromotionType.FEATURED_VENDOR, status: PromotionStatus.ACTIVE, endDate: { $gt: now } })
      .sort({ startDate: -1 })
      .limit(limit)
      .lean();

    if (!activePromotions.length) return [];

    const vendorIds = activePromotions.map((p) => p.vendorId);

    const vendors = await this.userModel
      .find({ _id: { $in: vendorIds } })
      .select('name coverImage city buisnessCategory')
      .populate('buisnessCategory')
      .lean();

    const vendorById = new Map(vendors.map((v: any) => [v._id.toString(), v]));

    return activePromotions
      .map((promo: any) => {
        const vendor = vendorById.get(promo.vendorId.toString());
        if (!vendor) return null; // vendor deleted/deactivated — skip
        return {
          promotionId: promo._id.toString(),
          vendorId: vendor._id.toString(),
          vendorName: vendor.name,
          coverImage: vendor.coverImage || null,
          businessCategoryName: vendor.buisnessCategory?.name || null,
          city: vendor.city || null,
          featuredUntil: promo.endDate,
        };
      })
      .filter((entry): entry is FeaturedVendorPublicEntry => entry !== null);
  }

  // ---------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------

  private async expireStalePromotions(vendorId: string, type: PromotionType): Promise<void> {
    await this.promotionModel.updateMany(
      {
        vendorId: new Types.ObjectId(vendorId),
        type,
        status: PromotionStatus.ACTIVE,
        endDate: { $lt: new Date() },
      },
      { $set: { status: PromotionStatus.EXPIRED } },
    );
  }

  private assertValidId(vendorId: string) {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Invalid vendorId');
    }
  }
}