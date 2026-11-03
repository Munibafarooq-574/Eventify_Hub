
// fyp-backend/src/vendor-availability/dto/set-availability.dto.ts

import {
  IsArray,
  IsIn, IsDivisibleBy,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class WorkingDayDto {
  @IsIn(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

  @IsOptional()
  enabled?: boolean;
}

export class TimeSlotDto {
  @IsString()
  start: string; // "HH:mm"

  @IsString()
  end: string; // "HH:mm"
}

export class DaySlotConfigDto {
  @IsIn(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

  @IsOptional()
  enabled?: boolean;

    @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeSlotDto)
  @IsOptional()
  slots?: TimeSlotDto[];

  /**
   * Booking notice options for this day, in whole-day minutes.
   * Example: [1440, 2880, 4320] = 1, 2, or 3 days before service.
   * Empty array falls back to vendor-wide notice options.
   */
    @IsArray()
@IsInt({ each: true })
  @IsDivisibleBy(1440, { each: true })
@Min(1440, { each: true })
@IsOptional()
advanceNoticeOptionsMinutes?: number[];
}

export class SetAvailabilityDto {
  /**
   * Legacy working-days configuration.
   */
   @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingDayDto)
  @IsOptional()
  workingDays?: WorkingDayDto[];

  /**
   * Legacy working-hours configuration.
   */
  @IsString()
  @IsOptional()
  workingHoursStart?: string; // "HH:mm" — legacy fallback

  @IsString()
  @IsOptional()
  workingHoursEnd?: string; // "HH:mm" — legacy fallback

  /**
   * New multi-slot per-day configuration.
   */
    @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DaySlotConfigDto)
  @IsOptional()
  daySlots?: DaySlotConfigDto[];

  /**
   * Dates on which the vendor is unavailable.
   * ISO date strings.
   */
  @IsArray()
  @IsOptional()
  blockedDates?: string[];

  /**
   * Minimum advance booking notice in whole-day minutes.
   * Minimum: 1440 (1 day). Example: 2880 = 2 days.
   */
  @IsInt()
  @Min(1440)
  @IsDivisibleBy(1440)
  @IsOptional()
  minimumAdvanceMinutes?: number;

  /**
   * Vendor-wide booking notice options in whole-day minutes.
   * Example: [1440, 2880, 10080] = 1, 2, or 7 days before service.
   */
  @IsArray()
  @IsInt({ each: true })
  @IsDivisibleBy(1440, { each: true })
  @Min(1440, { each: true })
  @IsOptional()
  advanceNoticeOptionsMinutes?: number[];

  /**
   * Maximum number of concurrent bookings.
   */
  @IsInt()
  @IsOptional()
  @Min(1)
  maxConcurrentBookings?: number;

}
