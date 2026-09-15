// fyp-backend/src/vendor/growth/campaign/campaign.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { FileUploadService } from '../../../file-upload/file-upload.service';

@Controller('vendor/growth/campaign')
export class CampaignController {
  constructor(
    private readonly campaignService: CampaignService,
    private readonly fileUploadService: FileUploadService,
  ) {}

    // =========================================================
  // Phase 14A.10 — Client Public Sponsored Campaigns
  // =========================================================

  @Get('public/active')
  async getActiveSponsoredCampaigns() {
    return this.campaignService
      .getActiveSponsoredCampaigns();
  }

  // =========================================================
  // Phase 14A.8 — Create Campaign
  // =========================================================

  @Post(':vendorId')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        files: 1,
        fileSize: 5 * 1024 * 1024, // 5 MB
      },

      fileFilter: (
        _req,
        file,
        callback,
      ) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp',
        ];

        if (
          !allowedMimeTypes.includes(
            file.mimetype,
          )
        ) {
          return callback(
            new BadRequestException(
              'Campaign image must be JPEG, PNG, or WEBP',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async createCampaign(
    @Param('vendorId')
    vendorId: string,

    @UploadedFile()
    file: Express.Multer.File,

    @Body()
    dto: CreateCampaignDto,
  ) {
    // -------------------------------------------------------
    // 1. Image required
    // -------------------------------------------------------

    if (!file) {
      throw new BadRequestException(
        'Campaign image is required',
      );
    }

         // -------------------------------------------------------
    // 2. Validate BEFORE uploading to S3
    // -------------------------------------------------------

    await this.campaignService.validateCampaignCreation(
      vendorId,
      dto,
    );

    // -------------------------------------------------------
    // 3. Upload image only after validation succeeds
    // -------------------------------------------------------

    const uploadedImage =
      await this.fileUploadService.uploadFile(
        file,
      );

    /*
     * FileUploadService may return SendData | null | undefined
     * depending on the current S3 implementation.
     *
     * Convert the returned value safely into the public
     * image URL expected by CampaignService.
     */

    const imageUrl =
      typeof uploadedImage === 'string'
        ? uploadedImage
        : uploadedImage?.Location;

    if (
      !imageUrl ||
      typeof imageUrl !== 'string'
    ) {
      throw new BadRequestException(
        'Campaign image upload failed',
      );
    }

    // -------------------------------------------------------
    // 3. Create campaign
    // -------------------------------------------------------

    return this.campaignService.createCampaign(
      vendorId,
      dto,
      imageUrl,
    );
  }

    // =========================================================
  // Phase 14A.8 — Vendor Stop / Cancel Campaign
  // =========================================================

  @Patch(':vendorId/:campaignId/cancel')
  async cancelCampaign(
    @Param('vendorId')
    vendorId: string,

    @Param('campaignId')
    campaignId: string,
  ) {
    return this.campaignService.cancelCampaign(
      vendorId,
      campaignId,
    );
  }


  // =========================================================
  // Vendor — My Campaigns
  // =========================================================

  @Get('mine/:vendorId')
  async getMyCampaigns(
    @Param('vendorId')
    vendorId: string,
  ) {
    return this.campaignService.getMyCampaigns(
      vendorId,
    );
  }

  // =========================================================
  // Vendor — Monthly Campaign Usage
  // =========================================================

  @Get('usage/:vendorId')
  async getCampaignUsage(
    @Param('vendorId')
    vendorId: string,
  ) {
    return this.campaignService.getCampaignUsage(
      vendorId,
    );
  }
}