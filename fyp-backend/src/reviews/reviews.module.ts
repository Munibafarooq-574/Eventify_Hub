import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

import { Review, ReviewSchema } from 'src/schemas/review.schema';
import { VendorGrowthModule } from 'src/vendor/growth/vendor-growth.module';
import { FileUploadService } from 'src/file-upload/file-upload.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
    ]),
    VendorGrowthModule,
  ],

  controllers: [ReviewsController],

  providers: [
    ReviewsService,
    FileUploadService,
  ],
})
export class ReviewsModule {}