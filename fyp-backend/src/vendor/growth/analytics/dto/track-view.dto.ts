// fyp-backend/src/vendor/growth/analytics/dto/track-view.dto.ts
import { IsIn, IsMongoId, IsOptional, IsString } from 'class-validator';

export class TrackViewDto {
  @IsMongoId({ message: 'vendorId must be a valid id' })
  vendorId: string;

    @IsOptional()
  @IsString()
  packageId?: string;

  @IsOptional()
  @IsIn(['organic', 'sponsored'])
  source?: 'organic' | 'sponsored';
}