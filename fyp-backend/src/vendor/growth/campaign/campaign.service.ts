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
  // Phase 14A.8 — Create Campaign
  // =========================================================

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

    const todayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );

    if (
      startDate.getTime() <
      todayStart.getTime()
    ) {
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

    if (
      endDate.getTime() >
      subscriptionEndDate.getTime()
    ) {
      throw new BadRequestException(
        `Campaign end date cannot be after your subscription expiry date (${subscriptionEndDate.toISOString()}).`,
      );
    }

    // -------------------------------------------------------
    // 7. Monthly campaign quota
    // -------------------------------------------------------

    // Reuse the same current time for monthly quota.
    // Growth = 2/month
    // Premium = 5/month
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
}