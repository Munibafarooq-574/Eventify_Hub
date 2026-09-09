import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGenericBusinessDetailsDto {
  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @IsString()
  cityCovered?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumPrice?: number;

  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @IsOptional()
  @IsBoolean()
  travelsToClientHome?: boolean;

  @IsOptional()
  @IsIn(['PERCENTAGE', 'FIXED'])
  downPaymentType?: 'PERCENTAGE' | 'FIXED';

  @IsOptional()
  @IsNumber()
  @Min(0)
  downPayment?: number;

  @IsOptional()
  @IsIn([
    'REFUNDABLE',
    'NON-REFUNDABLE',
    'PARTIALLY REFUNDABLE',
  ])
  cancellationPolicy?:
    | 'REFUNDABLE'
    | 'NON-REFUNDABLE'
    | 'PARTIALLY REFUNDABLE';

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;
}