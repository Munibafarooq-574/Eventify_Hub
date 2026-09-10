// fyp-backend/src/admin/admin.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import {
  FileInterceptor,
} from '@nestjs/platform-express';

import { AdminService } from './admin.service';
import { CategoryService } from '../category/category.service';

import {
  CategoryRequestStatus,
} from '../schemas/category-request.schema';

import {
  ReviewCategoryRequestDto,
} from '../category/dto/review-category-request.dto';

import {
  CreateDto,
} from '../category/dto/create.dto';

import {
  UpdateCategoryDto,
} from '../category/dto/update-category.dto';

import {
  UpdateCategoryStatusDto,
} from '../category/dto/update-category-status.dto';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../auth/admin-role.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly categoryService: CategoryService,
  ) {}

  // ============================================================
  // ADMIN DASHBOARD
  // GET /admin/dashboard
  // ============================================================

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // ============================================================
  // ADMIN VENDORS
  // GET /admin/vendors
  //
  // Optional query params:
  // ?search=
  // ?categoryId=
  // ?city=
  // ?limit=20
  // ?skip=0
  // ============================================================

  @Get('vendors')
  getVendors(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('city') city?: string,
    @Query('limit') limit = 20,
    @Query('skip') skip = 0,
  ) {
    return this.adminService.getVendors(
      search,
      categoryId,
      city,
      limit,
      skip,
    );
  }

  // ============================================================
  // ADMIN VENDOR DETAIL
  // GET /admin/vendors/:id
  // ============================================================

  @Get('vendors/:id')
  getVendorDetail(
    @Param('id') vendorId: string,
  ) {
    return this.adminService.getVendorDetail(
      vendorId,
    );
  }

  // ============================================================
  // ADMIN CLIENTS
  // GET /admin/clients
  //
  // Database compatibility:
  // Existing Client accounts still use role = "Organizer".
  //
  // Optional query params:
  // ?search=
  // ?limit=20
  // ?skip=0
  // ============================================================

  @Get('clients')
  getClients(
    @Query('search') search?: string,
    @Query('limit') limit = 20,
    @Query('skip') skip = 0,
  ) {
    return this.adminService.getClients(
      search,
      limit,
      skip,
    );
  }

  // ============================================================
  // ADMIN CLIENT DETAIL
  // GET /admin/clients/:id
  // ============================================================

  @Get('clients/:id')
  getClientDetail(
    @Param('id') clientId: string,
  ) {
    return this.adminService.getClientDetail(
      clientId,
    );
  }

  // ============================================================
  // ADMIN BOOKINGS
  // GET /admin/bookings
  // ============================================================

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

  // ============================================================
  // ADMIN BOOKING DETAIL
  // GET /admin/bookings/:id
  // ============================================================

  @Get('bookings/:id')
  getBookingDetail(
    @Param('id') vendorOrderId: string,
  ) {
    return this.adminService.getBookingDetail(
      vendorOrderId,
    );
  }

  // ============================================================
  // ADMIN CREATE CATEGORY
  // POST /admin/categories
  //
  // Accepts:
  // - name
  // - description
  // - businessDetailsType
  // - pictureUrl OR uploaded file
  // ============================================================

  @Post('categories')
  @UseInterceptors(
    FileInterceptor('file'),
  )
createCategory(
  @Body()
  dto: CreateDto,

  @UploadedFile()
  file?: Express.Multer.File,
) {
  return this.categoryService.create(
    dto,
    file,
  );
}

  // ============================================================
  // ADMIN CATEGORIES
  // GET /admin/categories
  //
  // Optional query params:
  // ?search=
  // ?status=active|inactive
  // ?limit=20
  // ?skip=0
  // ============================================================

  @Get('categories')
  getCategories(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('limit') limit = 20,
    @Query('skip') skip = 0,
  ) {
    return this.categoryService.getAdminCategories(
      search,
      status,
      limit,
      skip,
    );
  }

  // ============================================================
  // ADMIN CATEGORY DETAIL
  // GET /admin/categories/:id
  // ============================================================

  @Get('categories/:id')
  getCategoryDetail(
    @Param('id') categoryId: string,
  ) {
    return this.categoryService.getAdminCategoryById(
      categoryId,
    );
  }

  // ============================================================
  // ADMIN UPDATE CATEGORY
  // PATCH /admin/categories/:id
  //
  // Can update:
  // - name
  // - description
  // - businessDetailsType
  // - pictureUrl OR uploaded file
  // ============================================================

  @Patch('categories/:id')
  @UseInterceptors(
    FileInterceptor('file'),
  )
  updateCategory(
    @Param('id')
    categoryId: string,

    @Body()
    dto: UpdateCategoryDto,

    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    return this.categoryService.updateAdminCategory(
      categoryId,
      dto,
      file,
    );
  }

  // ============================================================
  // ADMIN ACTIVATE / DEACTIVATE CATEGORY
  // PATCH /admin/categories/:id/status
  // ============================================================

  @Patch('categories/:id/status')
  updateCategoryStatus(
    @Param('id')
    categoryId: string,

    @Body()
    dto: UpdateCategoryStatusDto,
  ) {
    return this.categoryService.setAdminCategoryStatus(
      categoryId,
      dto.isActive,
    );
  }

  // ============================================================
  // ADMIN CATEGORY REQUESTS
  // GET /admin/category-requests
  // ============================================================

  @Get('category-requests')
  getCategoryRequests(
    @Query('status')
    status?: CategoryRequestStatus,
  ) {
    return this.categoryService.getCategoryRequests(
      status,
    );
  }

  // ============================================================
  // ADMIN REVIEW CATEGORY REQUEST
  // PATCH /admin/category-requests/:requestId/review
  //
  // Supports:
  // - APPROVE
  // - REJECT
  // - MERGE
  //
  // APPROVE can receive:
  // - pictureUrl
  // OR
  // - multipart file
  //
  // Logged-in Admin ID is saved into reviewedBy.
  // ============================================================

  @Patch(
    'category-requests/:requestId/review',
  )
  @UseInterceptors(
    FileInterceptor('file'),
  )
  reviewCategoryRequest(
    @Param('requestId')
    requestId: string,

    @Body()
    dto: ReviewCategoryRequestDto,

    @Request()
    req: any,

    @UploadedFile()
    file?: Express.Multer.File,
  ) {
    return this.categoryService.reviewCategoryRequest(
      requestId,
      dto,
      req.user?.id,
      file,
    );
  }
}