// fyp-backend/src/admin/admin-campaign.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  CampaignStatus,
  VendorCampaign,
} from '../schemas/vendor-campaign.schema';

@Injectable()
export class AdminCampaignService {
  constructor(
    @InjectModel(VendorCampaign.name)
    private readonly campaignModel: Model<VendorCampaign>,
  ) {}

  // ============================================================
  // ADMIN — LIST CAMPAIGNS
  // GET /admin/campaigns
  //
  // Optional:
  // ?status=pending
  // ?limit=20
  // ?skip=0
  // ============================================================

  async getCampaigns(
    status?: CampaignStatus,
    limit = 20,
    skip = 0,
  ) {
    const safeLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100,
    );

    const safeSkip = Math.max(
      Number(skip) || 0,
      0,
    );

    const query: Record<string, any> = {};

    if (status) {
      if (
        !Object.values(CampaignStatus).includes(
          status,
        )
      ) {
        throw new BadRequestException(
          'Invalid campaign status.',
        );
      }

      query.status = status;
    }

    return this.campaignModel
      .find(query)
      .populate(
        'vendorId',
        'name email phone_number contactDetails buisnessCategory vendorApprovalStatus',
      )
      .populate(
        'categoryId',
        'name description',
      )
      .populate(
        'reviewedBy',
        'name email role',
      )
      .sort({
        createdAt: -1,
      })
      .skip(safeSkip)
      .limit(safeLimit)
      .lean();
  }

  // ============================================================
  // ADMIN — CAMPAIGN DETAIL
  // GET /admin/campaigns/:id
  // ============================================================

  async getCampaignDetail(
    campaignId: string,
  ) {
    this.validateCampaignId(campaignId);

    const campaign =
      await this.campaignModel
        .findById(campaignId)
        .populate(
          'vendorId',
          'name email phone_number contactDetails buisnessCategory vendorApprovalStatus packages',
        )
        .populate(
          'categoryId',
          'name description',
        )
        .populate(
          'reviewedBy',
          'name email role',
        )
        .lean();

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found.',
      );
    }

    /*
     * Packages are embedded inside User.
     * Return only the package linked with this campaign
     * instead of exposing all packages as campaign detail.
     */
    const vendor =
      campaign.vendorId as any;

    const linkedPackage =
      Array.isArray(vendor?.packages)
        ? vendor.packages.find(
            (pkg: any) =>
              String(pkg?._id) ===
              String(campaign.packageId),
          )
        : null;

    const safeVendor = vendor
      ? {
          _id: vendor._id,
          name: vendor.name,
          email: vendor.email,
          phone_number:
            vendor.phone_number,
          contactDetails:
            vendor.contactDetails,
          buisnessCategory:
            vendor.buisnessCategory,
          vendorApprovalStatus:
            vendor.vendorApprovalStatus,
        }
      : null;

    return {
      ...campaign,
      vendorId: safeVendor,
      linkedPackage:
        linkedPackage || null,
    };
  }

  // ============================================================
  // ADMIN — APPROVE CAMPAIGN
  // PATCH /admin/campaigns/:id/approve
  // ============================================================

  async approveCampaign(
    campaignId: string,
    adminId: string,
  ) {
    this.validateCampaignId(campaignId);
    this.validateAdminId(adminId);

    const campaign =
      await this.campaignModel.findById(
        campaignId,
      );

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found.',
      );
    }

    if (
      campaign.status !==
      CampaignStatus.PENDING
    ) {
      throw new BadRequestException(
        'Only pending campaigns can be approved.',
      );
    }

    const now = new Date();

   /*
 * Campaign approval lifecycle:
 *
 * Approval before start:
 *   PENDING -> APPROVED
 *
 * Approval between start and end:
 *   PENDING -> ACTIVE
 *
 * Approval after end:
 *   PENDING -> EXPIRED
 *
 * Campaign end date is never extended because of late review.
 */

const campaignStart =
  new Date(campaign.startDate);

const campaignEnd =
  new Date(campaign.endDate);

if (now > campaignEnd) {
  campaign.status =
    CampaignStatus.EXPIRED;

  campaign.reviewedBy =
    new Types.ObjectId(adminId);

  campaign.reviewedAt = now;

  campaign.rejectionReason = null;

  await campaign.save();

  return {
    message:
      'Campaign has already ended and was marked as expired.',
    campaign,
  };
}

    campaign.reviewedBy =
      new Types.ObjectId(adminId);

    campaign.reviewedAt = now;

    campaign.rejectionReason = null;

    if (now >= campaignStart) {
  campaign.status =
    CampaignStatus.ACTIVE;
} else {
  campaign.status =
    CampaignStatus.APPROVED;
}

    await campaign.save();

    return {
      message:
        campaign.status ===
        CampaignStatus.ACTIVE
          ? 'Campaign approved and activated successfully.'
          : 'Campaign approved successfully.',
      campaign,
    };
  }

  // ============================================================
  // ADMIN — REJECT CAMPAIGN
  // PATCH /admin/campaigns/:id/reject
  //
  // reason is mandatory.
  // ============================================================

  async rejectCampaign(
    campaignId: string,
    adminId: string,
    reason: string,
  ) {
    this.validateCampaignId(campaignId);
    this.validateAdminId(adminId);

    const rejectionReason =
      reason?.trim();

    if (!rejectionReason) {
      throw new BadRequestException(
        'Rejection reason is required.',
      );
    }

    if (
      rejectionReason.length > 500
    ) {
      throw new BadRequestException(
        'Rejection reason cannot exceed 500 characters.',
      );
    }

    const campaign =
      await this.campaignModel.findById(
        campaignId,
      );

    if (!campaign) {
      throw new NotFoundException(
        'Campaign not found.',
      );
    }

    if (
      campaign.status !==
      CampaignStatus.PENDING
    ) {
      throw new BadRequestException(
        'Only pending campaigns can be rejected.',
      );
    }

    campaign.status =
      CampaignStatus.REJECTED;

    campaign.rejectionReason =
      rejectionReason;

    campaign.reviewedBy =
      new Types.ObjectId(adminId);

    campaign.reviewedAt =
      new Date();

    await campaign.save();

    return {
      message:
        'Campaign rejected successfully.',
      campaign,
    };
  }

  // ============================================================
  // VALIDATION HELPERS
  // ============================================================

  private validateCampaignId(
    campaignId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        campaignId,
      )
    ) {
      throw new BadRequestException(
        'Invalid campaign ID.',
      );
    }
  }

  private validateAdminId(
    adminId: string,
  ) {
    if (
      !adminId ||
      !Types.ObjectId.isValid(
        adminId,
      )
    ) {
      throw new BadRequestException(
        'Invalid admin ID.',
      );
    }
  }
}