//fyp-backend/src/reviews/dto/review-query.dto.ts
import { IsOptional, IsIn, IsMongoId, IsInt, Min, Max, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReviewSortOption {
  RECENT = 'recent',
  HIGHEST = 'highest',
  LOWEST = 'lowest',
}

export class ReviewQueryDto {
  @IsMongoId()
  vendorId: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsBooleanString()
  withMedia?: string; // query params are strings; controller/service will coerce to boolean

  @IsOptional()
  @IsIn(Object.values(ReviewSortOption))
  sort?: ReviewSortOption;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}