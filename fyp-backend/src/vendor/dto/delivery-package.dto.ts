import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';
export class DeliveryPackageDto {
  @IsOptional() @IsEnum(['FREE', 'PAID']) deliveryFeeType?: 'FREE' | 'PAID';
  @IsOptional() @IsNumber() @Min(0) deliveryFee?: number;
  @IsOptional() @IsBoolean() deliveryExtraWeightEnabled?: boolean;
  @IsOptional() @IsNumber() @Min(0.000001) deliveryIncludedWeightKg?: number;
  @IsOptional() @IsNumber() @Min(0) deliveryExtraFeePerKg?: number;
  @IsOptional() @IsNumber() @Min(0.000001) deliveryWeightKg?: number;
  @IsOptional() @IsEnum(['PACKAGE', 'PER_GUEST']) deliveryWeightBasis?: 'PACKAGE' | 'PER_GUEST';
  @IsOptional() @IsInt() @Min(1) @Max(1440) deliveryReserveMinutes?: number;
}
