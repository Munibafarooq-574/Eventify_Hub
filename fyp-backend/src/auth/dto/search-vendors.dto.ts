import {
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class SearchVendorsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsMongoId({
    message: 'eventCityId must be a valid city ID',
  })
  eventCityId?: string;

  @IsOptional()
  @IsMongoId({
    message: 'categoryId must be a valid category ID',
  })
  categoryId?: string;

  @IsOptional()
  @IsNumberString()
  minRating?: string;

  @IsOptional()
  staff?: 'MALE' | 'FEMALE' ;

  @IsOptional()
  cancellationPolicy?:
    | 'REFUNDABLE'
    | 'NON-REFUNDABLE'
    | 'PARTIALLY REFUNDABLE';
}