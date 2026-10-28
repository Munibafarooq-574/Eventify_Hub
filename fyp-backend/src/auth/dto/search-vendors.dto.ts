import { Transform } from 'class-transformer';
import {
  IsMongoId,
  IsArray,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class SearchVendorsDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  replacementMode?: string;
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
  @IsString()
  eventDate?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

   @IsOptional()
  @IsNumberString()
  durationMinutes?: string;

  @IsOptional()
  @IsNumberString()
  minRating?: string;
  @IsOptional()
  staff?: 'MALE' | 'FEMALE';

  @IsOptional()
  cancellationPolicy?: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').filter(Boolean) : value)
  @IsArray()
  @IsMongoId({ each: true })
  cityIds?: string[];

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').filter(Boolean) : value)
  @IsArray()
  @IsIn(['MALE', 'FEMALE'], { each: true })
  staffOptions?: string[];

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').filter(Boolean) : value)
  @IsArray()
  @IsIn(['REFUNDABLE', 'NON-REFUNDABLE', 'PARTIALLY REFUNDABLE'], { each: true })
  policies?: string[];

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').filter(Boolean) : value)
  @IsArray()
  @IsIn(['1', '2', '3', '4', '5', 'unrated'], { each: true })
  ratingBands?: string[];
}
