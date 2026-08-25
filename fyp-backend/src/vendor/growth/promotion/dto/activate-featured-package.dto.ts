// fyp-backend/src/vendor/growth/promotion/dto/activate-featured-package.dto.ts
import { IsMongoId } from 'class-validator';

export class ActivateFeaturedPackageDto {
  @IsMongoId({ message: 'packageId must be a valid id' })
  packageId: string;
}