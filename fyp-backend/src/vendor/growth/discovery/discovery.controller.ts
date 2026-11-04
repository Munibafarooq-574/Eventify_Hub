import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { MarketplaceGuard } from '../../../city/marketplace.guard';
// fyp-backend/src/vendor/growth/discovery/discovery.controller.ts
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';

// Mounted at: /vendor/growth/discovery
// Additive, opt-in endpoints — your existing /vendor/getVendorsByCategoryId
// route is completely untouched. Switch your Vendor Search screen to call
// these instead when you're ready for featured-boosted results.
@Controller('vendor/growth/discovery')
@UseGuards(JwtAuthGuard, MarketplaceGuard)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  // GET /vendor/growth/discovery/vendors-by-category?categoryId=...
  @Get('vendors-by-category')
  getVendorsByCategory(@Query('categoryId') categoryId: string, @Req() request: any) {
    return this.discoveryService.getVendorsByCategory(categoryId, request.marketplace);
  }

  // GET /vendor/growth/discovery/packages-by-service?service=...&guests=...
  @Get('packages-by-service')
  getPackagesByService(@Query('service') service: string, @Query('guests') guests: string, @Req() request: any) {
    return this.discoveryService.getPackagesByService(service, parseInt(guests, 10), request.marketplace);
  }
}