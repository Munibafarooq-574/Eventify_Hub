import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  CampaignStatus,
  VendorCampaign,
} from '../../../schemas/vendor-campaign.schema';

import { User } from '../../../schemas/user.schema';

import { FeatureAccessService } from '../feature-access.service';

import { CreateCampaignDto } from './dto/create-campaign.dto';

@Injectable()
export class CampaignService {
  constructor(
    @InjectModel(VendorCampaign.name)
    private readonly campaignModel: Model<VendorCampaign>,

    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    private readonly featureAccessService: FeatureAccessService,
    
      ) {}

  // =========================================================
  // Campaign Lifecycle Sync
  //
  // APPROVED + start date reached -> ACTIVE
  // APPROVED/ACTIVE + end date passed -> EXPIRED
  //
  // PENDING / REJECTED / CANCELLED are never changed here.
  // =========================================================

  private async syncCampaignLifecycle(): Promise<void> {
    const now = new Date();

    // -------------------------------------------------------
    // 1. Expire finished campaigns first.
    //
    // Exact end boundary is still considered live.
    // Only now > endDate becomes EXPIRED.
    // -------------------------------------------------------
    await this.campaignModel.updateMany(
      {
        status: {
          $in: [
            CampaignStatus.APPROVED,
            CampaignStatus.ACTIVE,
          ],
        },
        endDate: {
          $lt: now,
        },
      },
      {
        $set: {
          status: CampaignStatus.EXPIRED,
        },
      },
    );

    // -------------------------------------------------------
    // 2. Activate approved campaigns whose scheduled
    // window has started and has not ended.
    // -------------------------------------------------------
    await this.campaignModel.updateMany(
      {
        status: CampaignStatus.APPROVED,
        startDate: {
          $lte: now,
        },
        endDate: {
          $gte: now,
        },
      },
      {
        $set: {
          status: CampaignStatus.ACTIVE,
        },
      },
    );
  }

  // =========================================================
  // Phase 14A.8 — Pre-upload Campaign Validation
  // =========================================================

  async validateCampaignCreation(
    vendorId: string,
    dto: CreateCampaignDto,
  ) {
    // -------------------------------------------------------
    // 1. Validate vendor id
    // -------------------------------------------------------

    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException(
        'Invalid vendorId',
      );
    }

    // -------------------------------------------------------
    // 2. Subscription / campaign entitlement
    // Basic + Trial = blocked
    // Growth + Premium = allowed
    // -------------------------------------------------------

    const allowed =
      await this.featureAccessService.canCreateCampaign(
        vendorId,
      );

    if (!allowed) {
      throw new ForbiddenException(
        'Your current plan does not include Campaign Ads. Upgrade to Growth or Premium.',
      );
    }

    // -------------------------------------------------------
    // 3. Get vendor
    // -------------------------------------------------------

    const vendor = await this.userModel
      .findById(vendorId)
      .select(
        'role packages buisnessCategory',
      )
      .lean();

    if (!vendor) {
      throw new NotFoundException(
        'Vendor not found',
      );
    }

    if (
      String((vendor as any).role).toLowerCase() !==
      'vendor'
    ) {
      throw new ForbiddenException(
        'Campaigns can only be created by vendors',
      );
    }

    // -------------------------------------------------------
    // 4. Validate package ownership
    // -------------------------------------------------------

    const selectedPackage = (
      (vendor as any).packages || []
    ).find(
      (pkg: any) =>
        pkg?._id &&
        pkg._id.toString() === dto.packageId,
    );

    if (!selectedPackage) {
      throw new BadRequestException(
        'This package does not belong to this vendor',
      );
    }

    // -------------------------------------------------------
    // 5. Derive category from vendor
    // Never accept categoryId from frontend.
    // -------------------------------------------------------

    const categoryId =
      (vendor as any).buisnessCategory;

    if (!categoryId) {
      throw new BadRequestException(
        'Vendor business category is required before creating a campaign',
      );
    }

    // -------------------------------------------------------
    // 6. Validate dates
    // -------------------------------------------------------

