import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  BusinessDetailsType,
} from '../../schemas/category.schema';

export enum CategoryRequestReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  MERGE = 'MERGE',
}

export class ReviewCategoryRequestDto {
  @IsEnum(CategoryRequestReviewAction)
  action: CategoryRequestReviewAction;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  adminNote?: string;

  @IsOptional()
  @IsMongoId()
  mergeCategoryId?: string;

  // Used only when APPROVE is selected
  @IsOptional()
  @IsString()
  pictureUrl?: string;

  @IsOptional()
  @IsEnum(BusinessDetailsType)
  businessDetailsType?: BusinessDetailsType;
}