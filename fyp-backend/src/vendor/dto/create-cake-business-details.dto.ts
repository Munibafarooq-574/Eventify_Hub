//fyp-backend/src/vendor/dto/create-cake-business-details.dto.ts
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateCakeBusinessDetailsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  cakeTypes: string[];

  @IsNumber()
  minimumPrice: number;

  @IsString()
  expertise: string;

  @IsString()
  cityCovered: string;

  @IsBoolean()
  deliveryToHome: boolean;

  @IsArray()
  @IsString({ each: true })
  deliveryOptions: string[];

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  additionalInfo?: string;

  @IsEnum(["PERCENTAGE", "FIXED AMOUNT"])
  downPaymentType: string;

  @IsNumber()
  downPayment: number;

  @IsEnum([
    "REFUNDABLE",
    "NON-REFUNDABLE",
    "PARTIALLY REFUNDABLE",
  ])
  cancellationPolicy: string;

  @IsEnum(["YES", "NO"])
  covidCompliant: string;
}