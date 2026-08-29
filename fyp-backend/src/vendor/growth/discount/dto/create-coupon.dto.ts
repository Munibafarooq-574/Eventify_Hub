// fyp-backend/src/vendor/growth/discount/dto/create-coupon.dto.ts
//
// Reused as-is for Discount Codes (Phase 7) — same shape, so
// DiscountController's createDiscountCode() takes this same DTO instead
// of a near-identical duplicate.
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { DiscountKind } from '../discount.types';

export class CreateCouponDto {
  @IsString()
  @Length(3, 20)
  code: string;

  @IsEnum(DiscountKind)
  discountType: DiscountKind;

  @IsNumber()
  @IsPositive()
  discountValue: number; // percentage (1-100) if discountType is PERCENTAGE, else a Rs. amount

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumOrderAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumDiscountAmount?: number;

  @IsOptional()
  @IsMongoId()
  packageId?: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsInt()
  @Min(1)
  @Max(100000)
  usageLimit: number;
}