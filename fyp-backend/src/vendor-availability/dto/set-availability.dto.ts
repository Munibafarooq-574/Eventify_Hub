
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
   * Maximum event durations allowed for this specific day.
   *
   * Example:
   * [120, 300, 480]
   *
   * = 2 hours, 5 hours, 8 hours
   *
   * If an empty array is provided, there is no
   * per-day duration restriction.
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
   * Legacy/single minimum advance notice.
   *
   * Supported values:
   * 0, 30 minutes, 1 hour, 2 hours, 4 hours,
   * 8 hours, 24 hours, 48 hours.
   */
  @IsInt()
  @Min(1440)
  @IsDivisibleBy(1440)
  @IsOptional()
  minimumAdvanceMinutes?: number;

  /**
   * Multiple booking notice options selected by the vendor.
   *
   * Example:
   * [180, 360, 720]
   *
   * = 3 hours, 6 hours, 12 hours before event.
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
