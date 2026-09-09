// fyp-backend/src/category/category.controller.ts

import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { CategoryService } from './category.service';
import { CreateDto } from './dto/create.dto';
import { CreateCategoryRequestDto } from './dto/create-category-request.dto';

@Controller('category')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
  ) {}

  // ============================
  // CREATE CATEGORY
  // POST /category
  // ============================

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() createDto: CreateDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.categoryService.create(
      createDto,
      file,
    );
  }

  // ============================
  // GET ACTIVE CATEGORIES
  // GET /category
  // ============================

  @Get()
  getAll() {
    return this.categoryService.getAll();
  }

  // ============================
  // CREATE CATEGORY REQUEST
  // POST /category/requests
  //
  // Vendor / registration side
  // can submit a missing category request.
  // Admin review endpoints live under /admin.
  // ============================

  @Post('requests')
  createCategoryRequest(
    @Body() dto: CreateCategoryRequestDto,
  ) {
    return this.categoryService.createCategoryRequest(
      dto,
    );
  }
}