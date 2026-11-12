import { APPOINTMENT_TIMINGS, type AppointmentTiming } from '../../vendor-availability/appointment-candidates';
import { PackagePricingDto } from './package-pricing.dto';
// src/vendor/dto/update-package.dto.ts

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PackageBookingType } from '../../schemas/user.schema';

export class UpdatePackageDurationOptionDto {
  @IsNumber()
  @Min(1)
  value: number;

  @IsEnum(['HOURS', 'DAYS'])
  unit: 'HOURS' | 'DAYS';

  @IsNumber()
  @Min(0)
  price: number;
}

export class UpdatePackageDto extends PackagePricingDto {
  @IsOptional()
  @IsString()
  packageName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Backward compatibility
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  services?: string;

   @IsOptional()
  @IsEnum(PackageBookingType)
  bookingType?: PackageBookingType;

  @IsOptional()
  @IsNumber()
  @Min(1)
  requiredServiceDurationMinutes?: number;

  @IsOptional()
  @IsEnum([...APPOINTMENT_TIMINGS])
  appointmentTiming?: AppointmentTiming;

  @IsOptional()
  @IsInt()
  @Min(1)
  duringEventDurationMinutes?: number | null;

  @IsOptional()
  @IsNumber()
  serviceWindowStartOffsetMinutes?: number;

  @IsOptional()
  @IsNumber()
  serviceWindowEndOffsetMinutes?: number;
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePackageDurationOptionDto)
  durations?: UpdatePackageDurationOptionDto[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  baseIncludedDurationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  allowCustomDuration?: boolean;

  @IsOptional()
  @IsEnum(['HOURS', 'DAYS'])
  customDurationUnit?: 'HOURS' | 'DAYS';

  @IsOptional()
  @IsNumber()
  @Min(0)
  customDurationRate?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}