    const startDate =
      new Date(dto.startDate);

    const endDate =
      new Date(dto.endDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      throw new BadRequestException(
        'Invalid campaign dates',
      );
    }

    if (
      endDate.getTime() <=
      startDate.getTime()
    ) {
      throw new BadRequestException(
        'Campaign end date must be after start date',
      );
    }

    // -------------------------------------------------------
// Campaign duration limit
//
// Growth / Premium:
// A single campaign can run for a maximum of 30 days.
// This prevents one monthly campaign credit from being
// used for several months of advertising.
// -------------------------------------------------------

const MAX_CAMPAIGN_DURATION_DAYS = 30;

const campaignDurationMs =
  endDate.getTime() - startDate.getTime();

const maxCampaignDurationMs =
  MAX_CAMPAIGN_DURATION_DAYS *
  24 *
  60 *
  60 *
  1000;

if (campaignDurationMs > maxCampaignDurationMs) {
  throw new BadRequestException(
    `A campaign can run for a maximum of ${MAX_CAMPAIGN_DURATION_DAYS} days.`,
  );
}
    // -------------------------------------------------------
    // Campaign cannot start in the past
    // -------------------------------------------------------

    const now = new Date();

    /*
     * Allow today's date.
     *
     * Frontend may send today's date at midnight, while the
     * current server time is later during the same day.
     * Therefore compare calendar dates instead of requiring
     * startDate >= exact current time.
     */

    /*
 * Campaign scheduling is date-based, not time-based.
 *
 * Same calendar date is allowed:
 * Today = 15 Sep
 * Start = 15 Sep -> VALID
 *
 * Only an earlier calendar date is rejected.
 */

const startDay = Date.UTC(
  startDate.getUTCFullYear(),
  startDate.getUTCMonth(),
  startDate.getUTCDate(),
);

const todayDay = Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth(),
  now.getUTCDate(),
);

if (startDay < todayDay) {
  throw new BadRequestException(
    'Campaign start date cannot be in the past',
  );
}

    // -------------------------------------------------------
    // Campaign cannot run beyond subscription expiry
    // -------------------------------------------------------

    const subscriptionEndDate =
      await this.featureAccessService.getCampaignAccessEndDate(
        vendorId,
      );

    if (!subscriptionEndDate) {
      throw new ForbiddenException(
        'An active Growth or Premium subscription is required to create a campaign',
      );
    }

    /*
 * Campaign dates are selected by calendar day in the mobile app.
 *
 * Example:
 * Subscription expires: 15-Oct-2026 at 10:18 AM
 * Campaign end date:     15-Oct-2026 at 11:59 PM
 *
 * Both represent the same calendar date for campaign scheduling,
 * so the campaign should be allowed through 15-Oct.
 *
 * Only a campaign ending on 16-Oct or later should be rejected.
 */

const campaignEndDay = Date.UTC(
  endDate.getUTCFullYear(),
  endDate.getUTCMonth(),
  endDate.getUTCDate(),
);

const subscriptionEndDay = Date.UTC(
  subscriptionEndDate.getUTCFullYear(),
  subscriptionEndDate.getUTCMonth(),
  subscriptionEndDate.getUTCDate(),
);

if (campaignEndDay > subscriptionEndDay) {
  throw new BadRequestException(
    `Campaign end date cannot be after your subscription expiry date (${subscriptionEndDate.toISOString()}).`,
  );
}

    // -------------------------------------------------------
    // 7. Monthly campaign quota
    //
    // Growth = 2/month
    // Premium = 5/month
    //
    // IMPORTANT:
    // Campaigns are counted by createdAt.
    // Cancelled campaigns are NOT removed from this count.
    // Therefore cancelling/stopping a campaign does not restore
    // the monthly campaign allowance.
    // -------------------------------------------------------

    const monthStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1,
        0,
        0,
        0,
        0,
      ),
    );

    const nextMonthStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1,
        0,
        0,
        0,
        0,
      ),
    );

    const monthlyCount =
      await this.campaignModel.countDocuments({
        vendorId:
          new Types.ObjectId(vendorId),

        createdAt: {
          $gte: monthStart,
          $lt: nextMonthStart,
        },
      });

    const monthlyLimit =
      await this.featureAccessService.getMonthlyCampaignLimit(
        vendorId,
      );

    if (
      monthlyLimit <= 0 ||
      monthlyCount >= monthlyLimit
    ) {
      throw new BadRequestException(
        `Monthly campaign limit reached (${monthlyCount}/${monthlyLimit}). Upgrade your plan or wait until next month.`,
      );
    }

    // -------------------------------------------------------
