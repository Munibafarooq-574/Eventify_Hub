import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

import { User } from '../schemas/user.schema';
import { Category } from '../schemas/category.schema';
import { Review } from '../schemas/review.schema';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserProfileDto } from './dto/update-profile.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { SearchVendorsDto } from './dto/search-vendors.dto';

import { FileUploadService } from 'src/file-upload/file-upload.service';

/**
 * =============================================================
 * PUBLIC VENDOR PROJECTION
 * =============================================================
 *
 * /auth/vendor-search is a PUBLIC endpoint.
 *
 * Never return the complete User document from this endpoint.
 * Only explicitly allowed public vendor/profile fields should
 * leave the backend.
 *
 * Sensitive fields such as:
 *
 * - password
 * - pushToken
 * - providerId
 * - authentication/internal fields
 *
 * are intentionally NOT selected.
 */
const PUBLIC_VENDOR_SELECT = [
  '_id',
  'name',
  'role',

  'buisnessCategory',
  'categoryId',
  'categoryName',
  'businessDetailsType',

  'contactDetails',

  'coverImage',
  'images',
  'packages',

  'photographerBusinessDetails',
  'cateringBusinessDetails',
  'venueBusinessDetails',
  'salonBusinessDetails',
  'cakeBusinessDetails',
  'mehndiBusinessDetails',
  'soundBusinessDetails',
  'genericBusinessDetails',

  'availabilitySettings',

  'isOnline',
  'lastSeen',

  'createdAt',
  'updatedAt',
].join(' ');

@Injectable()
export class AuthService {
  private readonly logger = new Logger('fyp');

  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,

    @InjectModel(Category.name)
    private categoryModel: Model<Category>,

    @InjectModel(Review.name)
    private reviewModel: Model<Review>,

    private jwtService: JwtService,

