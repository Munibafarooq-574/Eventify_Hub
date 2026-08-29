// fyp-backend/src/vendor/growth/discount/dto/validate-coupon.dto.ts
import { IsNumber, IsPositive, IsString } from 'class-validator';

export class ValidateCouponDto {
  @IsString()
  code: string;

  @IsNumber()
  @IsPositive()
  orderAmount: number;
}