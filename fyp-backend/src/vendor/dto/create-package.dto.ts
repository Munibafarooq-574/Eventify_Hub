//fyp-backend/src/vendor/dto/create-package.dto.ts

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

export class PackageDurationOptionDto {
  @IsNumber()
  @Min(1)
  value: number;

  @IsEnum(['HOURS', 'DAYS'])
  unit: 'HOURS' | 'DAYS';

  @IsNumber()
  @Min(0)
  price: number;
}

export class PackageDto {
  @IsString()
  packageName: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Old packages ke liye backward compatibility
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsString()
  services: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageDurationOptionDto)
  durations?: PackageDurationOptionDto[];

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

export class CreatePackagesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackageDto)
  packages: PackageDto[];
}