// src/vendor/dto/update-package.dto.ts

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class UpdatePackageDto {
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
  @IsString()
  services?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePackageDurationOptionDto)
  durations?: UpdatePackageDurationOptionDto[];

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