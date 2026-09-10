// fyp-backend/src/category/category.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  BusinessDetailsType,
  Category,
} from '../schemas/category.schema';

import { CreateDto } from './dto/create.dto';

import { FileUploadService } from 'src/file-upload/file-upload.service';

import {
  CategoryRequest,
  CategoryRequestDocument,
  CategoryRequestStatus,
} from '../schemas/category-request.schema';

import { CreateCategoryRequestDto } from './dto/create-category-request.dto';

import {
  CategoryRequestReviewAction,
  ReviewCategoryRequestDto,
} from './dto/review-category-request.dto';

import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<Category>,

    @InjectModel(CategoryRequest.name)
    private readonly categoryRequestModel: Model<CategoryRequestDocument>,

    private readonly fileUploadService: FileUploadService,
  ) {}

  /**
   * Reusable normalization.
   *
   * Examples:
   * " Florist " -> "florist"
   * "FLORIST" -> "florist"
   * "Wedding   Transport" -> "wedding transport"
   */
  private normalizeCategoryName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  /**
   * =========================================================
   * CREATE CATEGORY
   * =========================================================
   *
   * Existing admin/category creation flow.
   */
  async create(
    createDto: CreateDto,
    file?: Express.Multer.File,
  ) {
    const name = createDto.name?.trim();

    if (!name) {
      throw new BadRequestException(
        'Category name is required',
      );
    }

    const normalizedName =
      this.normalizeCategoryName(name);

    const existingCategory =
      await this.categoryModel.findOne({
        normalizedName,
      });

    if (existingCategory) {
      throw new ConflictException(
        'Category already exists',
      );
    }

    let imageUrl =
      createDto.pictureUrl || '';

    if (file) {
      const uploadedFile =
        await this.fileUploadService.uploadFile(
          file,
        );

      imageUrl =
        uploadedFile?.Location || '';
    }

    if (!imageUrl) {
      throw new BadRequestException(
        'Category image is required',
      );
    }

    return this.categoryModel.create({
      name,
      normalizedName,
      image: imageUrl,
      description:
        createDto.description?.trim() || '',
      businessDetailsType:
        createDto.businessDetailsType ??
        BusinessDetailsType.GENERIC,
      isActive: true,
    });
  }

  /**
   * =========================================================
   * GET ACTIVE CATEGORIES
   * =========================================================
   *
   * Public/mobile category listing.
   * Only active categories are returned.
   *
   * $ne: false is intentional because old categories created
   * before isActive existed should still count as active.
   */
  async getAll() {
    return this.categoryModel
      .find({
        isActive: {
          $ne: false,
        },
      })
      .sort({
        name: 1,
      })
      .exec();
  }

  /**
   * =========================================================
   * GET ADMIN CATEGORIES
   * =========================================================
   *
   * Admin can see BOTH active and inactive categories.
   *
   * Optional:
   * search
   * status = active | inactive
   * limit
   * skip
   */
  async getAdminCategories(
    search?: string,
    status?: string,
    limit = 20,
    skip = 0,
  ) {
    const safeLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100,
    );

    const safeSkip = Math.max(
      Number(skip) || 0,
      0,
    );

    const filter: Record<string, any> = {};

    const normalizedSearch =
      search?.trim();

    if (normalizedSearch) {
      filter.$or = [
        {
          name: {
            $regex: normalizedSearch,
            $options: 'i',
          },
        },
        {
          description: {
            $regex: normalizedSearch,
            $options: 'i',
          },
        },
      ];
    }

    if (status === 'active') {
      filter.isActive = {
        $ne: false,
      };
    }

    if (status === 'inactive') {
      filter.isActive = false;
    }

    return this.categoryModel
      .find(filter)
      .select(
        '_id name normalizedName image description businessDetailsType isActive createdAt updatedAt',
      )
      .sort({
        createdAt: -1,
      })
      .skip(safeSkip)
      .limit(safeLimit)
      .lean()
      .exec();
  }

  /**
   * =========================================================
   * GET ADMIN CATEGORY DETAIL
   * =========================================================
   *
   * Admin can inspect an active OR inactive category.
   */
  async getAdminCategoryById(
    categoryId: string,
  ) {
    if (
      !Types.ObjectId.isValid(categoryId)
    ) {
      throw new BadRequestException(
        'Invalid category ID.',
      );
    }

    const category =
      await this.categoryModel
        .findById(categoryId)
        .select(
          '_id name normalizedName image description businessDetailsType isActive createdAt updatedAt',
        )
        .lean()
        .exec();

    if (!category) {
      throw new NotFoundException(
        'Category not found.',
      );
    }

    return category;
  }

  /**
   * =========================================================
   * CREATE CATEGORY REQUEST
   * =========================================================
   *
   * Used when vendor selects:
   *
   * "My category isn't listed"
   *
   * Vendor does NOT create the real Category directly.
   * A PENDING CategoryRequest is created for admin review.
   */
  async createCategoryRequest(
  dto: CreateCategoryRequestDto,
) {
  const requesterName =
    dto.requesterName?.trim();

  const requesterEmail =
    dto.requesterEmail
      ?.trim()
      .toLowerCase();

  const requestedName =
    dto.requestedName?.trim();

  const description =
    dto.description?.trim();

  if (!requesterName) {
    throw new BadRequestException(
      'Requester name is required.',
    );
  }

  if (!requesterEmail) {
    throw new BadRequestException(
      'Requester email is required.',
    );
  }

  if (!requestedName) {
    throw new BadRequestException(
      'Category name is required.',
    );
  }

  if (!description) {
    throw new BadRequestException(
      'Category description is required.',
    );
  }

  const normalizedName =
    this.normalizeCategoryName(
      requestedName,
    );

  // Check whether actual category already exists.
  const existingCategory =
    await this.categoryModel.findOne({
      normalizedName,
    });

  if (existingCategory) {
    throw new ConflictException(
      `Category "${existingCategory.name}" already exists. Please select it from the category list.`,
    );
  }

  // Prevent duplicate pending request
  // for the same normalized category.
  const existingPendingRequest =
    await this.categoryRequestModel.findOne({
      normalizedName,
      status:
        CategoryRequestStatus.PENDING,
    });

  if (existingPendingRequest) {
    throw new ConflictException(
      'A request for this category is already pending review.',
    );
  }

  const request =
    await this.categoryRequestModel.create({
      requesterName,
      requesterEmail,
      requestedName,
      normalizedName,
      description,

      status:
        CategoryRequestStatus.PENDING,
    });

  return {
    message:
      'Category request submitted successfully.',
    request,
  };
}

  /**
   * =========================================================
   * GET CATEGORY REQUESTS
   * =========================================================
   *
   * Admin can retrieve:
   *
   * all requests
   * PENDING
   * APPROVED
   * REJECTED
   * MERGED
   */
  async getCategoryRequests(
  status?: CategoryRequestStatus,
) {
  const filter: Record<string, any> = {};

  if (status) {
    filter.status = status;
  }

  return this.categoryRequestModel
    .find(filter)
    .populate({
      path: 'requestedBy',
      select: '_id name email',
    })
    .populate({
      path: 'reviewedBy',
      select: '_id name email',
    })
    .populate({
      path: 'approvedCategoryId',
      select: '_id name',
    })
    .sort({
      createdAt: -1,
    })
    .exec();
}

  /**
   * =========================================================
   * REVIEW CATEGORY REQUEST
   * =========================================================
   *
   * Supported:
   *
   * REJECT
   * MERGE
   * APPROVE foundation
   */
  async reviewCategoryRequest(
  requestId: string,
  dto: ReviewCategoryRequestDto,
  adminId?: string,
  file?: Express.Multer.File,
) {
  if (!Types.ObjectId.isValid(requestId)) {
    throw new BadRequestException(
      'Invalid category request ID.',
    );
  }

  const request =
    await this.categoryRequestModel.findById(
      requestId,
    );

  if (!request) {
    throw new NotFoundException(
      'Category request not found.',
    );
  }

  if (
    request.status !==
    CategoryRequestStatus.PENDING
  ) {
    throw new BadRequestException(
      'This category request has already been reviewed.',
    );
  }

  const reviewedBy =
    adminId &&
    Types.ObjectId.isValid(adminId)
      ? new Types.ObjectId(adminId)
      : null;

  // ------------------------------------------------
  // REJECT
  // ------------------------------------------------

  if (
    dto.action ===
    CategoryRequestReviewAction.REJECT
  ) {
    request.status =
      CategoryRequestStatus.REJECTED;

    request.adminNote =
      dto.adminNote?.trim() || null;

    request.reviewedAt = new Date();

    request.reviewedBy =
      reviewedBy;

    await request.save();

    return {
      message:
        'Category request rejected successfully.',
      request,
    };
  }

  // ------------------------------------------------
  // MERGE
  // ------------------------------------------------

  if (
    dto.action ===
    CategoryRequestReviewAction.MERGE
  ) {
    if (!dto.mergeCategoryId) {
      throw new BadRequestException(
        'mergeCategoryId is required when merging a category request.',
      );
    }

    if (
      !Types.ObjectId.isValid(
        dto.mergeCategoryId,
      )
    ) {
      throw new BadRequestException(
        'Invalid merge category ID.',
      );
    }

    const targetCategory =
      await this.categoryModel.findOne({
        _id: dto.mergeCategoryId,
        isActive: {
          $ne: false,
        },
      });

    if (!targetCategory) {
      throw new NotFoundException(
        'Active category for merge was not found.',
      );
    }

    request.status =
      CategoryRequestStatus.MERGED;

    request.approvedCategoryId =
      targetCategory._id;

    request.adminNote =
      dto.adminNote?.trim() || null;

    request.reviewedAt = new Date();

    request.reviewedBy =
      reviewedBy;

    await request.save();

    return {
      message:
        'Category request merged successfully.',
      category: targetCategory,
      request,
    };
  }

  // ------------------------------------------------
  // APPROVE
  // ------------------------------------------------

  if (
    dto.action ===
    CategoryRequestReviewAction.APPROVE
  ) {
    const existingCategory =
      await this.categoryModel.findOne({
        normalizedName:
          request.normalizedName,
      });

    if (existingCategory) {
      throw new ConflictException(
        'A category with this name already exists. Merge the request with the existing category instead.',
      );
    }

    if (
      !file &&
      !dto.pictureUrl?.trim()
    ) {
      throw new BadRequestException(
        'Category image is required when approving a category request.',
      );
    }

    // Reuse existing category creation logic.
    // No duplicate category creation code.
    const createdCategory =
      await this.create(
        {
          name: request.requestedName,
          description:
            request.description,
          pictureUrl:
            dto.pictureUrl?.trim(),
          businessDetailsType:
            dto.businessDetailsType ||
            BusinessDetailsType.GENERIC,
        },
        file,
      );

    request.status =
      CategoryRequestStatus.APPROVED;

    request.approvedCategoryId =
      createdCategory._id;

    request.adminNote =
      dto.adminNote?.trim() || null;

    request.reviewedAt = new Date();

    request.reviewedBy =
      reviewedBy;

    await request.save();

    return {
      message:
        'Category request approved successfully.',
      category: createdCategory,
      request,
    };
  }

  throw new BadRequestException(
    'Invalid category request review action.',
  );
}

  /**
 * =========================================================
 * UPDATE ADMIN CATEGORY
 * =========================================================
 */
