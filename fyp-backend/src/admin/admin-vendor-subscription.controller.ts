// fyp-backend/src/admin/admin-vendor-subscription.controller.ts

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  JwtAuthGuard,
} from '../auth/jwt-auth.guard';

import {
  AdminRoleGuard,
} from '../auth/admin-role.guard';

import {
  AdminVendorSubscriptionService,
} from './admin-vendor-subscription.service';

@Controller(
  'admin/vendor-subscriptions',
)
@UseGuards(
  JwtAuthGuard,
  AdminRoleGuard,
)
export class AdminVendorSubscriptionController {
  constructor(
    private readonly service:
      AdminVendorSubscriptionService,
  ) {}

  @Get()
  getVendorSubscriptions(
    @Query('search')
    search?: string,

    @Query('plan')
    plan?: string,

    @Query('status')
    status?: string,

    @Query('page')
    page?: string,

    @Query('limit')
    limit?: string,
  ) {
    return this.service
      .getVendorSubscriptions({
        search,
        plan,
        status,
        page,
        limit,
      });
  }

  @Get(':vendorId')
  
  getVendorSubscriptionDetail(
    @Param('vendorId')
    vendorId: string,
  ) {
    return this.service
      .getVendorSubscriptionDetail(
        vendorId,
      );
  }
}


