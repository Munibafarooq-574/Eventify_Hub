//fyp-backend/src/reviews/reviews.controller.ts
import {
    Body,
    BadRequestException,
    UploadedFiles,
UseInterceptors,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from 'src/file-upload/file-upload.service';

import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
     constructor(
  private readonly reviewsService: ReviewsService,
  private readonly fileUploadService: FileUploadService,
) {}

// POST /reviews/media
@UseGuards(JwtAuthGuard)
@Post('media')
@UseInterceptors(
  FilesInterceptor('files', 8, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 8,
    },
    fileFilter: (req, file, callback) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/quicktime',
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return callback(
          new BadRequestException(
            'Only JPG, PNG, WEBP, MP4 and MOV files are allowed.',
          ),
          false,
        );
      }

      callback(null, true);
    },
  }),
)
async uploadReviewMedia(
  @Req() req: any,
  @UploadedFiles() files: Express.Multer.File[],
) {
  const role = String(req.user?.role || '').toLowerCase();

  if (role !== 'client' && role !== 'organizer') {
    throw new BadRequestException(
      'Only Client accounts can upload review media.',
    );
  }

  if (!files?.length) {
    throw new BadRequestException(
      'Please select at least one photo or video.',
    );
  }

  const urls =
    await this.fileUploadService.uploadMultipleFiles(files);

  return {
    message: 'Review media uploaded successfully',
    urls,
  };
}
    // POST /reviews?userId=abc
    @Post()
    async create(
        @Query('userId') userId: string,
        @Body() dto: CreateReviewDto,
    ) {
        return this.reviewsService.createReview(userId, dto);
    }

    // GET /reviews?vendorId=xyz&rating=5&withMedia=true&sort=recent&page=1&limit=20
    @Get()
    async getReviews(@Query() query: ReviewQueryDto) {
        return this.reviewsService.getVendorReviews(query);
    }

    // GET /reviews/summary?vendorId=xyz
    @Get('summary')
    async getSummary(@Query('vendorId') vendorId: string) {
        return this.reviewsService.getVendorReviewSummary(vendorId);
    }

    // GET /reviews/top-vendors
    @Get('top-vendors')
    async getTopVendors() {
        return this.reviewsService.getTopVendorsByRating();
    }

    // POST /reviews/:reviewId/reply
    @UseGuards(JwtAuthGuard)
@Post(':reviewId/reply')
async replyToReview(
    @Param('reviewId') reviewId: string,
    @Body() dto: ReplyReviewDto,
    @Req() req: any,
) {
    console.log('REPLY REQUEST USER:', req.user);

    const vendorId = req.user.id;

    return this.reviewsService.replyToReview(
        reviewId,
        vendorId,
        dto,
    );
}
}