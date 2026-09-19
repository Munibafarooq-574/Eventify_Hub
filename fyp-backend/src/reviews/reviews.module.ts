// src/reviews/reviews.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review, ReviewSchema } from 'src/schemas/review.schema';
import { VendorGrowthModule } from 'src/vendor/growth/vendor-growth.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Review.name, schema: ReviewSchema },
        ]),
        VendorGrowthModule,
    ],
    controllers: [ReviewsController],
    providers: [ReviewsService],
})
export class ReviewsModule {}