// fyp-backend/src/vendor/growth/discount/dto/validate-coupon.dto.ts
import {
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsNumber()
  @IsPositive()
  orderAmount: number;

  @IsOptional()
@IsMongoId()
clientId?: string;

@IsOptional()
@IsString()
packageId?: string;
}