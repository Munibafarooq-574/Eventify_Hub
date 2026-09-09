import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCateringBusinessDetailsDto {
  @IsArray()
  @IsString({ each: true })
  expertise: string[];

  @IsBoolean()
  travelsToClientHome: boolean;

  @IsString()
  cityCovered: string;

  @IsArray()
  @IsString({ each: true })
  staff: string[];

  @IsOptional()
  @IsBoolean()
  provideFoodTesting?: boolean;

  @IsOptional()
  @IsBoolean()
  provideDecoration?: boolean;

  @IsOptional()
  @IsBoolean()
  provideSoundSystem?: boolean;

  @IsOptional()
  @IsBoolean()
  provideSeatingArrangement?: boolean;

  @IsOptional()
  @IsBoolean()
  provideWaiters?: boolean;

  @IsOptional()
  @IsBoolean()
  provideCutleryAndPlates?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPrice?: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @IsIn(['PERCENTAGE', 'FIXED'])
  downPaymentType: 'PERCENTAGE' | 'FIXED';

  @IsNumber()
  @Min(0)
  downPayment: number;

  @IsIn([
    'REFUNDABLE',
    'NON-REFUNDABLE',
    'PARTIALLY REFUNDABLE',
  ])
  cancellationPolicy:
    | 'REFUNDABLE'
    | 'NON-REFUNDABLE'
    | 'PARTIALLY REFUNDABLE';

  @IsIn(['YES', 'NO'])
  covidCompliant: 'YES' | 'NO';
}