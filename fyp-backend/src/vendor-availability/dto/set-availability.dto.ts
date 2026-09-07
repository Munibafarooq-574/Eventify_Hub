
// fyp-backend/src/vendor-availability/dto/set-availability.dto.ts

import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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
  @Min(1, { each: true })
  @IsOptional()
  maxEventDurationMinutes?: number[];
}

export class SetAvailabilityDto {
  /**
   * Legacy working-days configuration.
   */
  @IsArray()
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
  @IsIn([0, 30, 60, 120, 240, 480, 1440, 2880])
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
  @Min(0, { each: true })
  @IsOptional()
  advanceNoticeOptionsMinutes?: number[];

  /**
   * Maximum number of concurrent bookings.
   */
  @IsInt()
  @IsOptional()
  @Min(1)
  maxConcurrentBookings?: number;

  /**
   * Vendor-wide default maximum event duration.
   *
   * Example:
   * 480 = 8 hours
   *
   * Per-day daySlots[].maxEventDurationMinutes
   * can override this value.
   */
  @IsInt()
  @IsOptional()
  @Min(1)
  maxEventDurationMinutes?: number | null;
}
