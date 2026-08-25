// fyp-backend/src/vendor/growth/badges/badge.controller.ts

import { Controller, Get, Param, Query } from '@nestjs/common';
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
}