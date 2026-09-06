// fyp-backend/src/admin/admin-analytics.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { AdminAnalyticsService } from './admin-analytics.service';

@Controller('admin/analytics')
export class AdminAnalyticsController {
    constructor(private readonly service: AdminAnalyticsService) {}

    @Get('revenue')
    getRevenue(@Query('months') months = 6) {
        return this.service.getMonthlyRevenue(Number(months));
    }

    @Get('popular-services')
    getPopularServices() {
        return this.service.getPopularServices();
    }

    @Get('vendor-performance')
    getVendorPerformance() {
        return this.service.getVendorPerformance();
    }

    @Get('demand-insights')
    getDemandInsights() {
        return this.service.getDemandInsights();
    }
}