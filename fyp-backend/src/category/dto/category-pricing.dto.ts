import { Transform } from 'class-transformer';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsIn, IsOptional } from 'class-validator';
import { PRICING_METHODS, PricingMethod } from '../../common/utils/package-pricing';

export class CategoryPricingDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch { return value; }
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(PRICING_METHODS, { each: true })
  allowedPricingMethods?: PricingMethod[];
}
