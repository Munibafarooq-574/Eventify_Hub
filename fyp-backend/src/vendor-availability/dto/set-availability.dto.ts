
//fyp-backend/src/vendor-availability/dto/set-availability.dto.ts
import { IsArray, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class WorkingDayDto {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  enabled: boolean;
}

export class SetAvailabilityDto {
  @IsArray()
  @IsOptional()
  workingDays?: WorkingDayDto[];

  @IsString()
  @IsOptional()
  workingHoursStart?: string; // "HH:mm"

  @IsString()
  @IsOptional()
  workingHoursEnd?: string;

  @IsArray()
  @IsOptional()
  blockedDates?: string[]; // ISO date strings

  @IsIn([0, 30, 60, 120, 240, 480, 1440, 2880])
  @IsOptional()
  minimumAdvanceMinutes?: number;

  @IsInt()
  @IsOptional()
  maxConcurrentBookings?: number;
}