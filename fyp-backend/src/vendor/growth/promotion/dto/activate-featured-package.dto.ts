// fyp-backend/src/vendor/growth/promotion/dto/activate-featured-package.dto.ts
import { IsIn, IsMongoId } from 'class-validator';

export class ActivateFeaturedPackageDto {
  @IsMongoId({ message: 'packageId must be a valid id' })
  packageId: string;

  @IsIn([7, 15, 30], {
    message: 'durationDays must be 7, 15, or 30 days',
  })
  durationDays: number;
}