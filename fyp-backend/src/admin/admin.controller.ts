// fyp-backend/src/admin/admin.controller.ts

import {
  BadRequestException,
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
import { AdminCampaignService } from './admin-campaign.service';
import { CampaignStatus } from '../schemas/vendor-campaign.schema';
import {
  VendorApprovalStatus,
} from '../schemas/user.schema';
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
    private readonly adminCampaignService: AdminCampaignService,
  ) {}

  private validateObjectId(
    id: string,
    label: string,
  ): void {
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException(
        `Invalid ${label} ID.` ,
      );
    }
  }

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
  @Query('approvalStatus')
  approvalStatus?: VendorApprovalStatus,
  @Query('limit') limit = 20,
  @Query('skip') skip = 0,
) {
  return this.adminService.getVendors(
    search,
    categoryId,
    city,
    approvalStatus,
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
    this.validateObjectId(vendorId, 'vendor');

    return this.adminService.getVendorDetail(
      vendorId,
    );
  }

  // ============================================================
// ADMIN REVIEW VENDOR PROFILE
// PATCH /admin/vendors/:id/approval
//
// Body:
// {
//   status: "APPROVED" | "REJECTED",
//   reason?: string
// }
//
// Reject ke liye reason required hoga.
// Logged-in Admin ID reviewedBy mein save hoga.
// ============================================================

@Patch('vendors/:id/approval')
reviewVendorProfile(
  @Param('id')
  vendorId: string,

  @Body()
  body: {
    status:
      | VendorApprovalStatus.APPROVED
      | VendorApprovalStatus.REJECTED;

    reason?: string;
  },

  @Request()
  req: any,
) {
  this.validateObjectId(vendorId, 'vendor');

  return this.adminService.reviewVendorProfile(
    vendorId,
    body.status,
    req.user?.id,
    body.reason,
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
    this.validateObjectId(clientId, 'client');

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
    this.validateObjectId(vendorOrderId, 'booking');

    return this.adminService.getBookingDetail(
      vendorOrderId,
    );
  }

  // ============================================================
  // ADMIN CAMPAIGNS
  // GET /admin/campaigns
  //
  // Optional:
  // ?status=pending
  // ?limit=20
  // ?skip=0
  // ============================================================

  @Get('campaigns')
  getCampaigns(
    @Query('status')
    status?: CampaignStatus,

    @Query('limit')
    limit = 20,

    @Query('skip')
    skip = 0,
  ) {
    return this.adminCampaignService.getCampaigns(
      status,
      limit,
      skip,
    );
  }

  // ============================================================
  // ADMIN CAMPAIGN DETAIL
  // GET /admin/campaigns/:id
  // ============================================================

  
  // =============================================================
  // PHASE 6 STEP 4 - CAMPAIGN ANALYTICS
  // GET /admin/campaigns/analytics/summary
  // Existing campaign counters only.
  // =============================================================

  @Get('campaigns/analytics/summary')
  getCampaignAnalytics() {
    return this.adminCampaignService
      .getCampaignAnalytics();
  }
@Get('campaigns/:id')
  getCampaignDetail(
    @Param('id')
    campaignId: string,
  ) {
    return this.adminCampaignService.getCampaignDetail(
      campaignId,
    );
  }

  // ============================================================
  // ADMIN APPROVE CAMPAIGN
  // PATCH /admin/campaigns/:id/approve
  // ============================================================

  @Patch('campaigns/:id/approve')
  approveCampaign(
    @Param('id')
    campaignId: string,

    @Request()
    req: any,
  ) {
    return this.adminCampaignService.approveCampaign(
      campaignId,
      req.user?.id,
    );
  }

  // ============================================================
  // ADMIN REJECT CAMPAIGN
  // PATCH /admin/campaigns/:id/reject
  //
  // Body:
  // {
  //   "reason": "Campaign image does not meet requirements."
  // }
  // ============================================================

  @Patch('campaigns/:id/reject')
  rejectCampaign(
    @Param('id')
    campaignId: string,

    @Body()
    body: {
      reason: string;
    },

    @Request()
    req: any,
  ) {
    return this.adminCampaignService.rejectCampaign(
      campaignId,
      req.user?.id,
      body.reason,
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

