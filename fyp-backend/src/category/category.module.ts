// fyp-backend/src/category/category.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';

import {
  Category,
  CategorySchema,
} from 'src/schemas/category.schema';

import {
  CategoryRequest,
  CategoryRequestSchema,
} from '../schemas/category-request.schema';

import { FileUploadService } from 'src/file-upload/file-upload.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Category.name,
        schema: CategorySchema,
      },
      {
        name: CategoryRequest.name,
        schema: CategoryRequestSchema,
      },
    ]),
  ],

  controllers: [
    CategoryController,
  ],

  providers: [
    CategoryService,
    FileUploadService,
  ],

  exports: [
    CategoryService,
  ],
})
export class CategoryModule {}