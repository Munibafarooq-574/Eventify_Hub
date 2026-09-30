
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
import { VendorAvailabilityService } from '../../../vendor-availability/vendor-availability.service';
import { FeatureKey, LimitKey } from '../subscription/subscription.types';
import { User } from 'src/schemas/user.schema';

export interface FeaturedVendorPublicEntry {
  promotionId: string;
  vendorId: string;
  vendorName: string;
  brandLogo: string | null;
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
  rating: number | null;        // NEW
  totalReviews: number;         // NEW
  orderCount: number;           // NEW
}

interface FeaturedVendorDiscoveryContext {
  eventCityId?: string;
  categoryIds?: string[];
  eventDate?: string;
  startTime?: string;
  durationMinutes?: number;
}

interface FeaturedPackageDiscoveryContext {
  eventCityId?: string;
  categoryIds?: string[];
  eventDate?: string;
  startTime?: string;
  durationMinutes?: number;
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
private readonly availabilityService: VendorAvailabilityService,
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
  limit = 10,
  context: FeaturedVendorDiscoveryContext = {},
): Promise<FeaturedVendorPublicEntry[]> {
  const now = new Date();

  const safeLimit = Math.min(
    Math.max(Number(limit) || 10, 1),
    20,
  );

  const eventCityId =
    context.eventCityId?.trim() || undefined;

  const categoryIds = Array.from(
    new Set(
      (context.categoryIds ?? [])
        .map((id) => id.trim())
        .filter((id) => Types.ObjectId.isValid(id)),
    ),
  );

if (
  eventCityId &&
  !Types.ObjectId.isValid(eventCityId)
) {
  return [];
}

const hasAvailabilityContext =
  Boolean(context.eventDate) &&
  Boolean(context.startTime) &&
  typeof context.durationMinutes === 'number' &&
  Number.isFinite(context.durationMinutes) &&
  context.durationMinutes > 0;

let eventStartDateTime: Date | undefined;
let eventEndDateTime: Date | undefined;

if (hasAvailabilityContext) {
  const [hours, minutes] =
    context.startTime!.split(':').map(Number);

  eventStartDateTime =
    new Date(context.eventDate!);

  eventStartDateTime.setHours(
    hours,
    minutes,
    0,
    0,
  );

  eventEndDateTime = new Date(
    eventStartDateTime.getTime() +
      context.durationMinutes! * 60000,
  );
}

  // Do NOT limit here.
  // Mandatory eligibility must happen before final limit.
  const promotions = await this.promotionModel
    .find({
      type: PromotionType.FEATURED_VENDOR,
      status: PromotionStatus.ACTIVE,
      startDate: { $lte: now },
      endDate: { $gt: now },
    })
    .sort({
      startDate: -1,
      _id: 1,
    })
    .lean();

  const results: FeaturedVendorPublicEntry[] = [];

  for (const promotion of promotions) {
    const vendorId = String(promotion.vendorId);

    // Existing FEATURED_VENDOR entitlement remains authoritative.
    const stillEligible =
      await this.featureAccessService.canUseFeature(
        vendorId,
        FeatureKey.FEATURED_VENDOR,
      );

    if (!stillEligible) {
      continue;
    }

    const vendor = await this.userModel
      .findOne({
        _id: new Types.ObjectId(vendorId),
        role: 'Vendor',

        ...(eventCityId
          ? {
              serviceLocationCityIds:
                new Types.ObjectId(eventCityId),
            }
          : {}),

        ...(categoryIds.length > 0
          ? {
              buisnessCategory: {
                $in: categoryIds.map(
                  (id) => new Types.ObjectId(id),
                ),
              },
            }
          : {}),
      })
      .select(
        'name contactDetails city buisnessCategory serviceLocationCityIds packages',
      )
      .populate('buisnessCategory', 'name')
      .lean();

    if (!vendor) {
  continue;
}

if (
  hasAvailabilityContext &&
  eventStartDateTime &&
  eventEndDateTime
) {
  const packages =
    (vendor as any).packages ?? [];

  const packageChecks =
    await Promise.all(
      packages.map((pkg: any) =>
        this.availabilityService.checkVendorAvailability(
          vendorId,
          eventStartDateTime!,
          eventEndDateTime!,
          pkg._id?.toString(),
        ),
      ),
    );

  if (
    !packageChecks.some(
      (result) => result.available,
    )
  ) {
    continue;
  }
}

const reviews = await this.reviewModel
      .find({
        vendorId: new Types.ObjectId(vendorId),
      })
      .select('rating')
      .lean();

    const totalReviews = reviews.length;

    const rating =
      totalReviews > 0
        ? reviews.reduce(
            (sum: number, review: any) =>
              sum + Number(review.rating || 0),
            0,
          ) / totalReviews
        : null;

    const customerCount =
      await this.vendorOrderModel.countDocuments({
        vendorId: new Types.ObjectId(vendorId),
        status: 'completed',
      });

    results.push({
      promotionId: String(promotion._id),
      vendorId,
      vendorName: vendor.name ?? 'Vendor',
      brandLogo:
        (vendor as any).contactDetails?.brandLogo ??
        null,
      businessCategoryName:
        (vendor as any).buisnessCategory?.name ??
        null,
      city:
        (vendor as any).city ??
        null,
      rating,
      totalReviews,
      customerCount,
      featuredUntil: promotion.endDate as Date,
    });

    // Limit AFTER mandatory entitlement/city/category eligibility.
    if (results.length >= safeLimit) {
      break;
    }
  }

  return results;
}

