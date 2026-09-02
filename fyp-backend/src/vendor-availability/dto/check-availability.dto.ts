//fyp-backend/src/vendor-availability/dto/check-availability.dto.ts
import { IsArray, IsDateString, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CheckAvailabilityDto {
  @IsArray()
  @IsNotEmpty()
  vendorIds: string[];

  @IsDateString()
  eventDate: string; // e.g. "2026-09-10"

  @IsString()
  startTime: string; // "HH:mm", 24h

  @IsInt()
  @Min(1)
  durationMinutes: number;
}