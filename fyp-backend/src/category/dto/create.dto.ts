import { CategoryPricingDto } from './category-pricing.dto';
import {
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { BusinessDetailsType } from '../../schemas/category.schema';

export class CreateDto extends CategoryPricingDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  pictureUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BusinessDetailsType)
  businessDetailsType?: BusinessDetailsType;
}