import {
  IsDateString,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCampaignDto {
  @IsMongoId()
  @IsNotEmpty()
  packageId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  offerLabel?: string;

  @IsOptional()
  @IsIn(['POSTER', 'AUTO'])
  displayMode?: 'POSTER' | 'AUTO';

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}