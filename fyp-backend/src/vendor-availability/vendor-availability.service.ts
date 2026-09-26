// fyp-backend/src/vendor-availability/vendor-availability.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User } from 'src/schemas/user.schema';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { FeatureAccessService } from 'src/vendor/growth/feature-access.service';

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
    private readonly featureAccessService: FeatureAccessService,
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

    const hasAccess = await this.featureAccessService.hasActiveSubscription(vendorId);

if (!hasAccess) {
  throw new ForbiddenException(
    'Subscription expired. Renew your plan to edit availability.',
  );
}

    // ---------------------------------------------------------
    // Phase 3 Step 3:
    // Backend final-authority validation for availability CRUD.
    // ---------------------------------------------------------

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    const validateTime = (value: string, fieldName: string) => {
      if (!timePattern.test(value)) {
        throw new BadRequestException(
          `${fieldName} must use HH:mm format`,
        );
      }
    };

    // Validate default working hours.
    if (dto.workingHoursStart !== undefined) {
      validateTime(dto.workingHoursStart, 'Working hours start');
    }

    if (dto.workingHoursEnd !== undefined) {
      validateTime(dto.workingHoursEnd, 'Working hours end');
    }

    if (
      dto.workingHoursStart !== undefined ||
      dto.workingHoursEnd !== undefined
    ) {
      const currentSettings: any =
        (user.availabilitySettings as any)?.toObject?.() ??
        user.availabilitySettings ??
        {};

      const start =
        dto.workingHoursStart ??
        currentSettings.workingHoursStart ??
        '09:00';

      const end =
        dto.workingHoursEnd ??
        currentSettings.workingHoursEnd ??
        '18:00';

      validateTime(start, 'Working hours start');
      validateTime(end, 'Working hours end');

      if (start >= end) {
        throw new BadRequestException(
          'Working hours start must be before working hours end',
        );
      }
    }

    // Validate every per-day custom slot.
    if (dto.daySlots !== undefined) {
      for (const dayConfig of dto.daySlots) {
        for (const slot of dayConfig.slots ?? []) {
          validateTime(slot.start, `${dayConfig.day} slot start`);
          validateTime(slot.end, `${dayConfig.day} slot end`);

          if (slot.start >= slot.end) {
            throw new BadRequestException(
              `${dayConfig.day}: slot start must be before slot end`,
            );
          }
        }

                // Reject duplicate or overlapping availability slots
        // configured for the same day.
        const sortedSlots = [...(dayConfig.slots ?? [])].sort(
          (a, b) => a.start.localeCompare(b.start),
        );

        for (let i = 1; i < sortedSlots.length; i++) {
          const previousSlot = sortedSlots[i - 1];
          const currentSlot = sortedSlots[i];

          if (currentSlot.start < previousSlot.end) {
            throw new BadRequestException(
              `${dayConfig.day}: availability slots cannot overlap`,
            );
          }
        }

        const advanceOptions =
          dayConfig.advanceNoticeOptionsMinutes ?? [];

        for (const minutes of advanceOptions) {
          if (
            !Number.isInteger(minutes) ||
            minutes < 0
          ) {
            throw new BadRequestException(
              `${dayConfig.day}: advance notice must be zero or a positive whole number`,
            );
          }
        }
      }
    }

    // Validate global advance-notice options.
    if (dto.advanceNoticeOptionsMinutes !== undefined) {
      for (const minutes of dto.advanceNoticeOptionsMinutes) {
        if (
          !Number.isInteger(minutes) ||
          minutes < 0
        ) {
          throw new BadRequestException(
            'Advance notice must be zero or a positive whole number',
          );
        }
      }
    }

    if (
      dto.minimumAdvanceMinutes !== undefined &&
      (
        !Number.isInteger(dto.minimumAdvanceMinutes) ||
        dto.minimumAdvanceMinutes < 0
      )
    ) {
      throw new BadRequestException(
        'Minimum advance notice must be zero or a positive whole number',
      );
    }

    // Validate blocked dates and reject past dates.
    if (dto.blockedDates !== undefined) {
      const todayKey = new Date().toISOString().slice(0, 10);
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;

      for (const date of dto.blockedDates) {
        if (
          typeof date !== 'string' ||
          !datePattern.test(date)
        ) {
          throw new BadRequestException(
            'Blocked dates must use YYYY-MM-DD format',
          );
        }

        const parsedDate = new Date(`${date}T00:00:00.000Z`);

        if (
          Number.isNaN(parsedDate.getTime()) ||
          parsedDate.toISOString().slice(0, 10) !== date
        ) {
          throw new BadRequestException(
            `Invalid blocked date: ${date}`,
          );
        }

        if (date < todayKey) {
          throw new BadRequestException(
            `Blocked date cannot be in the past: ${date}`,
          );
        }
      }
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
    packageId?: string,
   ): Promise<AvailabilityResult> {
    // ---------------------------------------------------------
    // Phase 3 Step 4:
    // Validate the requested availability range first.
    // This remains the single backend availability authority.
    // ---------------------------------------------------------

    const requestedStart = new Date(startDateTime);
    const requestedEnd = new Date(endDateTime);

    if (
      Number.isNaN(requestedStart.getTime()) ||
      Number.isNaN(requestedEnd.getTime())
    ) {
      return {
        vendorId,
        available: false,
        reason: 'Invalid booking date/time',
      };
    }

    if (requestedStart >= requestedEnd) {
      return {
        vendorId,
        available: false,
        reason: 'Booking start time must be before end time',
      };
    }

    if (requestedStart.getTime() < Date.now()) {
      return {
        vendorId,
        available: false,
        reason: 'Booking date/time cannot be in the past',
      };
    }

    startDateTime = requestedStart;
    endDateTime = requestedEnd;

    const vendor = await this.userModel
      .findById(vendorId)
      .select('availabilitySettings role packages')
      .lean();

    if (!vendor || vendor.role !== 'Vendor') {
      return {
        vendorId,
        available: false,
        reason: 'Vendor not found',
      };
    }



        // ---------------------------------------------------------
    // Phase 3 Step 2:
    // Resolve the availability range from the existing
    // Phase 2 package booking configuration.
    //
    // No packageId = keep existing vendor-level behavior.
    // ---------------------------------------------------------

    if (packageId) {
      const packages: any[] = (vendor as any).packages ?? [];

      const selectedPackage = packages.find(
        (pkg: any) =>
          String(pkg._id) === String(packageId),
      );

      if (!selectedPackage) {
        return {
          vendorId,
          available: false,
          reason: 'Package not found for this vendor',
        };
      }

      const bookingType = selectedPackage.bookingType;

      switch (bookingType) {
                case 'DURATION_BASED': {
          const requestedDurationMinutes =
            (endDateTime.getTime() - startDateTime.getTime()) /
            60000;

          const durations: any[] =
            Array.isArray(selectedPackage.durations)
              ? selectedPackage.durations
              : [];

          const matchesFixedDuration = durations.some(
            (duration: any) => {
              const value = Number(duration.value);

              if (!Number.isFinite(value) || value <= 0) {
                return false;
              }

              const durationMinutes =
                duration.unit === 'DAYS'
                  ? value * 24 * 60
                  : duration.unit === 'HOURS'
                    ? value * 60
                    : null;

              return durationMinutes === requestedDurationMinutes;
            },
          );

          if (
            durations.length > 0 &&
            !matchesFixedDuration &&
            !selectedPackage.allowCustomDuration
          ) {
            return {
              vendorId,
              available: false,
              reason:
                'Requested duration is not supported by this package',
            };
          }

          if (
            durations.length === 0 &&
            !selectedPackage.allowCustomDuration
          ) {
            // Backward compatibility:
            // legacy duration-based packages may not have duration
            // options configured yet, so keep their existing behavior.
            break;
          }

          if (
            !matchesFixedDuration &&
            selectedPackage.allowCustomDuration
          ) {
            const customUnit =
              selectedPackage.customDurationUnit;

            const customRate =
              selectedPackage.customDurationRate;

            if (
              (customUnit !== 'HOURS' &&
                customUnit !== 'DAYS') ||
              typeof customRate !== 'number' ||
              !Number.isFinite(customRate) ||
              customRate < 0
            ) {
              return {
                vendorId,
                available: false,
                reason:
                  'Package does not have valid custom duration configuration',
              };
            }

            const unitMinutes =
              customUnit === 'DAYS'
                ? 24 * 60
                : 60;

            if (
              requestedDurationMinutes <= 0 ||
              requestedDurationMinutes % unitMinutes !== 0
            ) {
              return {
                vendorId,
                available: false,
                reason:
                  `Requested duration must be in whole ${customUnit.toLowerCase()}`,
              };
            }
          }

          break;
        }

        case 'TIME_SLOT_BASED': {
          const requiredDuration =
            selectedPackage.requiredServiceDurationMinutes;

          if (
            typeof requiredDuration !== 'number' ||
            !Number.isFinite(requiredDuration) ||
            requiredDuration <= 0
          ) {
            return {
              vendorId,
              available: false,
              reason:
                'Package does not have a valid required service duration',
            };
          }

          endDateTime = new Date(
            startDateTime.getTime() +
              requiredDuration * 60000,
          );

          break;
        }

        case 'DELIVERY_BASED':
        case 'SETUP_BASED':
        case 'CUSTOM': {
          const startOffset =
            selectedPackage.serviceWindowStartOffsetMinutes;

          const endOffset =
            selectedPackage.serviceWindowEndOffsetMinutes;

          if (
            typeof startOffset !== 'number' ||
            !Number.isFinite(startOffset) ||
            typeof endOffset !== 'number' ||
            !Number.isFinite(endOffset) ||
            startOffset > endOffset
          ) {
            return {
              vendorId,
              available: false,
              reason:
                'Package does not have a valid service window',
            };
          }

          const eventStart = new Date(startDateTime);

          startDateTime = new Date(
            eventStart.getTime() +
              startOffset * 60000,
          );

          endDateTime = new Date(
            eventStart.getTime() +
              endOffset * 60000,
          );

          break;
        }

        default:
          // Backward compatibility for old packages that do not
          // yet have bookingType.
          break;
      }
    }

    const settings: any = vendor.availabilitySettings ?? {};

    const workingDays = settings.workingDays ?? [];

    const workingHoursStart =
      settings.workingHoursStart ?? '09:00';

    const workingHoursEnd =
      settings.workingHoursEnd ?? '18:00';

    const blockedDates: Date[] =
      settings.blockedDates ?? [];

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

    const advanceNoticeOptionsMinutes: number[] =
      daySlotConfig &&
      Array.isArray(daySlotConfig.advanceNoticeOptionsMinutes) &&
      daySlotConfig.advanceNoticeOptionsMinutes.length > 0
        ? daySlotConfig.advanceNoticeOptionsMinutes
        : Array.isArray(settings.advanceNoticeOptionsMinutes) &&
          settings.advanceNoticeOptionsMinutes.length > 0
        ? settings.advanceNoticeOptionsMinutes
        : settings.minimumAdvanceMinutes != null
          ? [settings.minimumAdvanceMinutes]
          : [];

    if (advanceNoticeOptionsMinutes.length > 0) {
  const now = new Date();

  const minutesUntilEvent =
    (startDateTime.getTime() - now.getTime()) /
    60000;

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
    packageId?: string,
  ): Promise<AvailabilityResult[]> {
    return Promise.all(
      vendorIds.map((id) =>
        this.checkVendorAvailability(
          id,
          startDateTime,
          endDateTime,
          packageId,
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

  // Multiple advance-booking notice options.
  //
  // Example:
  // [180, 360, 720]
  //
  // = 3 hours, 6 hours, 12 hours before event.
  advanceNoticeOptionsMinutes:
    daySlotConfig &&
    Array.isArray(daySlotConfig.advanceNoticeOptionsMinutes) &&
    daySlotConfig.advanceNoticeOptionsMinutes.length > 0
      ? daySlotConfig.advanceNoticeOptionsMinutes
      : Array.isArray(settings.advanceNoticeOptionsMinutes) &&
    settings.advanceNoticeOptionsMinutes.length > 0
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