// 8. Concurrent / overlapping campaign limit
//
// Growth:
//   Maximum 2 campaigns may overlap.
//
// Premium:
//   Maximum 5 campaigns may overlap.
//
// We use the same plan campaign limit here:
// Growth = 2
// Premium = 5
//
// PENDING / APPROVED / ACTIVE reserve campaign slots.
//
// CANCELLED / REJECTED / EXPIRED do NOT reserve slots.
//
// Example:
// Existing A: Sep 16 -> Oct 16
// Existing B: Oct 01 -> Oct 30
// New C:      Oct 05 -> Oct 25
//
// During Oct 05 -> Oct 16 there would be 3 campaigns,
// therefore Growth must reject C.
// -------------------------------------------------------

const concurrentLimit = monthlyLimit;

const slotOccupyingStatuses = [
  CampaignStatus.PENDING,
  CampaignStatus.APPROVED,
  CampaignStatus.ACTIVE,
];

/*
 * First find every existing campaign that overlaps
 * the requested campaign window.
 *
 * Overlap rule:
 *
 * existing.startDate < new.endDate
 * AND
 * existing.endDate > new.startDate
 *
 * CANCELLED / REJECTED / EXPIRED are intentionally
 * excluded because they no longer reserve campaign slots.
 */
const overlappingCampaigns =
  await this.campaignModel
    .find({
      vendorId: new Types.ObjectId(vendorId),

      status: {
        $in: slotOccupyingStatuses,
      },

      startDate: {
        $lt: endDate,
      },

      endDate: {
        $gt: startDate,
      },
    })
    .select('startDate endDate status title')
    .lean();

/*
 * Merely counting all campaigns that touch the requested
 * window is not sufficient.
 *
 * Example:
 * A overlaps only the beginning,
 * B overlaps only the end.
 *
 * They may never be active at the same instant.
 *
 * Therefore evaluate timeline boundary points and calculate
 * the maximum number of campaigns simultaneously occupying
 * a slot after adding the new campaign.
 */

type CampaignBoundary = {
  time: number;
  delta: number;
};

const boundaries: CampaignBoundary[] = [];

/*
 * Add the proposed campaign itself.
 */
boundaries.push({
  time: startDate.getTime(),
  delta: 1,
});

boundaries.push({
  time: endDate.getTime(),
  delta: -1,
});

/*
 * Clamp every existing overlapping campaign to the
 * proposed campaign window.
 */
for (const existingCampaign of overlappingCampaigns) {
  const existingStart =
    new Date(
      (existingCampaign as any).startDate,
    ).getTime();

  const existingEnd =
    new Date(
      (existingCampaign as any).endDate,
    ).getTime();

  const effectiveStart =
    Math.max(
      existingStart,
      startDate.getTime(),
    );

  const effectiveEnd =
    Math.min(
      existingEnd,
      endDate.getTime(),
    );

  if (effectiveStart < effectiveEnd) {
    boundaries.push({
      time: effectiveStart,
      delta: 1,
    });

    boundaries.push({
      time: effectiveEnd,
      delta: -1,
    });
  }
}

/*
 * Important:
 * When one campaign ends exactly when another begins,
 * process END (-1) before START (+1).
 *
 * Therefore:
 *
 * A: Sep 16 -> Oct 16
 * B: Oct 16 -> Nov 15
 *
 * are not considered overlapping at the exact boundary.
 */
boundaries.sort((a, b) => {
  if (a.time !== b.time) {
    return a.time - b.time;
  }

  return a.delta - b.delta;
});

