import {
  IsArray,
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
  ValidateIf,
} from 'class-validator';

import {
  DiscountAudience,
  DiscountKind,
} from '../discount.types';

export class CreateDiscountCodeDto {
  @IsString()
  @Length(3, 20)
  code: string;

  @IsEnum(DiscountKind)
  discountType: DiscountKind;

  @IsNumber()
  @IsPositive()
  discountValue: number;

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

  @IsEnum(DiscountAudience)
  audience: DiscountAudience;

  @ValidateIf(
    (dto) =>
      dto.audience === DiscountAudience.SELECTED_ORGANIZERS,
  )
  @IsArray()
  @IsMongoId({ each: true })
  selectedOrganizerIds?: string[];
}