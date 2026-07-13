//fyp-backend/src/vendor/dto/create-photographer-business-details.dto.ts

/*export class CreatePhotographerBusinessDetailsDto {
    cityCovered: string;
    staff: string;
    minimumPrice: number;
    description: string;
    additionalInfo?: string;
    downPaymentType: 'PERCENTAGE' | 'FIXED';
    downPayment: number;
    covidCompliant: 'YES' | 'NO';
    covidRefundPolicy: 'REFUNDABLE' | 'NON-REFUNDABLE' | 'PARTIALLY REFUNDABLE';
}
*/

// ==========================================
// BACKEND DTO
// Used in NestJS
// Receives data from frontend
// ==========================================

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePhotographyBusinessDetailsDto {

  // ===============================
  // Photography Services
  // ===============================

  @IsArray()
  photographyTypes: string[];

  // ===============================
  // Equipment
  // ===============================

  @IsArray()
  equipment: string[];

  // ===============================
  // Editing Services
  // ===============================

  @IsArray()
  editingServices: string[];

  // ===============================
  // Staff Gender
  // ===============================

  @IsArray()
  staffGender: string[];

  // ===============================
  // Photography Style
  // ===============================

  @IsArray()
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