    private fileUploadService: FileUploadService,
  ) {}

  // =========================================================
  // REGISTER
  // =========================================================

  async register(registerDto: RegisterDto) {
    const {
      email,
      password,
      role,
      categoryId,
      buisnessCategories,
    } = registerDto;

    this.logger.log(
      {
        email,
        role,
        categoryId:
          categoryId ?? buisnessCategories,
      },
      'Register',
    );

    const normalizedRole =
      role?.trim().toLowerCase();

    // =====================================================
    // SECURITY:
    // Admin accounts must NEVER be created from
    // the public Client/Vendor registration endpoint.
    // =====================================================

    if (normalizedRole === 'admin') {
      throw new UnauthorizedException(
        'Admin accounts cannot be created through public registration',
      );
    }

    const isVendor =
      normalizedRole === 'vendor';

    /**
     * categoryId is the new canonical property.
     *
     * buisnessCategories remains temporarily supported
     * for backward compatibility with the current
     * mobile app.
     */
    const selectedCategoryId =
      categoryId ?? buisnessCategories;

    let category: Category | null = null;

    // =====================================================
    // VENDOR CATEGORY VALIDATION
    // =====================================================

    if (isVendor) {
      if (!selectedCategoryId) {
        throw new NotFoundException(
          'Vendor category is required',
        );
      }

      if (
        !Types.ObjectId.isValid(
          selectedCategoryId,
        )
      ) {
        throw new NotFoundException(
          'Invalid category ID',
        );
      }

      category =
        await this.categoryModel.findOne({
          _id: new Types.ObjectId(
            selectedCategoryId,
          ),

          isActive: {
            $ne: false,
          },
        });

      if (!category) {
        throw new NotFoundException(
          'Category does not exist or is inactive',
        );
      }
    }

    // =====================================================
    // CHECK EXISTING USER
    // =====================================================

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser =
      await this.userModel.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      throw new UnauthorizedException(
        'Email already exists',
      );
    }

    // =====================================================
    // PASSWORD HASH
    // =====================================================

    const hashedPassword =
      await bcrypt.hash(
        password,
        10,
      );

    // =====================================================
    // CREATE USER PAYLOAD
    // =====================================================

    const userPayload: Record<
      string,
      any
    > = {
      ...registerDto,

      email: normalizedEmail,

      password: hashedPassword,

      phone_number:
        registerDto.mobileNumber,

      address:
        registerDto.address,

      role,
    };

    /**
     * Only vendors should have
     * a business category.
     */
    if (
      isVendor &&
      category
    ) {
      userPayload.buisnessCategory =
        category._id;
    }

    /**
     * DTO-only transition fields
     * should not be persisted separately.
     */
    delete userPayload.categoryId;

    delete userPayload.buisnessCategories;

    delete userPayload.mobileNumber;

    // =====================================================
    // SAVE USER
    // =====================================================

    const user =
      await this.userModel.create(
        userPayload,
      );

    // =====================================================
    // JWT
    //
    // Phase 1:
    // role is included so backend authorization
    // can distinguish Admin / Vendor / Client.
    // =====================================================

    const token =
      this.jwtService.sign({
        id: user._id,
        role: user.role,
      });

    return {
      token,
      user,
    };
  }

  // =========================================================
  // LOGIN
  // =========================================================

  async login(
    loginDto: LoginDto,
  ) {
    const {
      email,
      password,
    } = loginDto;

    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await this.userModel.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    if (user.password) {
      const isPasswordValid =
        await bcrypt.compare(
          password,
          user.password,
        );

      if (!isPasswordValid) {
        throw new UnauthorizedException(
          'Invalid credentials',
        );
      }
    }

    // =====================================================
    // JWT
    // role included for backend authorization
    // =====================================================

    const token =
      this.jwtService.sign({
        id: user._id,
        role: user.role,
      });

    return {
      token,
      user,
    };
  }

  // =========================================================
  // FORGOT PASSWORD
  // =========================================================

  async forgotPassword(
    email: string,
  ) {
    const normalizedEmail =
      email.trim().toLowerCase();

    const user =
      await this.userModel.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      throw new UnauthorizedException(
        'User not found',
      );
    }

    /**
     * Password-reset token is NOT an authenticated
     * Admin API token, so role is intentionally
     * not required here.
     */
    const resetToken =
      this.jwtService.sign(
        {
          id: user._id,
        },
        {
          expiresIn: '1h',
        },
      );

    const transporter =
      nodemailer.createTransport({
        host: process.env.SMTP_HOST,

        port: parseInt(
          process.env.SMTP_PORT ||
            '0',
        ),

        auth: {
          user:
            process.env.SMTP_USER,

          pass:
            process.env.SMTP_PASS,
        },
      });

    await transporter.sendMail({
      to: normalizedEmail,

      subject:
        'Password Reset',

      html: `Click <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">here</a> to reset your password.`,
    });

    return {
      message:
        'Password reset email sent',
    };
  }

  // =========================================================
  // OAUTH
  // =========================================================

  async validateOAuthUser(
    profile: any,
    provider: string,
  ) {
    const email =
      profile.emails[0].value
        .trim()
        .toLowerCase();

    let user =
      await this.userModel.findOne({
        email,
      });

    if (!user) {
      user =
        await this.userModel.create({
          email,

          provider,

          providerId:
            profile.id,

          name:
            profile.displayName,
        });
    }

    // =====================================================
    // JWT
    // Include role when one exists on the User.
    // =====================================================

    const token =
      this.jwtService.sign({
        id: user._id,
        role: user.role,
      });

    return {
      token,
    };
  }

  // =========================================================
  // UPDATE USER
  // =========================================================

  async updateUser(
    updateDto:
      UpdateUserProfileDto,

    file?:
      Express.Multer.File,
  ): Promise<User> {
    console.log(updateDto);

    const updateData: any = {
      name:
        updateDto.name,

      email:
        updateDto.email,

      address:
        updateDto.address,

      phone_number:
        updateDto.phoneNumber,
    };

    /**
     * Only upload + overwrite brandLogo
     * if a NEW file was actually sent.
     *
     * Without a file, existing brandLogo
     * remains untouched.
     */
    if (file) {
      const uploaded =
        await this.fileUploadService.uploadFile(
          file,
        );

      updateData[
        'contactDetails.brandLogo'
      ] =
        uploaded?.Location || '';
    }

    const updatedUser =
      await this.userModel.findByIdAndUpdate(
        updateDto.userId,

        updateData,

        {
          new: true,
        },
      );

    if (!updatedUser) {
      throw new NotFoundException(
        'User not found',
      );
    }

    return updatedUser;
  }

  // =========================================================
  // SEARCH USERS
  // =========================================================

  async searchUsers(
    keyword: string,
  ): Promise<User[]> {
    return this.userModel
      .find({
        role: 'Vendor',

        $or: [
          {
            name: {
              $regex: keyword,
              $options: 'i',
            },
          },

          {
            'contactDetails.brandName':
              {
                $regex: keyword,
                $options: 'i',
              },
          },
        ],
      })
      .exec();
  }

  // =========================================================
  // SEARCH ORGANIZERS
  //
  // Existing backend role compatibility retained.
  // User-facing terminology can remain "Client".
  // =========================================================

  async searchOrganizers(
    keyword: string,
  ): Promise<User[]> {
    return this.userModel
      .find({
        role: 'Organizer',

        $or: [
          {
            name: {
              $regex: keyword,
              $options: 'i',
            },
          },

          {
            email: {
              $regex: keyword,
              $options: 'i',
            },
          },
        ],
      })

      .select(
        '_id name email',
      )

      .limit(50)

      .exec();
  }

  // =========================================================
  // SEARCH VENDORS
  //
  // PUBLIC ENDPOINT SECURITY:
  //
  // Never return complete User documents from this method.
  // PUBLIC_VENDOR_SELECT is applied in BOTH:
  //
  // 1. no-filter vendor listing
  // 2. filtered vendor listing
  //
  // This prevents password/authentication fields from being
  // exposed through GET /auth/vendor-search.
  // =========================================================

  async searchVendorsByFilters(
    filters:
      SearchVendorsDto,
  ): Promise<any[]> {
    console.log(
      'Filters',
      filters,
    );

    const hasFilters =
      Object.values(
        filters || {},
      ).some(
        (value) =>
          value !== undefined &&
          value !== null &&
          value !== '',
      );

    // =====================================================
    // NO FILTERS
    // =====================================================

    if (!hasFilters) {
      const allVendors =
        await this.userModel
          .find({
            role: 'Vendor',
          })

          /**
           * SECURITY:
           * Positive allowlist only.
           *
           * Password, pushToken and other authentication
           * fields cannot be returned because they are
           * not part of PUBLIC_VENDOR_SELECT.
           */
          .select(
            PUBLIC_VENDOR_SELECT,
          )

          .lean();

      return allVendors.map(
        this.attachBusinessDetails,
      );
    }

    const query: any = {
      role: 'Vendor',
    };

    // =====================================================
    // NAME
    // =====================================================

    if (filters.name) {
      query['name'] = {
        $regex:
          filters.name,

        $options:
          'i',
      };
    }

    // =====================================================
    // CATEGORY
    // =====================================================

    if (
      filters.categoryId
    ) {
      query[
        'buisnessCategory'
      ] =
        new Types.ObjectId(
          filters.categoryId,
        );
    }

    // =====================================================
    // CITY
    // =====================================================

    if (filters.city) {
      query['$or'] = [
        ...(
          query['$or'] ||
          []
        ),

        {
          'photographerBusinessDetails.cityCovered':
            {
              $regex:
                filters.city,

              $options:
                'i',
            },
        },

        {
          'salonBusinessDetails.cityCovered':
            {
              $regex:
                filters.city,

              $options:
                'i',
            },
        },

        {
          'cateringBusinessDetails.cityCovered':
            {
              $regex:
                filters.city,

              $options:
                'i',
            },
        },

        {
          'venueBusinessDetails.cityCovered':
            {
              $regex:
                filters.city,

              $options:
                'i',
            },
        },

        {
          'cakeBusinessDetails.cityCovered':
            {
              $regex:
                filters.city,

              $options:
                'i',
            },
        },

        {
          'mehndiBusinessDetails.cityCovered':
            {
              $regex:
                filters.city,

              $options:
                'i',
            },
        },

        {
          'soundBusinessDetails.cityCovered':
            {
              $regex:
                filters.city,

              $options:
                'i',
            },
        },

        {
          'genericBusinessDetails.cityCovered':
            {
              $regex:
                filters.city,

              $options:
                'i',
            },
        },
      ];
    }

    // =====================================================
    // STAFF
    // =====================================================

    if (filters.staff) {
      query['$or'] = [
        {
          'photographerBusinessDetails.staff':
            filters.staff,
        },

        {
          'salonBusinessDetails.staffGender':
            filters.staff,
        },

        {
          'cateringBusinessDetails.staff':
            filters.staff,
        },

        {
          'venueBusinessDetails.staff':
            filters.staff,
        },
      ];
    }

    // =====================================================
    // CANCELLATION POLICY
    // =====================================================

    if (
      filters.cancellationPolicy
    ) {
      if (!query['$or']) {
        query['$or'] = [];
      }

      query['$or'].push(
        {
          'salonBusinessDetails.cancellationPolicy':
            filters.cancellationPolicy,
        },

        {
          'cateringBusinessDetails.cancellationPolicy':
            filters.cancellationPolicy,
        },

        {
          'venueBusinessDetails.cancellationPolicy':
            filters.cancellationPolicy,
        },
      );
    }

    const users =
      await this.userModel
        .find(query)

        /**
         * SECURITY:
         * The filtered query must use exactly the same
         * public allowlist as the no-filter query.
         */
        .select(
          PUBLIC_VENDOR_SELECT,
        )

        .lean();

    // =====================================================
    // MINIMUM RATING
    // =====================================================

    let filteredUsers =
      users;

    if (
      typeof filters.minRating ===
      'number'
    ) {
      const vendorIds =
        users.map(
          (user) =>
            user._id,
        );

      const reviews =
        await this.reviewModel.aggregate(
          [
            {
              $match: {
                vendorId: {
                  $in:
                    vendorIds,
                },
              },
            },

            {
              $group: {
                _id:
                  '$vendorId',

                avgRating: {
                  $avg:
                    '$rating',
                },
              },
            },
          ],
        );

      const ratingMap =
        new Map(
          reviews.map(
            (review) => [
              review._id.toString(),
              review.avgRating,
            ],
          ),
        );

      filteredUsers =
        users.filter(
          (user) => {
            const avg =
              ratingMap.get(
                user._id.toString(),
              ) ?? 0;

            return (
              avg >=
              filters.minRating!
            );
          },
        );
    }

    // =====================================================
    // UNIFIED BUSINESS DETAILS
    // =====================================================

    return filteredUsers.map(
      this.attachBusinessDetails,
    );
  }

  // =========================================================
  // UNIFIED BUSINESS DETAILS
  // =========================================================

  private attachBusinessDetails(
    user: any,
  ): any {
    return {
      ...user,

      BusinessDetails:
        user?.photographerBusinessDetails ??
        user?.cateringBusinessDetails ??
        user?.venueBusinessDetails ??
        user?.salonBusinessDetails ??
        user?.cakeBusinessDetails ??
        user?.mehndiBusinessDetails ??
        user?.soundBusinessDetails ??
        user?.genericBusinessDetails ??
        undefined,
    };
  }

  // =========================================================
  // UPDATE PUSH TOKEN
  // =========================================================

  async updatePushToken(
    dto:
      UpdatePushTokenDto,
  ) {
    const user =
      await this.userModel.findById(
        dto.userId,
      );

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    console.log(dto);

    user.pushToken =
      dto.token;

    return await user.save();
  }

  // =========================================================
  // GET PUSH TOKEN
  // =========================================================

  async getUserPushToken(
    userId: string,
  ): Promise<string> {
    const user =
      await this.userModel
        .findById(userId)
        .select(
          'pushToken',
        );

    if (!user) {
      throw new NotFoundException(
        `User with ID ${userId} not found`,
      );
    }

    if (!user.pushToken) {
      throw new NotFoundException(
        `Push token not found for user ID ${userId}`,
      );
    }

    return user.pushToken;
  }
}