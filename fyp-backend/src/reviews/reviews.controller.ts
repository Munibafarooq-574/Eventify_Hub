//fyp-backend/src/reviews/reviews.controller.ts
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

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