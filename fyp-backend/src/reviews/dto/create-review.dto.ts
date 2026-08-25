// src/reviews/dto/create-review.dto.ts
/*import { IsNotEmpty, IsString, IsMongoId, IsInt, Max, Min } from 'class-validator';

export class CreateReviewDto {
    @IsMongoId()
    vendorId: string;

    @IsString()
    @IsNotEmpty()
    reviewText: string;

    @IsInt()
    @Min(1)
    @Max(5)
    rating: number;
}*/

// src/reviews/dto/create-review.dto.ts

import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsInt,
  Max,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReviewMediaType } from 'src/schemas/review.schema';

export class ReviewMediaDto {
  @IsEnum(ReviewMediaType)
  type: ReviewMediaType;

  @IsUrl()
  url: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;
}

export class CreateReviewDto {
  @IsMongoId()
  vendorId: string;

  @IsString()
  @IsNotEmpty()
  reviewText: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewMediaDto)
  media?: ReviewMediaDto[];
}
