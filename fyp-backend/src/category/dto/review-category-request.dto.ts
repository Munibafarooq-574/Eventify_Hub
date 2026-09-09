import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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

  /**
   * Required when action = MERGE.
   * Existing Category _id.
   */
  @IsOptional()
  @IsMongoId()
  mergeCategoryId?: string;
}