async getActiveFeaturedPackages(
  limit = 20,
  context: FeaturedPackageDiscoveryContext = {},
): Promise<FeaturedPackagePublicEntry[]> {
  const now = new Date();

  const safeLimit = Math.min(
    Math.max(Number(limit) || 20, 1),
    20,
  );

  const eventCityId =
    context.eventCityId?.trim() || undefined;

  const categoryIds = Array.from(
    new Set(
      (context.categoryIds ?? [])
        .map((id) => id.trim())
        .filter((id) =>
          Types.ObjectId.isValid(id),
        ),
    ),
  );

 if (
  eventCityId &&
  !Types.ObjectId.isValid(eventCityId)
) {
  return [];
}

const hasAvailabilityContext =
  Boolean(context.eventDate) &&
  Boolean(context.startTime) &&
  typeof context.durationMinutes === 'number' &&
  Number.isFinite(context.durationMinutes) &&
  context.durationMinutes > 0;

let eventStartDateTime: Date | undefined;
let eventEndDateTime: Date | undefined;

if (hasAvailabilityContext) {
  const [hours, minutes] =
    context.startTime!.split(':').map(Number);

  eventStartDateTime =
    new Date(context.eventDate!);

  eventStartDateTime.setHours(
    hours,
    minutes,
    0,
    0,
  );

  eventEndDateTime = new Date(
    eventStartDateTime.getTime() +
      context.durationMinutes! * 60000,
  );
}

  // Do not limit before mandatory eligibility.
  const activePromotions =
    await this.promotionModel
      .find({
        type: PromotionType.FEATURED_PACKAGE,
        status: PromotionStatus.ACTIVE,
        startDate: { $lte: now },
        endDate: { $gt: now },
      })
      .sort({
        startDate: -1,
        _id: 1,
      })
      .lean();

  if (!activePromotions.length) {
    return [];
  }

  const vendorIds = [
    ...new Set(
      activePromotions.map((promotion) =>
        promotion.vendorId.toString(),
      ),
    ),
  ];

  const packageIds = activePromotions
    .map((promotion) =>
      promotion.packageId?.toString(),
    )
    .filter(
      (id): id is string =>
        typeof id === 'string' &&
        id.length > 0,
    );

  // Promotion can outlive the subscription that
  // created it, so re-check current entitlement.
  const eligibilityChecks =
    await Promise.all(
      vendorIds.map(async (vendorId) => {
        const allowed =
          await this.featureAccessService.canUseFeature(
            vendorId,
            FeatureKey.FEATURED_PACKAGE,
          );

        return [
          vendorId,
          allowed,
        ] as const;
      }),
    );

  const eligibleVendorIds = new Set(
    eligibilityChecks
      .filter(([, allowed]) => allowed)
      .map(([vendorId]) => vendorId),
  );

  const vendors = await this.userModel
    .find({
      _id: {
        $in: vendorIds.map(
          (id) => new Types.ObjectId(id),
        ),
      },

      role: 'Vendor',

      ...(eventCityId
        ? {
            serviceLocationCityIds:
              new Types.ObjectId(eventCityId),
          }
        : {}),

      ...(categoryIds.length > 0
        ? {
            buisnessCategory: {
              $in: categoryIds.map(
                (id) =>
                  new Types.ObjectId(id),
              ),
            },
          }
        : {}),
    })
    .select(
      'name coverImage packages contactDetails buisnessCategory serviceLocationCityIds',
    )
    .lean();

  const vendorById = new Map(
    vendors.map((vendor: any) => [
      vendor._id.toString(),
      vendor,
    ]),
  );

  const ratingAgg =
    packageIds.length > 0
      ? await this.reviewModel.aggregate([
          {
            $match: {
              packageId: {
                $in: packageIds,
              },
            },
          },
          {
            $group: {
              _id: '$packageId',
              averageRating: {
                $avg: '$rating',
              },
              totalReviews: {
                $sum: 1,
              },
            },
          },
        ])
      : [];

  const ratingByPackage = new Map(
    ratingAgg.map((rating: any) => [
      rating._id?.toString(),
      rating,
    ]),
  );

  const orderAgg =
    packageIds.length > 0
      ? await this.vendorOrderModel.aggregate([
          {
            $match: {
              packageId: {
                $in: packageIds,
              },
            },
          },
          {
            $group: {
              _id: '$packageId',
              orderCount: {
                $sum: 1,
              },
            },
          },
        ])
      : [];

  const orderCountByPackage = new Map(
    orderAgg.map((order: any) => [
      order._id?.toString(),
      order.orderCount,
    ]),
  );

  const results: FeaturedPackagePublicEntry[] =
    [];

  for (const promotion of activePromotions) {
    const vendorId =
      promotion.vendorId.toString();

    if (!eligibleVendorIds.has(vendorId)) {
      continue;
    }

    const vendor =
      vendorById.get(vendorId);

    if (!vendor) {
      continue;
    }

    const promotionPackageId =
      promotion.packageId?.toString();

    if (!promotionPackageId) {
      continue;
    }

    const pkg = (
      vendor.packages || []
    ).find(
      (item: any) =>
        item?._id &&
        item._id.toString() ===
          promotionPackageId,
    );

    // Deleted/non-existing package must never
    // remain publicly featured.
  if (!pkg) {
  continue;
}

if (
  hasAvailabilityContext &&
  eventStartDateTime &&
  eventEndDateTime
) {
  const availability =
    await this.availabilityService.checkVendorAvailability(
      vendorId,
      eventStartDateTime,
      eventEndDateTime,
      promotionPackageId,
    );

  if (!availability.available) {
    continue;
  }
}

const ratingInfo =
  ratingByPackage.get(
    promotionPackageId,
  );

    results.push({
      promotionId:
        promotion._id.toString(),

      vendorId:
        vendor._id.toString(),

      vendorName:
        vendor.contactDetails?.brandName ||
        vendor.name,

      coverImage:
        pkg.images?.[0] ||
        vendor.coverImage ||
        null,

      packageId:
        pkg._id.toString(),

      packageName:
        pkg.packageName,

      price:
        Number(pkg.price || 0),

      rating:
        ratingInfo
          ? Math.round(
              Number(
                ratingInfo.averageRating ||
                  0,
              ) * 10,
            ) / 10
          : null,

      totalReviews:
        ratingInfo
          ? Number(
              ratingInfo.totalReviews || 0,
            )
          : 0,

      orderCount:
        Number(
          orderCountByPackage.get(
            promotionPackageId,
          ) || 0,
        ),
    });

    // Limit only after entitlement +
    // city + category + package eligibility.
    if (results.length >= safeLimit) {
      break;
    }
  }

  return results;
}
  // ---------------------------------------------------------------
  // Bulk lookups — Phase 9 DiscoveryService
  //
  // These return IDs only so DiscoveryService can cheaply determine
  // whether a vendor/package should receive a featured boost without
  // making a database query for every search result.
  // ---------------------------------------------------------------

  /*async getActiveFeaturedVendorIds(): Promise<Set<string>> {
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
  }*/

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

    // Same guard as getActiveFeaturedVendors(): a promotion row can
    // outlive the subscription that created it (vendor cancels/downgrades
    // before the campaign's own endDate). Re-check current plan so
    // Discovery/search doesn't keep boosting a vendor who dropped to Free.
    const candidateIds = promotions.map((p: any) => p.vendorId.toString());

    const eligibilityChecks = await Promise.all(
      candidateIds.map(async (idStr) => {
        const allowed = await this.featureAccessService.canUseFeature(
          idStr,
          FeatureKey.FEATURED_VENDOR,
        );
        return [idStr, allowed] as const;
      }),
    );

    return new Set(
      eligibilityChecks
        .filter(([, allowed]) => allowed)
        .map(([idStr]) => idStr),
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
.select('vendorId packageId')
.lean();

const eligibilityChecks = await Promise.all(
  promotions.map(async (promotion: any) => {
    const allowed =
      await this.featureAccessService.canUseFeature(
        promotion.vendorId.toString(),
        FeatureKey.FEATURED_PACKAGE,
      );

    return {
      packageId: promotion.packageId?.toString(),
      allowed,
    };
  }),
);

return new Set(
  eligibilityChecks
    .filter(
      ({ allowed, packageId }) =>
        allowed && Boolean(packageId),
    )
    .map(({ packageId }) => packageId as string),
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