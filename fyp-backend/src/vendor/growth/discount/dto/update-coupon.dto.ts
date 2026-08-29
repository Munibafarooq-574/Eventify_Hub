// fyp-backend/src/vendor/growth/discount/dto/update-coupon.dto.ts
//
// Deliberately NOT extending CreateCouponDto with PartialType — avoids
// assuming @nestjs/mapped-types is already a dependency in this project.
// Everything here is optional; code/discountType/packageId are excluded
// on purpose — those define the coupon's identity, safer to cancel and
// recreate than mutate mid-life.

import { IsDateString, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateCouponDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumDiscountAmount?: number;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  usageLimit?: number;
}