// fyp-backend/src/category/category.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';

import { CategoryService } from './category.service';

import {
  CreateCategoryRequestDto,
} from './dto/create-category-request.dto';

@Controller('category')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
  ) {}

  // ============================================================
  // GET ACTIVE CATEGORIES
  // GET /category
  //
  // Public/mobile category discovery.
  // Only active categories are returned.
  // ============================================================

  @Get()
  getAll() {
    return this.categoryService.getAll();
  }

  // ============================================================
  // CREATE CATEGORY REQUEST
  // POST /category/requests
  //
  // Vendor / registration side can request a missing category.
  //
  // Vendor/public user cannot directly create a real category.
  // Actual category creation is handled by:
  //
  // POST /admin/categories
  //
  // which is protected by Admin authentication/role guards.
  // ============================================================

  @Post('requests')
  createCategoryRequest(
    @Body()
    dto: CreateCategoryRequestDto,
  ) {
    return this.categoryService.createCategoryRequest(
      dto,
    );
  }
}