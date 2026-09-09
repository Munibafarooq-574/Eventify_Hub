// fyp-backend/src/admin/admin.controller.ts

import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Query,
} from '@nestjs/common';

import { AdminService } from './admin.service';
import { CategoryService } from '../category/category.service';

import {
    CategoryRequestStatus,
} from '../schemas/category-request.schema';

import {
    ReviewCategoryRequestDto,
} from '../category/dto/review-category-request.dto';

@Controller('admin')
export class AdminController {
    constructor(
        private readonly adminService: AdminService,
        private readonly categoryService: CategoryService,
    ) {}

    // ============================
    // ADMIN DASHBOARD
    // GET /admin/dashboard
    // ============================

    @Get('dashboard')
    getDashboard() {
        return this.adminService.getDashboardStats();
    }

    // ============================
    // ADMIN BOOKINGS
    // GET /admin/bookings
    // ============================

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

    // ============================
    // ADMIN BOOKING DETAIL
    // GET /admin/bookings/:id
    // ============================

    @Get('bookings/:id')
    getBookingDetail(
        @Param('id') vendorOrderId: string,
    ) {
        return this.adminService.getBookingDetail(
            vendorOrderId,
        );
    }

    // ============================
    // CATEGORY REQUESTS
    // GET /admin/category-requests
    // GET /admin/category-requests?status=PENDING
    // ============================

    @Get('category-requests')
    getCategoryRequests(
        @Query('status')
        status?: CategoryRequestStatus,
    ) {
        return this.categoryService.getCategoryRequests(
            status,
        );
    }

    // ============================
    // REVIEW CATEGORY REQUEST
    // PATCH /admin/category-requests/:requestId/review
    // ============================

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