// fyp-backend/src/vendor/growth/analytics/analytics.controller.ts
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { TrackViewDto } from './dto/track-view.dto';

// Mounted at: /vendor/growth/analytics
@Controller('vendor/growth/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // GET /vendor/growth/analytics/growth/:vendorId
  @Get('growth/:vendorId')
  getGrowthAnalytics(@Param('vendorId') vendorId: string) {
    return this.analyticsService.getGrowthAnalytics(vendorId);
  }

  // GET /vendor/growth/analytics/premium/:vendorId
  @Get('premium/:vendorId')
  getPremiumAnalytics(@Param('vendorId') vendorId: string) {
    return this.analyticsService.getPremiumAnalytics(vendorId);
  }

  // GET /vendor/growth/analytics/insights/:vendorId
  @Get('insights/:vendorId')
  getBusinessInsights(@Param('vendorId') vendorId: string) {
    return this.analyticsService.getBusinessInsights(vendorId);
  }

  // POST /vendor/growth/analytics/track-view
  // Body: { "vendorId": "...", "packageId": "..." (optional) }
  // Not called from any screen yet — see PHASE_8_README.md.
  @Post('track-view')
  async trackView(@Body() dto: TrackViewDto) {
    await this.analyticsService.trackView(dto.vendorId, dto.packageId);
    return { tracked: true };
  }
}