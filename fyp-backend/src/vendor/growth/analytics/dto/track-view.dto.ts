// fyp-backend/src/vendor/growth/analytics/dto/track-view.dto.ts
import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class TrackViewDto {
  @IsMongoId({ message: 'vendorId must be a valid id' })
  vendorId: string;

  // Omit for a vendor-profile view. Set to a package subdocument _id for
  // a package view.
  @IsOptional()
  @IsString()
  packageId?: string;
}