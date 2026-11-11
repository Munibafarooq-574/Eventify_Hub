import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { PRICING_METHODS, PricingMethod } from '../../common/utils/package-pricing';
import { DeliveryPackageDto } from './delivery-package.dto';

export class PackagePricingDto extends DeliveryPackageDto {
  @IsOptional()
  @IsIn(PRICING_METHODS)
  pricingMethod?: PricingMethod;

  @IsOptional()
  @IsInt()
  @Min(1)
  groupSize?: number;

  @IsOptional()
  @IsIn(['PERSON', 'GROUP', 'VEHICLE', 'TEAM', 'SETUP'])
  capacityUnit?: 'PERSON' | 'GROUP' | 'VEHICLE' | 'TEAM' | 'SETUP';

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPeoplePerBooking?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUnitsPerBooking?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  availableParallelUnits?: number;
}
