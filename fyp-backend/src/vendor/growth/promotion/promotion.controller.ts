// fyp-backend/src/vendor/growth/promotion/promotion.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { ActivateFeaturedVendorDto } from './dto/activate-featured-vendor.dto';

// Mounted at: /vendor/growth/promotion
@Controller('vendor/growth/promotion')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  // POST /vendor/growth/promotion/featured-vendor/activate?vendorId=...
  // Body: { "durationDays": 7 | 15 | 30 }
  @Post('featured-vendor/activate')
  activateFeaturedVendor(
    @Query('vendorId') vendorId: string,
    @Body() dto: ActivateFeaturedVendorDto,
  ) {
    return this.promotionService.activateFeaturedVendor(vendorId, dto.durationDays);
  }

  // GET /vendor/growth/promotion/featured-vendor/mine/:vendorId
  // Vendor's own Featured Vendor campaigns (active + history).
  @Get('featured-vendor/mine/:vendorId')
  getMyFeaturedVendorPromotions(@Param('vendorId') vendorId: string) {
    return this.promotionService.getVendorFeaturedVendorPromotions(vendorId);
  }

  // DELETE /vendor/growth/promotion/featured-vendor/:promotionId?vendorId=...
  @Delete('featured-vendor/:promotionId')
  deactivateFeaturedVendor(
    @Param('promotionId') promotionId: string,
    @Query('vendorId') vendorId: string,
  ) {
    return this.promotionService.deactivateFeaturedVendor(vendorId, promotionId);
  }

  // GET /vendor/growth/promotion/featured-vendor/active?limit=20
  // Public — currently featured vendors, for customer-side discovery.
  // Full Home/Search integration lands in Phase 9; this just exposes the data.
  @Get('featured-vendor/active')
  getActiveFeaturedVendors(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.promotionService.getActiveFeaturedVendors(parsedLimit);
  }
}