// fyp-backend/src/vendor-availability/vendor-availability.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User } from 'src/schemas/user.schema';
import { VendorOrder } from 'src/schemas/vendor-order.schema';

import { SetAvailabilityDto } from './dto/set-availability.dto';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Statuses that actively hold a slot.
// Rejected/cancelled release it.
const BLOCKING_STATUSES = ['pending', 'accepted', 'completed'];

function toDateKey(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export interface AvailabilityResult {
  vendorId: string;
  available: boolean;
  reason?: string;
}

@Injectable()
export class VendorAvailabilityService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(VendorOrder.name)
    private readonly vendorOrderModel: Model<VendorOrder>,
  ) {}

  async getAvailability(vendorId: string) {
    const user = await this.userModel
      .findById(vendorId)
      .select('availabilitySettings role')
      .lean();

    if (!user || user.role !== 'Vendor') {
      throw new NotFoundException('Vendor not found');
    }

    return user.availabilitySettings ?? {};
  }

  async setAvailability(
    vendorId: string,
    dto: SetAvailabilityDto,
  ) {
    const user = await this.userModel.findById(vendorId);

    if (!user || user.role !== 'Vendor') {
      throw new NotFoundException('Vendor not found');
    }

    const current =
      (user.availabilitySettings as any)?.toObject?.() ??
      user.availabilitySettings ??
      {};

    user.availabilitySettings = {
      ...current,
      ...dto,

      blockedDates: dto.blockedDates
        ? dto.blockedDates.map((d) => new Date(d))
        : current.blockedDates,
    } as any;

    user.markModified('availabilitySettings');

    await user.save();

    return user.availabilitySettings;
  }

  /**
   * Core availability check.
   *
   * Reused by:
   * - organizer search
   * - order creation backend guard
   * - booking-change preview
   * - vendor calendar
   *
   * Also enforces the vendor's maximum event duration.
   */
  async checkVendorAvailability(
    vendorId: string,
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<AvailabilityResult> {
    const vendor = await this.userModel
      .findById(vendorId)
      .select('availabilitySettings role')
      .lean();

    if (!vendor || vendor.role !== 'Vendor') {
      return {
        vendorId,
        available: false,
        reason: 'Vendor not found',
      };
    }

    const settings: any = vendor.availabilitySettings ?? {};

    const workingDays = settings.workingDays ?? [];

    const workingHoursStart =
      settings.workingHoursStart ?? '09:00';

    const workingHoursEnd =
      settings.workingHoursEnd ?? '18:00';

    const blockedDates: Date[] =
      settings.blockedDates ?? [];

    const advanceNoticeOptionsMinutes: number[] =
  Array.isArray(settings.advanceNoticeOptionsMinutes)
    ? settings.advanceNoticeOptionsMinutes
    : settings.minimumAdvanceMinutes != null
      ? [settings.minimumAdvanceMinutes]
      : [];

    const maxConcurrentBookings =
      settings.maxConcurrentBookings ?? 1;

    // ---------------------------------------------------------
    // 1 & 2. Working day + working hours
    // Multi-slot aware + backward compatible
    // ---------------------------------------------------------

    const dayCode =
      DAY_CODES[startDateTime.getDay()];

    const daySlots: any[] =
      settings.daySlots ?? [];

    const daySlotConfig = daySlots.find(
      (d: any) => d.day === dayCode,
    );

    if (daySlotConfig) {
      // Explicit multi-slot configuration for this day
      if (!daySlotConfig.enabled) {
        return {
          vendorId,
          available: false,
          reason:
            'Vendor is not working on the selected day',
        };
      }

      const slots = daySlotConfig.slots ?? [];

      if (slots.length === 0) {
        return {
          vendorId,
          available: false,
          reason:
            'No working hours configured for this day',
        };
      }

      const fitsAnySlot = slots.some(
        (slot: any) => {
          const [sh, sm] =
            slot.start.split(':').map(Number);

          const [eh, em] =
            slot.end.split(':').map(Number);

          const slotStart =
            new Date(startDateTime);

          slotStart.setHours(
            sh,
            sm,
            0,
            0,
          );

          const slotEnd =
            new Date(startDateTime);

          slotEnd.setHours(
            eh,
            em,
            0,
            0,
          );

          return (
            startDateTime >= slotStart &&
            endDateTime <= slotEnd
          );
        },
      );

      if (!fitsAnySlot) {
        return {
          vendorId,
          available: false,
          reason:
            'Outside vendor working hours for this day',
        };
      }
    } else {
      // -------------------------------------------------------
      // Legacy single-range model
      // -------------------------------------------------------

      const workingDay = workingDays.find(
        (d: any) => d.day === dayCode,
      );

      if (
        workingDays.length > 0 &&
        (!workingDay || !workingDay.enabled)
      ) {
        return {
          vendorId,
          available: false,
          reason:
            'Vendor is not working on the selected day',
        };
      }

      const [wsH, wsM] =
        workingHoursStart
          .split(':')
          .map(Number);

      const [weH, weM] =
        workingHoursEnd
          .split(':')
          .map(Number);

      const dayStart =
        new Date(startDateTime);

      dayStart.setHours(
        wsH,
        wsM,
        0,
        0,
      );

      const dayEnd =
        new Date(startDateTime);

      dayEnd.setHours(
        weH,
        weM,
        0,
        0,
      );

      if (
        startDateTime < dayStart ||
        endDateTime > dayEnd
      ) {
        return {
          vendorId,
          available: false,
          reason:
            'Outside vendor working hours',
        };
      }
    }

    // ---------------------------------------------------------
    // 3. Maximum event duration
    //
    // Per-day max duration overrides the vendor-wide default.
    // ---------------------------------------------------------

    const requestedDurationMinutes =
      (endDateTime.getTime() -
        startDateTime.getTime()) /
      60000;

    const globalMaxDurations: number[] =
  Array.isArray(settings.maxEventDurationMinutes)
    ? settings.maxEventDurationMinutes
    : settings.maxEventDurationMinutes != null
      ? [settings.maxEventDurationMinutes]
      : [];

const dayMaxDurations: number[] =
  daySlotConfig &&
  Array.isArray(daySlotConfig.maxEventDurationMinutes)
    ? daySlotConfig.maxEventDurationMinutes
    : globalMaxDurations;

// If duration options are configured, the requested event
// must fit within at least one allowed duration option.
//
// Example:
// Vendor allows [120, 300, 480]
// Organizer requests 240 minutes
// → 300-minute option can accommodate it → AVAILABLE.
if (dayMaxDurations.length > 0) {
  const fitsAllowedDuration = dayMaxDurations.some(
    (maxDuration) =>
      requestedDurationMinutes <= maxDuration,
  );

  if (!fitsAllowedDuration) {
    const sortedDurations = [...dayMaxDurations].sort(
      (a, b) => a - b,
    );

    return {
      vendorId,
      available: false,
      reason: `This vendor accepts events up to ${sortedDurations[sortedDurations.length - 1]} minutes long for the selected day`,
    };
  }
}

    // ---------------------------------------------------------
    // 4. Blocked dates
    // ---------------------------------------------------------

    const key =
      toDateKey(startDateTime);

    if (
      blockedDates.some(
        (d) => toDateKey(d) === key,
      )
    ) {
      return {
        vendorId,
        available: false,
        reason:
          'Vendor has blocked this date',
      };
    }

    // ---------------------------------------------------------
    // 5. Minimum advance booking time
    // ---------------------------------------------------------
      if (advanceNoticeOptionsMinutes.length > 0) {
  const now = new Date();

  const minutesUntilEvent =
    (startDateTime.getTime() - now.getTime()) /
    60000;

  // Booking is allowed if at least one of the vendor's
  // configured notice options is satisfied.
  //
  // Example:
  // Vendor options: 3h, 6h, 12h
  // Event is 5h away
  //
  // 3h option is satisfied → booking allowed.
  const bookingAllowed = advanceNoticeOptionsMinutes.some(
    (noticeMinutes) =>
      minutesUntilEvent >= noticeMinutes,
  );

  if (!bookingAllowed) {
    const sortedNoticeOptions = [
      ...advanceNoticeOptionsMinutes,
    ].sort((a, b) => a - b);

    const minimumNotice =
      sortedNoticeOptions[0];

    return {
      vendorId,
      available: false,
      reason: `Booking must be made at least ${minimumNotice} minutes before the event`,
    };
  }
}

    // ---------------------------------------------------------
    // 6. Existing bookings + capacity
    //
    // Only overlapping blocking statuses count.
    // ---------------------------------------------------------

    const overlapCount =
      await this.vendorOrderModel.countDocuments({
        vendorId:
          new Types.ObjectId(vendorId),

        status: {
          $in: BLOCKING_STATUSES,
        },

        eventStartDateTime: {
          $lt: endDateTime,
        },

        eventEndDateTime: {
          $gt: startDateTime,
        },
      });

    if (
      overlapCount >=
      maxConcurrentBookings
    ) {
      return {
        vendorId,
        available: false,
        reason:
          'This vendor is already booked for the selected time',
      };
    }

    // ---------------------------------------------------------
    // Available
    // ---------------------------------------------------------

    return {
      vendorId,
      available: true,
    };
  }

  async checkMany(
    vendorIds: string[],
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<AvailabilityResult[]> {
    return Promise.all(
      vendorIds.map((id) =>
        this.checkVendorAvailability(
          id,
          startDateTime,
          endDateTime,
        ),
      ),
    );
  }

  /**
   * Vendor-facing calendar:
   * booked / pending / available slots for one day.
   */
  async getDaySlots(
    vendorId: string,
    dateStr: string,
  ) {
    const vendor = await this.userModel
      .findById(vendorId)
      .select('availabilitySettings role')
      .lean();

    if (!vendor || vendor.role !== 'Vendor') {
      throw new NotFoundException(
        'Vendor not found',
      );
    }

    const settings: any =
      vendor.availabilitySettings ?? {};

    // ---------------------------------------------------------
    // Selected day boundaries
    // ---------------------------------------------------------

    const dayStart =
      new Date(dateStr);

    dayStart.setHours(
      0,
      0,
      0,
      0,
    );

    const dayEnd =
      new Date(dateStr);

    dayEnd.setHours(
      23,
      59,
      59,
      999,
    );

    // ---------------------------------------------------------
    // Determine selected day code
    // ---------------------------------------------------------

    const dayCode =
      DAY_CODES[dayStart.getDay()];

    // ---------------------------------------------------------
    // Get configured working slots
    // ---------------------------------------------------------

    const daySlots: any[] =
      settings.daySlots ?? [];

    const daySlotConfig =
      daySlots.find(
        (day: any) =>
          day.day === dayCode,
      );

    // ---------------------------------------------------------
    // Working slots configured by vendor
    // ---------------------------------------------------------

    let workingSlots: Array<{
      start: string;
      end: string;
    }> = [];

    if (daySlotConfig) {
      // Explicit day configuration takes priority.

      if (daySlotConfig.enabled) {
        workingSlots =
          daySlotConfig.slots ?? [];
      }
    } else {
      // Backward-compatible legacy working hours.

      const workingHoursStart =
        settings.workingHoursStart ??
        '09:00';

      const workingHoursEnd =
        settings.workingHoursEnd ??
        '18:00';

      workingSlots = [
        {
          start: workingHoursStart,
          end: workingHoursEnd,
        },
      ];
    }

    // ---------------------------------------------------------
    // Maximum event duration
    //
    // Per-day value overrides vendor-wide default.
    // ---------------------------------------------------------

    const maxEventDurationMinutes =
  daySlotConfig &&
  Array.isArray(daySlotConfig.maxEventDurationMinutes)
    ? daySlotConfig.maxEventDurationMinutes
    : Array.isArray(settings.maxEventDurationMinutes)
      ? settings.maxEventDurationMinutes
      : settings.maxEventDurationMinutes != null
        ? [settings.maxEventDurationMinutes]
        : [];

    // ---------------------------------------------------------
    // Existing bookings for this day
    // ---------------------------------------------------------

    const bookings =
      await this.vendorOrderModel.find({
        vendorId:
          new Types.ObjectId(vendorId),

        status: {
          $in: BLOCKING_STATUSES,
        },

        eventStartDateTime: {
          $lt: dayEnd,
        },

        eventEndDateTime: {
          $gt: dayStart,
        },
      })
        .select(
          'eventStartDateTime eventEndDateTime status serviceName',
        )
        .lean();

   // ---------------------------------------------------------
// Return calendar information
// ---------------------------------------------------------
return {
  vendorId,
  date: dateStr,
  day: dayCode,

  enabled: daySlotConfig
    ? !!daySlotConfig.enabled
    : true,

  // Multiple event-duration options for this day.
  //
  // Example:
  // [120, 300, 480]
  //
  // = 2 hours, 5 hours, 8 hours.
  maxEventDurationMinutes,

  // Multiple advance-booking notice options.
  //
  // Example:
  // [180, 360, 720]
  //
  // = 3 hours, 6 hours, 12 hours before event.
  advanceNoticeOptionsMinutes:
    Array.isArray(
      settings.advanceNoticeOptionsMinutes,
    )
      ? settings.advanceNoticeOptionsMinutes
      : settings.minimumAdvanceMinutes != null
        ? [settings.minimumAdvanceMinutes]
        : [],

  workingSlots,

  bookings: bookings.map((b) => ({
    start: b.eventStartDateTime,
    end: b.eventEndDateTime,
    status: b.status,
    serviceName: b.serviceName,
  })),
};
  }
}