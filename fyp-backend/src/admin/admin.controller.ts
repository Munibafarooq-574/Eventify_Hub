// fyp-backend/src/admin/admin.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdminService } from './admin.service';
import { CategoryService } from '../category/category.service';

import {
  CategoryRequestStatus,
} from '../schemas/category-request.schema';

import {
  ReviewCategoryRequestDto,
} from '../category/dto/review-category-request.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly categoryService: CategoryService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('bookings')
  getBookings(
    @Query('filter') filter?: string,
    @Query('limit') limit = 20,
    @Query('skip') skip = 0,
  ) {
    return this.adminService.getBookings(
      filter,
      limit,
      skip,
    );
  }

  @Get('bookings/:id')
  getBookingDetail(
    @Param('id') vendorOrderId: string,
  ) {
    return this.adminService.getBookingDetail(
      vendorOrderId,
    );
  }

  @Get('category-requests')
  getCategoryRequests(
    @Query('status')
    status?: CategoryRequestStatus,
  ) {
    return this.categoryService.getCategoryRequests(
      status,
    );
  }

  @Patch('category-requests/:requestId/review')
  reviewCategoryRequest(
    @Param('requestId')
    requestId: string,

    @Body()
    dto: ReviewCategoryRequestDto,
  ) {
    return this.categoryService.reviewCategoryRequest(
      requestId,
      dto,
    );
  }
}