async updateAdminCategory(
  categoryId: string,
  dto: UpdateCategoryDto,
  file?: Express.Multer.File,
) {
  if (!Types.ObjectId.isValid(categoryId)) {
    throw new BadRequestException(
      'Invalid category ID.',
    );
  }

  const category =
    await this.categoryModel.findById(
      categoryId,
    );

  if (!category) {
    throw new NotFoundException(
      'Category not found.',
    );
  }

  if (dto.name !== undefined) {
    const name = dto.name.trim();

    if (!name) {
      throw new BadRequestException(
        'Category name is required.',
      );
    }

    const normalizedName =
      this.normalizeCategoryName(name);

    const duplicate =
      await this.categoryModel.findOne({
        normalizedName,
        _id: {
          $ne: category._id,
        },
      });

    if (duplicate) {
      throw new ConflictException(
        'Category already exists.',
      );
    }

    category.name = name;
    category.normalizedName =
      normalizedName;
  }

  if (dto.description !== undefined) {
    category.description =
      dto.description.trim();
  }

  if (
    dto.businessDetailsType !== undefined
  ) {
    category.businessDetailsType =
      dto.businessDetailsType;
  }

  if (dto.pictureUrl?.trim()) {
    category.image =
      dto.pictureUrl.trim();
  }

  if (file) {
    const uploadedFile =
      await this.fileUploadService.uploadFile(
        file,
      );

    const uploadedImage =
      uploadedFile?.Location || '';

    if (!uploadedImage) {
      throw new BadRequestException(
        'Category image upload failed.',
      );
    }

    category.image = uploadedImage;
  }

  await category.save();

  return {
    message:
      'Category updated successfully.',
    category,
  };
}

/**
 * =========================================================
 * ACTIVATE / DEACTIVATE ADMIN CATEGORY
 * =========================================================
 */
async setAdminCategoryStatus(
  categoryId: string,
  isActive: boolean,
) {
  if (!Types.ObjectId.isValid(categoryId)) {
    throw new BadRequestException(
      'Invalid category ID.',
    );
  }

  if (typeof isActive !== 'boolean') {
    throw new BadRequestException(
      'isActive must be a boolean.',
    );
  }

  const category =
    await this.categoryModel.findById(
      categoryId,
    );

  if (!category) {
    throw new NotFoundException(
      'Category not found.',
    );
  }

  category.isActive = isActive;

  await category.save();

  return {
    message: isActive
      ? 'Category activated successfully.'
      : 'Category deactivated successfully.',
    category,
  };
}
}