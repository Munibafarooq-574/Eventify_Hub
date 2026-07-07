// src/vendor/dto/update-package.dto.ts
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class UpdatePackageDto {
  @IsOptional()
  @IsString()
  packageName?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  services?: string;
}
