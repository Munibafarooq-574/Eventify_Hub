// fyp-backend/src/vendor/growth/discovery/discovery.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { DiscoveryService } from './discovery.service';

// Mounted at: /vendor/growth/discovery
// Additive, opt-in endpoints — your existing /vendor/getVendorsByCategoryId
// route is completely untouched. Switch your Vendor Search screen to call
// these instead when you're ready for featured-boosted results.
@Controller('vendor/growth/discovery')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  // GET /vendor/growth/discovery/vendors-by-category?categoryId=...
  @Get('vendors-by-category')
  getVendorsByCategory(@Query('categoryId') categoryId: string) {
    return this.discoveryService.getVendorsByCategory(categoryId);
  }

  // GET /vendor/growth/discovery/packages-by-service?service=...&guests=...
  @Get('packages-by-service')
  getPackagesByService(@Query('service') service: string, @Query('guests') guests: string) {
    return this.discoveryService.getPackagesByService(service, parseInt(guests, 10));
  }
}