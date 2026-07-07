// src/reviews/reviews.controller.ts
import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) { }

    // POST /reviews?userId=abc
    @Post()
    async create(
        @Query('userId') userId: string,
        @Body() dto: CreateReviewDto,
    ) {
        return this.reviewsService.createReview(userId, dto);
    }

    // GET /reviews?vendorId=xyz
    @Get()
    async getReviews(@Query('vendorId') vendorId: string) {
        return this.reviewsService.getVendorReviews(vendorId);
    }

    @Get('top-vendors')
    async getTopVendors() {
        return this.reviewsService.getTopVendorsByRating();
    }
}
