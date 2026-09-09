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
   */
  async getAll() {
    /**
     * $ne: false is intentional.
     *
     * Old categories created before isActive existed
     * will still be returned.
     */
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
    const requestedName =
      dto.requestedName?.trim();

    if (!requestedName) {
      throw new BadRequestException(
        'Category name is required.',
      );
    }

    const normalizedName =
      this.normalizeCategoryName(
        requestedName,
      );

    /**
     * Check if actual category already exists.
     */
    const existingCategory =
      await this.categoryModel.findOne({
        normalizedName,
      });

    if (existingCategory) {
      throw new ConflictException(
        `Category "${existingCategory.name}" already exists. Please select it from the category list.`,
      );
    }

    /**
     * Prevent duplicate pending requests.
     *
     * Example:
     *
     * Florist
     * florist
     * FLORIST
     *
     * all normalize to "florist".
     */
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
        requestedName,
        normalizedName,
        description:
          dto.description.trim(),
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
  ) {
    /**
     * Validate MongoDB request ID.
     */
    if (
      !Types.ObjectId.isValid(requestId)
    ) {
      throw new BadRequestException(
        'Invalid category request ID.',
      );
    }

    /**
     * Find request.
     */
    const request =
      await this.categoryRequestModel.findById(
        requestId,
      );

    if (!request) {
      throw new NotFoundException(
        'Category request not found.',
      );
    }

    /**
     * Reviewed request cannot be reviewed again.
     */
    if (
      request.status !==
      CategoryRequestStatus.PENDING
    ) {
      throw new BadRequestException(
        'This category request has already been reviewed.',
      );
    }

    /**
     * =======================================================
     * REJECT
     * =======================================================
     */
    if (
      dto.action ===
      CategoryRequestReviewAction.REJECT
    ) {
      request.status =
        CategoryRequestStatus.REJECTED;

      request.adminNote =
        dto.adminNote?.trim() || null;

      request.reviewedAt =
        new Date();

      if (
        adminId &&
        Types.ObjectId.isValid(adminId)
      ) {
        request.reviewedBy =
          new Types.ObjectId(adminId);
      }

      await request.save();

      return {
        message:
          'Category request rejected.',
        request,
      };
    }

    /**
     * =======================================================
     * MERGE
     * =======================================================
     *
     * Example:
     *
     * Vendor requests:
     * "Photography Services"
     *
     * But "Photography" already exists.
     *
     * Admin merges the request into existing Photography.
     */
    if (
      dto.action ===
      CategoryRequestReviewAction.MERGE
    ) {
      if (
        !dto.mergeCategoryId ||
        !Types.ObjectId.isValid(
          dto.mergeCategoryId,
        )
      ) {
        throw new BadRequestException(
          'A valid mergeCategoryId is required when merging a category request.',
        );
      }

      const targetCategory =
        await this.categoryModel.findOne({
          _id: dto.mergeCategoryId,

          /**
           * Old categories without isActive
           * should also count as active.
           */
          isActive: {
            $ne: false,
          },
        });

      if (!targetCategory) {
        throw new NotFoundException(
          'Merge target category does not exist or is inactive.',
        );
      }

      request.status =
        CategoryRequestStatus.MERGED;

      request.approvedCategoryId =
        targetCategory._id as Types.ObjectId;

      request.adminNote =
        dto.adminNote?.trim() || null;

      request.reviewedAt =
        new Date();

      if (
        adminId &&
        Types.ObjectId.isValid(adminId)
      ) {
        request.reviewedBy =
          new Types.ObjectId(adminId);
      }

      await request.save();

      return {
        message:
          `Category request merged with "${targetCategory.name}".`,
        category: targetCategory,
        request,
      };
    }

    /**
     * =======================================================
     * APPROVE
     * =======================================================
     *
     * Before creating a new Category,
     * verify it still doesn't exist.
     */
    if (
      dto.action ===
      CategoryRequestReviewAction.APPROVE
    ) {
      const duplicateCategory =
        await this.categoryModel.findOne({
          normalizedName:
            request.normalizedName,
        });

      if (duplicateCategory) {
        throw new ConflictException(
          `Category "${duplicateCategory.name}" already exists. Merge this request with the existing category instead.`,
        );
      }

      throw new BadRequestException(
        'Approval requires category image information. Create the category through the admin category creation flow, then merge this request with it.',
      );
    }

    /**
     * Extra defensive fallback.
     */
    throw new BadRequestException(
      'Invalid category request review action.',
    );
  }
}