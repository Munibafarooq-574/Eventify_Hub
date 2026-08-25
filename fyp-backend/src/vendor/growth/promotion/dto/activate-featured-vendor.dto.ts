// fyp-backend/src/vendor/growth/promotion/dto/activate-featured-vendor.dto.ts
import { IsIn } from 'class-validator';
import { FEATURED_VENDOR_ALLOWED_DAYS } from '../promotion.types';

export class ActivateFeaturedVendorDto {
  @IsIn(FEATURED_VENDOR_ALLOWED_DAYS, {
    message: `durationDays must be one of: ${FEATURED_VENDOR_ALLOWED_DAYS.join(', ')}`,
  })
  durationDays: number;
}