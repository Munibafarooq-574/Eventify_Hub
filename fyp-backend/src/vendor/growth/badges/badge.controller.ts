// fyp-backend/src/vendor/growth/badges/badge.controller.ts

/*import { Controller, Get, Param, Query } from '@nestjs/common';
import { BadgeService } from './badge.service';

// Mounted at: /vendor/growth/badges
@Controller('vendor/growth/badges')
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  // GET /vendor/growth/badges/:vendorId
  // All 5 badges with earned: true/false — used by VendorBadgesScreen
  // (vendor's own "why don't I have this yet" view).
  @Get(':vendorId')
  getBadges(@Param('vendorId') vendorId: string) {
    return this.badgeService.getVendorBadges(vendorId);
  }

  // GET /vendor/growth/badges/:vendorId/earned
  // Only the badges the vendor currently has — used for compact display
  // on vendor cards / profile (customer-facing).
  @Get(':vendorId/earned')
  getEarnedBadges(@Param('vendorId') vendorId: string) {
    return this.badgeService.getEarnedVendorBadges(vendorId);
  }
}*/


// fyp-backend/src/vendor/growth/badges/badge.controller.ts

import { Controller, Get, Param, Query } from '@nestjs/common';
import { BadgeService } from './badge.service';

// Mounted at: /vendor/growth/badges
@Controller('vendor/growth/badges')
export class BadgeController {
  constructor(private readonly badgeService: BadgeService) {}

  /**
   * GET /vendor/growth/badges/bulk?vendorIds=a,b,c
   *
   * Returns earned badges for multiple vendors in a single request.
   *
   * IMPORTANT:
   * This route must be declared BEFORE ':vendorId',
   * otherwise Nest may treat "bulk" as a vendorId.
   */
  @Get('bulk')
  getBadgesForVendors(@Query('vendorIds') vendorIds: string) {
    if (!vendorIds) {
      return [];
    }

    const ids = vendorIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    return this.badgeService.getBadgeSummariesForVendors(ids);
  }

  /**
   * GET /vendor/growth/badges/:vendorId
   *
   * Returns all badges with earned: true/false.
   * Used by the vendor's own badge screen.
   */
  @Get(':vendorId')
  getBadges(@Param('vendorId') vendorId: string) {
    return this.badgeService.getVendorBadges(vendorId);
  }

  /**
   * GET /vendor/growth/badges/:vendorId/earned
   *
   * Returns only badges the vendor has earned.
   * Used for compact badge display on vendor cards/profile.
   */
  @Get(':vendorId/earned')
  getEarnedBadges(@Param('vendorId') vendorId: string) {
    return this.badgeService.getEarnedVendorBadges(vendorId);
  }
}

