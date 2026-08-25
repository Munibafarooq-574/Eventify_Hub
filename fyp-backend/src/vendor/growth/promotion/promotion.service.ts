// fyp-backend/src/vendor/growth/promotion/promotion.service.ts
/*import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
}*/

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

  // Used by BadgeService (Phase 5) — the "Featured" badge is earned by
  // currently having a live Featured Vendor campaign, not selected manually.
  async hasActiveFeaturedVendorPromotion(vendorId: string): Promise<boolean> {
    this.assertValidId(vendorId);
    const count = await this.promotionModel.countDocuments({
      vendorId: new Types.ObjectId(vendorId),
      type: PromotionType.FEATURED_VENDOR,
      status: PromotionStatus.ACTIVE,
      endDate: { $gt: new Date() },
    });
    return count > 0;
  }

  async deactivatePromotion(vendorId: string, promotionId: string): Promise<VendorPromotion> {
    this.assertValidId(vendorId);
    if (!Types.ObjectId.isValid(promotionId)) {
      throw new BadRequestException('Invalid promotionId');
    }

    const promotion = await this.promotionModel.findOne({
      _id: promotionId,
      vendorId: new Types.ObjectId(vendorId),
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found for this vendor');
    }

    if (promotion.status !== PromotionStatus.ACTIVE) {
      throw new BadRequestException('This promotion is not active');
    }

    promotion.status = PromotionStatus.CANCELLED;
    promotion.endDate = new Date(); // ends immediately, also closes off open-ended Featured Package rows
    await promotion.save();

    return promotion;
  }

  // ---------------------------------------------------------------
  // Featured Package — vendor-facing
  // ---------------------------------------------------------------

  async activateFeaturedPackage(vendorId: string, packageId: string): Promise<VendorPromotion> {
    this.assertValidId(vendorId);

    const allowed = await this.featureAccessService.canUseFeature(vendorId, FeatureKey.FEATURED_PACKAGE);
    if (!allowed) {
      throw new ForbiddenException('Your current plan does not include Featured Package. Upgrade to Growth or Premium.');
    }

    // Confirm this package actually belongs to this vendor — never trust
    // a packageId supplied by the client without checking ownership.
    const vendor = await this.userModel.findById(vendorId).select('packages').lean();
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    const ownsPackage = (vendor.packages || []).some((p: any) => p._id.toString() === packageId);
    if (!ownsPackage) {
      throw new BadRequestException('This package does not belong to this vendor');
    }

    const existingActiveForPackage = await this.promotionModel.findOne({
      vendorId: new Types.ObjectId(vendorId),
      type: PromotionType.FEATURED_PACKAGE,
      packageId,
      status: PromotionStatus.ACTIVE,
    });
    if (existingActiveForPackage) {
      throw new BadRequestException('This package is already featured');
    }

    const activeCount = await this.promotionModel.countDocuments({
      vendorId: new Types.ObjectId(vendorId),
      type: PromotionType.FEATURED_PACKAGE,
      status: PromotionStatus.ACTIVE,
    });

    const limit = await this.featureAccessService.getFeatureLimit(vendorId, LimitKey.FEATURED_PACKAGE_LIMIT);

    if (activeCount >= limit) {
      throw new BadRequestException(
        `Featured Package limit reached (${activeCount}/${limit}). Unfeature an existing package or upgrade your plan.`,
      );
    }

    return this.promotionModel.create({
      vendorId: new Types.ObjectId(vendorId),
      type: PromotionType.FEATURED_PACKAGE,
      packageId,
      durationDays: null,
      startDate: new Date(),
      endDate: null, // stays featured until manually unfeatured or plan downgrade
      status: PromotionStatus.ACTIVE,
    });
  }

  async getVendorFeaturedPackages(vendorId: string): Promise<VendorPromotion[]> {
    this.assertValidId(vendorId);
    return this.promotionModel
      .find({ vendorId: new Types.ObjectId(vendorId), type: PromotionType.FEATURED_PACKAGE })
      .sort({ createdAt: -1 })
      .exec();
  }

  // ---------------------------------------------------------------
  // Customer-facing (used by Home / Vendor Search & package discovery —
  // full ranking integration happens in Phase 9, this just exposes the
  // raw data)
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

  async getActiveFeaturedPackages(limit = 20): Promise<FeaturedPackagePublicEntry[]> {
    // Ordered most-recently-featured first. If a vendor downgrades their
    // plan while over the new limit, the extra rows stay ACTIVE in the DB
    // (we don't silently unfeature them), but this ordering naturally
    // keeps the display limited to what Phase 9's discovery UI decides to
    // show — that trimming logic belongs with the discovery screen, not here.
    const activePromotions = await this.promotionModel
      .find({ type: PromotionType.FEATURED_PACKAGE, status: PromotionStatus.ACTIVE })
      .sort({ startDate: -1 })
      .limit(limit)
      .lean();

    if (!activePromotions.length) return [];

    const vendorIds = [...new Set(activePromotions.map((p) => p.vendorId.toString()))];

    const vendors = await this.userModel
      .find({ _id: { $in: vendorIds } })
      .select('name coverImage packages')
      .lean();

    const vendorById = new Map(vendors.map((v: any) => [v._id.toString(), v]));

    return activePromotions
      .map((promo: any) => {
        const vendor = vendorById.get(promo.vendorId.toString());
        if (!vendor) return null;
        const pkg = (vendor.packages || []).find((p: any) => p._id.toString() === promo.packageId);
        if (!pkg) return null; // package was deleted after being featured — skip
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
      .filter((entry): entry is FeaturedPackagePublicEntry => entry !== null);
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
        endDate: { $ne: null, $lt: new Date() }, // $ne: null guards Featured Package rows, which have no endDate
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