let simultaneousCampaigns = 0;
let maximumSimultaneousCampaigns = 0;

for (const boundary of boundaries) {
  simultaneousCampaigns += boundary.delta;

  maximumSimultaneousCampaigns =
    Math.max(
      maximumSimultaneousCampaigns,
      simultaneousCampaigns,
    );
}

if (
  maximumSimultaneousCampaigns >
  concurrentLimit
) {
  throw new BadRequestException(
    `Your plan allows a maximum of ${concurrentLimit} overlapping campaigns. Choose campaign dates that do not exceed your concurrent campaign limit.`,
  );
}
    // Return trusted backend-derived data.
    // Controller can upload image only after reaching here.

    return {
      categoryId,
      startDate,
      endDate,
    };
  }

  // =========================================================
  // Phase 14A.8 — Save Validated Campaign
  // =========================================================

  async createCampaign(
    vendorId: string,
    dto: CreateCampaignDto,
    imageUrl: string,
  ): Promise<VendorCampaign> {
    if (!imageUrl?.trim()) {
      throw new BadRequestException(
        'Campaign image is required',
      );
    }

    /*
     * Re-read vendor category instead of trusting categoryId
     * supplied by the frontend.
     */

    const vendor = await this.userModel
      .findById(vendorId)
      .select('buisnessCategory')
      .lean();

    if (!vendor) {
      throw new NotFoundException(
        'Vendor not found',
      );
    }

    const categoryId =
      (vendor as any).buisnessCategory;

    if (!categoryId) {
      throw new BadRequestException(
        'Vendor business category is required before creating a campaign',
      );
    }

    const startDate =
      new Date(dto.startDate);

    const endDate =
      new Date(dto.endDate);

    return this.campaignModel.create({
      vendorId:
        new Types.ObjectId(vendorId),

      packageId:
        dto.packageId,

      categoryId,

      title:
        dto.title.trim(),

      image:
        imageUrl.trim(),

      description:
        dto.description.trim(),

      offerLabel:
        dto.offerLabel?.trim() || null,

      startDate,

      endDate,

      status:
        CampaignStatus.PENDING,

      impressions: 0,
      clicks: 0,
      packageVisits: 0,
    });
  }

  // =========================================================
  // Vendor — My Campaigns
  // =========================================================

    async getMyCampaigns(
    vendorId: string,
  ): Promise<VendorCampaign[]> {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException(
        'Invalid vendorId',
      );
    }

    await this.syncCampaignLifecycle();

    return this.campaignModel
      .find({
        vendorId:
          new Types.ObjectId(vendorId),
      })
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  // =========================================================
  // Phase 14A.8 — Vendor Stop / Cancel Campaign
  // =========================================================

  async cancelCampaign(
    vendorId: string,
    campaignId: string,
  ): Promise<VendorCampaign> {
    // -------------------------------------------------------
    // 1. Validate vendor ID
    // -------------------------------------------------------

    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException(
        'Invalid vendorId',
      );
    }

    // -------------------------------------------------------
    // 2. Validate campaign ID
    // -------------------------------------------------------

    if (!Types.ObjectId.isValid(campaignId)) {
      throw new BadRequestException(
        'Invalid campaignId',
      );
    }

    // -------------------------------------------------------
    // 3. Find campaign + verify vendor ownership
    //
    // The vendorId is included in the query intentionally.
    // A vendor must never be able to stop another vendor's
    // campaign.
    // -------------------------------------------------------

    const campaign =
      await this.campaignModel.findOne({
        _id:
          new Types.ObjectId(campaignId),

        vendorId:
          new Types.ObjectId(vendorId),
      });

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found',
      );
    }

    // -------------------------------------------------------
    // 4. Campaign already cancelled
    // -------------------------------------------------------

    if (
      campaign.status ===
      CampaignStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Campaign is already cancelled',
      );
    }

    // -------------------------------------------------------
    // 5. Finished/rejected campaigns cannot be cancelled
    // -------------------------------------------------------

    if (
      campaign.status ===
        CampaignStatus.EXPIRED ||
      campaign.status ===
        CampaignStatus.REJECTED
    ) {
      throw new BadRequestException(
        `A ${campaign.status} campaign cannot be cancelled`,
      );
    }

    // -------------------------------------------------------
    // 6. Preserve previous status
    //
    // We MUST save this before setting CANCELLED.
    //
    // PENDING:
    //   Cancel Submission
    //
    // APPROVED:
    //   Cancel Campaign
    //
    // ACTIVE:
    //   Stop Campaign
    // -------------------------------------------------------

    const previousStatus =
      campaign.status;

    // -------------------------------------------------------
    // 7. Soft cancel
    //
    // DO NOT delete the MongoDB document.
    //
    // This preserves:
    // - campaign history
    // - impressions
    // - clicks
    // - package visits
    // - monthly campaign quota usage
    // -------------------------------------------------------

    campaign.status =
      CampaignStatus.CANCELLED;

    campaign.cancelledAt =
      new Date();

    if (
      previousStatus ===
      CampaignStatus.PENDING
    ) {
      campaign.cancelledReason =
        'Submission cancelled by vendor';
    } else if (
      previousStatus ===
      CampaignStatus.ACTIVE
    ) {
      campaign.cancelledReason =
        'Campaign stopped by vendor';
    } else {
      campaign.cancelledReason =
        'Campaign cancelled by vendor';
    }

    // -------------------------------------------------------
    // 8. Save campaign history
    // -------------------------------------------------------

    await campaign.save();

    return campaign;
  }

  // =========================================================
  // Vendor — Monthly Campaign Usage
  // =========================================================

  async getCampaignUsage(
    vendorId: string,
  ) {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException(
        'Invalid vendorId',
      );
    }

    const now = new Date();

    const monthStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1,
      ),
    );

    const nextMonthStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1,
      ),
    );

    /*
     * IMPORTANT:
     *
     * We intentionally count every campaign CREATED during
     * the current calendar month.
     *
     * Status is NOT filtered here.
     *
     * Example — Growth:
     *
     * Campaign A created -> 1/2
     * Campaign A stopped -> still 1/2
     * Campaign B created -> 2/2
     * Campaign B stopped -> still 2/2
     *
     * Vendor cannot create campaign C during this month.
     *
     * At the beginning of the next calendar month,
     * monthStart/nextMonthStart automatically move forward,
     * so usage becomes 0/new monthly limit.
     */

    const used =
      await this.campaignModel.countDocuments({
        vendorId:
          new Types.ObjectId(vendorId),

        createdAt: {
          $gte: monthStart,
          $lt: nextMonthStart,
        },
      });

    const limit =
      await this.featureAccessService.getMonthlyCampaignLimit(
        vendorId,
      );

    return {
      used,
      limit,

      remaining:
        Math.max(limit - used, 0),

      canCreate:
        limit > 0 && used < limit,
    };
  }

    // =========================================================
  // Phase 14A.10 — Client Sponsored Campaigns
  // Only campaigns that are live right now are publicly served.
  // =========================================================

    async getActiveSponsoredCampaigns() {
    await this.syncCampaignLifecycle();

    const now = new Date();

    const campaigns = await this.campaignModel
      .find({
        status: CampaignStatus.ACTIVE,
        startDate: {
          $lte: now,
        },
        endDate: {
          $gte: now,
        },
      })
      .sort({
        createdAt: -1,
      })
      .lean();

    if (!campaigns.length) {
      return [];
    }

    const vendorIds = [
      ...new Set(
        campaigns.map((campaign: any) =>
          campaign.vendorId.toString(),
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
        role: 'Vendor',
      })
      .select(
        '_id name contactDetails packages buisnessCategory',
      )
      .lean();

    const vendorMap = new Map(
      vendors.map((vendor: any) => [
        vendor._id.toString(),
        vendor,
      ]),
    );

    const eligibleCampaigns: any[] = [];

    for (const campaign of campaigns as any[]) {
      const vendorId =
        campaign.vendorId.toString();

      /*
       * Campaign must still have valid Growth/Premium
       * campaign access at serving time.
       *
       * Subscription expiry therefore immediately removes
       * the campaign from public Sponsored placements
       * without deleting campaign history.
       */
      const campaignAccessEndDate =
        await this.featureAccessService
          .getCampaignAccessEndDate(vendorId);

      if (
        !campaignAccessEndDate ||
        campaignAccessEndDate.getTime() <
          now.getTime()
      ) {
        continue;
      }

      const vendor = vendorMap.get(vendorId);

      if (!vendor) {
        continue;
      }

      const linkedPackage = (
        (vendor as any).packages || []
      ).find(
        (pkg: any) =>
          pkg?._id?.toString() ===
          String(campaign.packageId),
      );

      /*
       * Never publicly serve a campaign whose linked
       * package no longer exists.
       */
      if (!linkedPackage) {
        continue;
      }

      eligibleCampaigns.push({
        _id: campaign._id,

        title: campaign.title,
        image: campaign.image,
        description: campaign.description,
        offerLabel:
          campaign.offerLabel || null,

        startDate: campaign.startDate,
        endDate: campaign.endDate,

        vendorId,
        vendorName:
          (vendor as any).name || 'Vendor',

        brandName:
          (vendor as any).contactDetails
            ?.brandName || null,

        categoryId:
          campaign.categoryId,

        packageId:
          campaign.packageId,

        package: {
          _id: linkedPackage._id,
          packageName:
            linkedPackage.packageName,
          description:
            linkedPackage.description,
          price:
            linkedPackage.price,
          images:
            linkedPackage.images || [],
        },

        sponsored: true,
      });
    }

        return eligibleCampaigns;
  }

  // =========================================================
  // Phase 14A.10 — Sponsored Campaign Analytics
  // =========================================================

  private async getTrackableActiveCampaign(
    campaignId: string,
  ) {
    if (!Types.ObjectId.isValid(campaignId)) {
      throw new BadRequestException(
        'Invalid campaignId',
      );
    }

    await this.syncCampaignLifecycle();

    const now = new Date();

    const campaign =
      await this.campaignModel.findOne({
        _id: new Types.ObjectId(campaignId),
        status: CampaignStatus.ACTIVE,
        startDate: {
          $lte: now,
        },
        endDate: {
          $gte: now,
        },
      });

    if (!campaign) {
      throw new NotFoundException(
        'Active campaign not found',
      );
    }

    /*
     * Do not count analytics after the vendor loses
     * Growth/Premium campaign access.
     */
    const campaignAccessEndDate =
      await this.featureAccessService
        .getCampaignAccessEndDate(
          campaign.vendorId.toString(),
        );

    if (
      !campaignAccessEndDate ||
      campaignAccessEndDate.getTime() <
        now.getTime()
    ) {
      throw new ForbiddenException(
        'Campaign is no longer eligible for sponsored placement',
      );
    }

    return campaign;
  }

  async recordCampaignImpression(
    campaignId: string,
  ) {
    const campaign =
      await this.getTrackableActiveCampaign(
        campaignId,
      );

    await this.campaignModel.updateOne(
      {
        _id: campaign._id,
      },
      {
        $inc: {
          impressions: 1,
        },
      },
    );

    return {
      success: true,
    };
  }

  async recordCampaignClick(
    campaignId: string,
  ) {
    const campaign =
      await this.getTrackableActiveCampaign(
        campaignId,
      );

    await this.campaignModel.updateOne(
      {
        _id: campaign._id,
      },
      {
        $inc: {
          clicks: 1,
        },
      },
    );

    return {
      success: true,
    };
  }

  async recordCampaignPackageVisit(
    campaignId: string,
  ) {
    const campaign =
      await this.getTrackableActiveCampaign(
        campaignId,
      );

    await this.campaignModel.updateOne(
      {
        _id: campaign._id,
      },
      {
        $inc: {
          packageVisits: 1,
        },
      },
    );

    return {
      success: true,
    };
  }
}