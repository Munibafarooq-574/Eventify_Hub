import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateVenueBusinessDetailsDto {
  @IsArray()
  @IsString({ each: true })
  typeOfVenue: string[];

  @IsString()
  expertise: string;

  @IsString()
  amenities: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maximumPeopleCapacity?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  catering?: string[];

  @IsBoolean()
  parking: boolean;

  @IsArray()
  @IsString({ each: true })
  staff: string[];

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