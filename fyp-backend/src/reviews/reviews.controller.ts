//fyp-backend/src/reviews/reviews.controller.ts
import {
    Body,
    Controller,
    Get,
    Post,
    Query,
} from '@nestjs/common';

import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { ReviewsService } from './reviews.service';

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

    @Get('top-vendors')
    async getTopVendors() {
        return this.reviewsService.getTopVendorsByRating();
    }

    // GET /reviews/summary?vendorId=xyz
    @Get('summary')
    async getSummary(@Query('vendorId') vendorId: string) {
        return this.reviewsService.getVendorReviewSummary(vendorId);
    }
}