//fyp-backend/src/vendor/dto/create-photographer-business-details.dto.ts


import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePhotographerBusinessDetailsDto  {

  // ===============================
  // Photography Services
  // ===============================

  @IsArray()
   @IsString({ each: true })
  photographyTypes: string[];

  // ===============================
  // Equipment
  // ===============================

  @IsArray()
  @IsString({ each: true })
  equipment: string[];

  // ===============================
  // Editing Services
  // ===============================

  @IsArray()
  @IsString({ each: true })
  editingServices: string[];

  // ===============================
  // Staff Gender
  // ===============================

  @IsArray()
  @IsString({ each: true })
  staffGender: string[];

  // ===============================
  // Photography Style
  // ===============================

  @IsArray()
  @IsString({ each: true })
  photoStyle: string[];

  // ===============================
  // Travels To Client
  // ===============================

  @IsBoolean()
  travelsToClientHome: boolean;

  // ===============================
  // Delivery Time
  // ===============================

  @IsString()
  deliveryTime: string;

  // ===============================
  // City Covered
  // ===============================

  @IsString()
  cityCovered: string;

  // ===============================
  // Starting Price
  // ===============================

  @IsNumber()
  @Min(0)
  minimumPrice: number;

  // ===============================
  // Description
  // ===============================

  @IsString()
  description: string;

  // ===============================
  // Additional Information
  // ===============================

  @IsOptional()
  @IsString()
  additionalInfo?: string;

  // ===============================
  // Down Payment Type
  // ===============================

  @IsEnum([
    'PERCENTAGE',
    'FIXED',
  ])
  downPaymentType: 'PERCENTAGE' | 'FIXED';

  // ===============================
  // Down Payment
  // ===============================

  @IsNumber()
  @Min(0)
  downPayment: number;

  // ===============================
  // Covid Compliant
  // ===============================

  @IsEnum([
    'YES',
    'NO',
  ])
  covidCompliant: 'YES' | 'NO';

  // ===============================
  // Refund Policy
  // ===============================

  @IsEnum([
    'REFUNDABLE',
    'NON-REFUNDABLE',
    'PARTIALLY REFUNDABLE',
  ])
  covidRefundPolicy:
    | 'REFUNDABLE'
    | 'NON-REFUNDABLE'
    | 'PARTIALLY REFUNDABLE';
}