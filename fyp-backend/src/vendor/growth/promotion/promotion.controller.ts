// fyp-backend/src/vendor/growth/promotion/promotion.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { PromotionService } from './promotion.service';
import { ActivateFeaturedVendorDto } from './dto/activate-featured-vendor.dto';
import { ActivateFeaturedPackageDto } from './dto/activate-featured-package.dto';

// Mounted at: /vendor/growth/promotion
@Controller('vendor/growth/promotion')
export class PromotionController {
  constructor(
    private readonly promotionService: PromotionService,
  ) {}

  // ---------------------------------------------------------
  // Featured Vendor
  // ---------------------------------------------------------

  // POST /vendor/growth/promotion/featured-vendor/activate?vendorId=...
  // Body: { "durationDays": 7 | 15 | 30 }
  @Post('featured-vendor/activate')
  activateFeaturedVendor(
    @Query('vendorId') vendorId: string,
    @Body() dto: ActivateFeaturedVendorDto,
  ) {
    return this.promotionService.activateFeaturedVendor(
      vendorId,
      dto.durationDays,
    );
  }

  // GET /vendor/growth/promotion/featured-vendor/mine/:vendorId
  // Vendor's own Featured Vendor promotions:
  // active + history.
  @Get('featured-vendor/mine/:vendorId')
  getMyFeaturedVendorPromotions(
    @Param('vendorId') vendorId: string,
  ) {
    return this.promotionService.getVendorFeaturedVendorPromotions(
      vendorId,
    );
  }

  // DELETE /vendor/growth/promotion/featured-vendor/:promotionId?vendorId=...
  @Delete('featured-vendor/:promotionId')
  deactivateFeaturedVendor(
    @Param('promotionId') promotionId: string,
    @Query('vendorId') vendorId: string,
  ) {
    return this.promotionService.deactivatePromotion(
      vendorId,
      promotionId,
    );
  }

  // GET /vendor/growth/promotion/featured-vendor/active
  //
  // Optional query params:
  // ?limit=10
  // &eventCityId=<cityId>
  // &categoryIds=<categoryId1>,<categoryId2>
  //
  // Public Featured Vendor discovery.
  @Get('featured-vendor/active')
  getActiveFeaturedVendors(
    @Query('limit') limit?: string,
    @Query('eventCityId') eventCityId?: string,
    @Query('categoryIds') categoryIds?: string,
    @Query('eventDate') eventDate?: string,
    @Query('startTime') startTime?: string,
    @Query('durationMinutes') durationMinutes?: string,
  ) {
    const parsedLimit = Number(limit);

    return this.promotionService.getActiveFeaturedVendors(
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? parsedLimit
        : 10,
      {
        eventCityId:
          typeof eventCityId === 'string' &&
          eventCityId.trim()
            ? eventCityId.trim()
            : undefined,

        categoryIds:
  typeof categoryIds === 'string'
    ? categoryIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [],

eventDate:
  eventDate?.trim() || undefined,

startTime:
  startTime?.trim() || undefined,

durationMinutes:
  durationMinutes &&
  Number.isFinite(Number(durationMinutes))
    ? Number(durationMinutes)
    : undefined,
      },
    );
  }

  // ---------------------------------------------------------
  // Featured Package
  // ---------------------------------------------------------

  // POST /vendor/growth/promotion/featured-package/activate?vendorId=...
  //
  // Body:
  // {
  //   "packageId": "<package subdocument _id>",
  //   "durationDays": 7 | 15 | 30
  // }
  @Post('featured-package/activate')
  activateFeaturedPackage(
    @Query('vendorId') vendorId: string,
    @Body() dto: ActivateFeaturedPackageDto,
  ) {
    return this.promotionService.activateFeaturedPackage(
      vendorId,
      dto.packageId,
      dto.durationDays,
    );
  }

  // GET /vendor/growth/promotion/featured-package/mine/:vendorId
  @Get('featured-package/mine/:vendorId')
  getMyFeaturedPackages(
    @Param('vendorId') vendorId: string,
  ) {
    return this.promotionService.getVendorFeaturedPackages(
      vendorId,
    );
  }

  // DELETE /vendor/growth/promotion/featured-package/:promotionId?vendorId=...
  @Delete('featured-package/:promotionId')
  deactivateFeaturedPackage(
    @Param('promotionId') promotionId: string,
    @Query('vendorId') vendorId: string,
  ) {
    return this.promotionService.deactivatePromotion(
      vendorId,
      promotionId,
    );
  }

  // GET /vendor/growth/promotion/featured-package/active?limit=20
  // Public — currently featured packages.
 // GET /vendor/growth/promotion/featured-package/active
//
// Optional:
// ?limit=10
// &eventCityId=<cityId>
// &categoryIds=<categoryId1>,<categoryId2>
@Get('featured-package/active')
getActiveFeaturedPackages(
  @Query('limit') limit?: string,
  @Query('eventCityId')
  eventCityId?: string,
  @Query('categoryIds')
  categoryIds?: string,
  @Query('eventDate')
  eventDate?: string,
  @Query('startTime')
  startTime?: string,
  @Query('durationMinutes')
  durationMinutes?: string,
) {
  const parsedLimit = Number(limit);

  return this.promotionService.getActiveFeaturedPackages(
    Number.isFinite(parsedLimit) &&
      parsedLimit > 0
      ? parsedLimit
      : 20,
    {
      eventCityId:
        typeof eventCityId === 'string' &&
        eventCityId.trim()
          ? eventCityId.trim()
          : undefined,

      categoryIds:
  typeof categoryIds === 'string'
    ? categoryIds
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    : [],

eventDate:
  eventDate?.trim() || undefined,

startTime:
  startTime?.trim() || undefined,

durationMinutes:
  durationMinutes &&
  Number.isFinite(Number(durationMinutes))
    ? Number(durationMinutes)
    : undefined,
    },
  );
}
}