import { buildDeliveryCandidates, deliveryWindow } from '../common/utils/delivery-booking';
import { getVendorDownPaymentConfig, snapshotDownPaymentWindow } from '../common/utils/booking-payment-window';
// fyp-backend/src/vendor-availability/vendor-availability.service.ts

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import { RETIRED_PACKAGE_BOOKING_TYPE, User } from 'src/schemas/user.schema';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { FeatureAccessService } from 'src/vendor/growth/feature-access.service';

import { CityService } from '../city/city.service';
import { eventLocalToUtc } from '../common/utils/event-timezone';
import { SetAvailabilityDto } from './dto/set-availability.dto';
import { buildAppointmentCandidates } from './appointment-candidates';
import { minimumWorkingWindowMinutes, workingWindowMinutes } from './working-window';

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

  // Phase 7:
  // Final package-aware service window resolved by the existing
  // availability engine. Frontend must display this value instead
  // of recalculating availability/service timing.
  requiredServiceWindow?: {
    startDateTime: Date;
    endDateTime: Date;
  };

  // Phase 12: returned from the same authoritative overlap check.
  // Used only to enforce capacity across multiple items in one request.
  overlapCount?: number;
  maxConcurrentBookings?: number;
}

@Injectable()
export class VendorAvailabilityService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(VendorOrder.name)
    private readonly vendorOrderModel: Model<VendorOrder>,
    private readonly featureAccessService: FeatureAccessService,
    private readonly cityService: CityService,
  ) {}

  async getAvailability(vendorId: string) {
    const user = await this.userModel
      .findById(vendorId)
      .select('availabilitySettings role packages')
      .lean();

    if (!user || user.role !== 'Vendor') {
      throw new NotFoundException('Vendor not found');
    }

    return { ...(user.availabilitySettings ?? {}), minimumWorkingWindowMinutes: minimumWorkingWindowMinutes(user.packages as any[]) };
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

    const minimumWindow = minimumWorkingWindowMinutes(user.packages as any[]);
    const validateWindow = (start: string, end: string) => {
      if (workingWindowMinutes(start, end) < minimumWindow) {
        throw new BadRequestException(minimumWindow === 60 ? 'Working slot must be at least 1 hour.' : 'Working slot must be at least 1 minute.');
      }
    };
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
      validateWindow(start, end);
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
          if (dayConfig.enabled !== false) validateWindow(slot.start, slot.end);
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
            minutes < 1440 || minutes % 1440 !== 0
          ) {
            throw new BadRequestException(
              `${dayConfig.day}: booking notice must be a whole number of days (minimum 1 day)`,
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
          minutes < 1440 || minutes % 1440 !== 0
        ) {
          throw new BadRequestException(
            'Booking notice must be a whole number of days (minimum 1 day)',
          );
        }
      }
    }

    if (
      dto.minimumAdvanceMinutes !== undefined &&
      (
        !Number.isInteger(dto.minimumAdvanceMinutes) ||
        dto.minimumAdvanceMinutes < 1440 || dto.minimumAdvanceMinutes % 1440 !== 0
      )
    ) {
      throw new BadRequestException(
        'Minimum booking notice must be a whole number of days (minimum 1 day)',
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
    session?: ClientSession,
    excludeVendorOrderId?: string,
    replacementMode = false,
    eventTimeZone = 'UTC',
    deliverySelection?: { startDateTime: string | Date; configuration?: any },
    setupSelection?: { startDateTime: string | Date; endDateTime: string | Date },
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

    const vendorQuery = this.userModel
      .findById(vendorId)
      .select('availabilitySettings role packages businessCityId photographerBusinessDetails.downPayment photographerBusinessDetails.downPaymentType cateringBusinessDetails.downPayment cateringBusinessDetails.downPaymentType venueBusinessDetails.downPayment venueBusinessDetails.downPaymentType salonBusinessDetails.downPayment salonBusinessDetails.downPaymentType cakeBusinessDetails.downPayment cakeBusinessDetails.downPaymentType mehndiBusinessDetails.downPayment mehndiBusinessDetails.downPaymentType soundBusinessDetails.downPayment soundBusinessDetails.downPaymentType');

    if (session) {
      vendorQuery.session(session);
    }

    const vendor = await vendorQuery.lean();

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

            const bookingType = deliverySelection?.configuration ? 'DELIVERY_BASED' : selectedPackage.bookingType;


      // Preserve the original event/requested start because some package
      // booking types calculate their service window relative to event start.
      const eventStartDateTime = new Date(startDateTime);

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
            // Backward compatibility for legacy packages.
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

          // Required service window remains the requested event/package
          // start and duration.
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

          startDateTime = new Date(eventStartDateTime);

          endDateTime = new Date(
            eventStartDateTime.getTime() +
              requiredDuration * 60000,
          );

          break;
        }

        case 'DELIVERY_BASED': {
          const configuration = deliverySelection?.configuration || selectedPackage;
          if (!configuration.deliveryFeeType) {
            startDateTime = new Date(eventStartDateTime.getTime() + Number(configuration.serviceWindowStartOffsetMinutes) * 60000);
            endDateTime = new Date(eventStartDateTime.getTime() + Number(configuration.serviceWindowEndOffsetMinutes) * 60000);
            break;
          }
          if (!deliverySelection) {
            // Discovery checks all delivery dates, but never chooses a time for checkout.
            const earliest = new Date(eventStartDateTime.getTime() + Number(configuration.serviceWindowStartOffsetMinutes) * 60000);
            const latest = new Date(eventStartDateTime.getTime() + Number(configuration.serviceWindowEndOffsetMinutes) * 60000);
            const zone = await this.cityService.requireCityTimeZone(String((vendor as any).businessCityId));
            const localKey = (date: Date) => { const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(date).map(p => [p.type,p.value])); return `${parts.year}-${parts.month}-${parts.day}`; };
            if (!Number.isFinite(earliest.getTime()) || !Number.isFinite(latest.getTime()) || latest < earliest || latest.getTime() - earliest.getTime() > 31 * 86400000)
              return { vendorId, available: false, reason: 'Delivery window must cover no more than 31 days.' };
            const dates = new Set<string>();
            for (let t = Math.max(earliest.getTime(), Date.now()); t <= latest.getTime(); t += 86400000) dates.add(localKey(new Date(t)));
            dates.add(localKey(latest));
            for (const date of dates) {
              for (const slot of buildDeliveryCandidates(configuration, eventStartDateTime, date, zone).slots) {
                if (slot.startDateTime.getTime() <= Date.now()) continue;
                const result = await this.checkVendorAvailability(vendorId, eventStartDateTime, requestedEnd, packageId, session, excludeVendorOrderId, true, zone, { startDateTime: slot.startDateTime, configuration });
                if (result.available) return result;
              }
            }
            return { vendorId, available: false, reason: 'No delivery times are available. Please choose a later event time.' };
          }
          try {
            const window = deliveryWindow(configuration, eventStartDateTime, new Date(deliverySelection.startDateTime));
            startDateTime = window.startDateTime;
            endDateTime = window.endDateTime;
          } catch (error) { return { vendorId, available: false, reason: error.message }; }
          if (startDateTime.getTime() <= Date.now()) return { vendorId, available: false, reason: 'Delivery time has passed.' };
          // Delivery payments always need enough time, including normal checkout.
          replacementMode = true;
          break;
        }
        case 'SETUP_BASED': {
          const startOffset = selectedPackage.serviceWindowStartOffsetMinutes;
          const endOffset = selectedPackage.serviceWindowEndOffsetMinutes;
          const duration = selectedPackage.requiredServiceDurationMinutes;
          if (![startOffset, endOffset, duration].every((n) => Number.isSafeInteger(n)) ||
              startOffset > endOffset || startOffset > 0 || endOffset > 0 ||
              duration <= 0 || duration > endOffset - startOffset) {
            return { vendorId, available: false, reason: 'Setup must fit in a valid window ending no later than event start.' };
          }
          const earliest = eventStartDateTime.getTime() + startOffset * 60000;
          const latestEnd = eventStartDateTime.getTime() + endOffset * 60000;
          const durationMs = duration * 60000;
          if (setupSelection) {
            const selectedStart = new Date(setupSelection.startDateTime);
            const selectedEnd = new Date(setupSelection.endDateTime);
            if (!Number.isFinite(selectedStart.getTime()) || !Number.isFinite(selectedEnd.getTime()) ||
                selectedStart.getTime() < earliest || selectedEnd.getTime() > latestEnd ||
                selectedEnd.getTime() - selectedStart.getTime() !== durationMs) {
              return { vendorId, available: false, reason: 'Selected setup interval is outside the allowed window or has the wrong duration.' };
            }
            startDateTime = selectedStart;
            endDateTime = selectedEnd;
            break;
          }
          // Find a concrete duration-long interval, not the entire allowed window.
          // Each candidate passes the same working hours, blocked dates, notice and overlap checks.
          const stepMs = 15 * 60000;
          for (let candidate = earliest; candidate + durationMs <= latestEnd; candidate += stepMs) {
            if (candidate <= Date.now()) continue;
            const result = await this.checkVendorAvailability(
              vendorId, eventStartDateTime, requestedEnd, packageId, session,
              excludeVendorOrderId, replacementMode, eventTimeZone, undefined,
              { startDateTime: new Date(candidate), endDateTime: new Date(candidate + durationMs) },
            );
            if (result.available) return result;
          }
          // Always test the final exact boundary even when it is off the 15-minute grid.
          const lastStart = latestEnd - durationMs;
          if (lastStart >= earliest && lastStart > Date.now() &&
              (lastStart - earliest) % stepMs !== 0) {
            const result = await this.checkVendorAvailability(
              vendorId, eventStartDateTime, requestedEnd, packageId, session,
              excludeVendorOrderId, replacementMode, eventTimeZone, undefined,
              { startDateTime: new Date(lastStart), endDateTime: new Date(latestEnd) },
            );
            if (result.available) return result;
          }
          return { vendorId, available: false, reason: 'No available setup interval fits the allowed window.' };
        }
        case RETIRED_PACKAGE_BOOKING_TYPE: {
          // Existing bookings can still be rescheduled using their original window.
          if (!excludeVendorOrderId) {
            return { vendorId, available: false, reason: 'Package booking type is no longer available.' };
          }

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

          startDateTime = new Date(
            eventStartDateTime.getTime() +
              startOffset * 60000,
          );

          endDateTime = new Date(
            eventStartDateTime.getTime() +
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

    const vendorTimeZone = await this.cityService.requireCityTimeZone(String((vendor as any).businessCityId));
    const localParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: vendorTimeZone, year: 'numeric', month: '2-digit',
      day: '2-digit', weekday: 'short',
    }).formatToParts(startDateTime);
    const localMap = Object.fromEntries(localParts.map(p => [p.type, p.value]));
    const localDateKey = localMap.year + '-' + localMap.month + '-' + localMap.day;
    const localDayCode = localMap.weekday.toUpperCase().slice(0, 3);
    const localWindow = (time: string) => eventLocalToUtc(localDateKey, time, vendorTimeZone);
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
      localDayCode;

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
          const slotStart = localWindow(slot.start);
          const slotEnd = localWindow(slot.end);

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

      const dayStart = localWindow(workingHoursStart);
      const dayEnd = localWindow(workingHoursEnd);

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
    const key = localDateKey;

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

    // Legacy notice values below one day still require a full 24-hour minimum.
    const validNoticeOptions = advanceNoticeOptionsMinutes.filter(
      (minutes) => Number.isFinite(minutes) && minutes >= 1440,
    );
    const minimumNotice = validNoticeOptions.length > 0
      ? Math.min(...validNoticeOptions)
      : 1440;
    const minutesUntilService = (startDateTime.getTime() - Date.now()) / 60000;
    if (minutesUntilService < minimumNotice) {
      return {
        vendorId,
        available: false,
        reason: `Booking must be made at least ${minimumNotice / 1440} day(s) before the service starts`,
      };
    }

    // ---------------------------------------------------------
    // 6. Existing bookings + capacity
    //
    // Only overlapping blocking statuses count.
    // ---------------------------------------------------------

    const overlapFilter: any = {
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
      };

    if (excludeVendorOrderId && Types.ObjectId.isValid(excludeVendorOrderId)) {
      overlapFilter._id = { $ne: new Types.ObjectId(excludeVendorOrderId) };
    }

    const overlapQuery = this.vendorOrderModel.countDocuments(overlapFilter);

    if (session) {
      overlapQuery.session(session);
    }

    const overlapCount = await overlapQuery;

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

if (replacementMode && getVendorDownPaymentConfig(vendor)?.value !== 0) {
  try { snapshotDownPaymentWindow({ eventStartDateTime: startDateTime }, vendor.availabilitySettings, new Date(), eventTimeZone); }
  catch (error) { if (!(error instanceof ConflictException)) throw error; return { vendorId, available: false, reason: 'There is not enough time to book and prepare this service. Please choose a later time.' }; }
}
return {
  vendorId,
  available: true,

  // These are the FINAL package-aware dates after the existing
  // bookingType calculation above has been applied.
  requiredServiceWindow: {
    startDateTime,
    endDateTime,
  },
  overlapCount,
  maxConcurrentBookings,
};
  }

  /**
   * Read-only appointment discovery. All candidates are checked using the
   * existing authoritative availability engine; no duplicate availability rules.
   * The selected appointment still needs order-level persistence and revalidation.
   */
  async getAppointmentCandidates(
    vendorId: string,
    packageId: string,
    eventStart: Date,
    eventEnd: Date,
    eventTimeZone: string,
  ) {
    if (!Types.ObjectId.isValid(vendorId) || !Types.ObjectId.isValid(packageId)) {
      throw new BadRequestException('Invalid vendor or package identifier');
    }
    const vendor = await this.userModel.findById(vendorId).select('role packages').lean();
    if (!vendor || vendor.role !== 'Vendor') {
      throw new NotFoundException('Vendor not found');
    }
    const selectedPackage: any = (vendor.packages ?? []).find(
      (pkg: any) => String(pkg._id) === packageId,
    );
    if (!selectedPackage || selectedPackage.bookingType !== 'TIME_SLOT_BASED') {
      throw new BadRequestException('A Time Slot Based package is required');
    }
    const duration = selectedPackage.requiredServiceDurationMinutes;
    const candidates = buildAppointmentCandidates(eventStart, eventEnd, duration);
    const results = await Promise.all(candidates.map(async candidate => {
      const result = await this.checkVendorAvailability(
        vendorId,
        candidate.startDateTime,
        candidate.endDateTime,
        packageId,
        undefined,
        undefined,
        false,
        eventTimeZone,
      );
      return {
        startDateTime: candidate.startDateTime,
        endDateTime: candidate.endDateTime,
        available: result.available,
        reason: result.reason,
      };
    }));
    return { vendorId, packageId, durationMinutes: duration, slots: results };
  }

  // Setup choices use the same authoritative check as checkout; never infer availability on the client.
  async getSetupCandidates(vendorId: string, packageId: string, eventStart: Date, eventEnd: Date, timeZone: string) {
    if (!Types.ObjectId.isValid(vendorId) || !Types.ObjectId.isValid(packageId)) {
      throw new BadRequestException('Invalid vendor or package identifier');
    }
    const vendor = await this.userModel.findById(vendorId).select('role packages').lean();
    const pkg: any = (vendor?.packages ?? []).find((item: any) => String(item._id) === packageId);
    if (!vendor || vendor.role !== 'Vendor' || !pkg || pkg.isActive === false || pkg.bookingType !== 'SETUP_BASED') {
      throw new BadRequestException('Setup package unavailable');
    }
    const startOffset = pkg.serviceWindowStartOffsetMinutes;
    const endOffset = pkg.serviceWindowEndOffsetMinutes;
    const duration = pkg.requiredServiceDurationMinutes;
    if (![startOffset, endOffset, duration].every((n) => Number.isSafeInteger(n)) ||
        startOffset > endOffset || startOffset > 0 || endOffset > 0 ||
        duration <= 0 || duration > endOffset - startOffset || endOffset - startOffset > 31 * 1440) {
      throw new BadRequestException('Invalid setup duration or allowed window');
    }
    const earliest = eventStart.getTime() + startOffset * 60000;
    const latestEnd = eventStart.getTime() + endOffset * 60000;
    const durationMs = duration * 60000;
    const stepMs = 15 * 60000;
    const slots: Array<{ startDateTime: Date; endDateTime: Date; available: boolean; reason?: string }> = [];
    const addCandidate = async (start: number) => {
      const end = start + durationMs;
      if (start <= Date.now()) return;
      const result = await this.checkVendorAvailability(
        vendorId, eventStart, eventEnd, packageId, undefined, undefined, false, timeZone,
        undefined, { startDateTime: new Date(start), endDateTime: new Date(end) },
      );
      slots.push({
        startDateTime: new Date(start), endDateTime: new Date(end),
        available: result.available, reason: result.reason,
      });
    };
    // Bound the number of requests for very wide windows; keep the final deadline boundary.
    const maxCandidates = 128;
    for (let start = earliest; start + durationMs <= latestEnd && slots.length < maxCandidates; start += stepMs) {
      await addCandidate(start);
    }
    const lastStart = latestEnd - durationMs;
    if (lastStart >= earliest && (lastStart - earliest) % stepMs !== 0 &&
        !slots.some((slot) => slot.startDateTime.getTime() === lastStart)) {
      await addCandidate(lastStart);
    }
    return { vendorId, packageId, timeZone, durationMinutes: duration, slots };
  }

  async getDeliveryCandidates(vendorId: string, packageId: string, eventStart: Date, eventEnd: Date, timeZone: string, date?: string, excludeVendorOrderId?: string, configuration?: any) {
    if (!Types.ObjectId.isValid(vendorId) || !Types.ObjectId.isValid(packageId)) throw new BadRequestException('Invalid vendor or package.');
    const vendor = await this.userModel.findById(vendorId).select('role packages businessCityId').lean();
    const pkg: any = (vendor?.packages || []).find((p: any) => String(p._id) === packageId);
    if (!vendor || vendor.role !== 'Vendor' || !pkg || (!configuration && (pkg.isActive === false || pkg.bookingType !== 'DELIVERY_BASED'))) throw new BadRequestException('Delivery package unavailable.');
    const config = configuration || pkg;
    const candidates = buildDeliveryCandidates(config, eventStart, date, timeZone);
    const slots = await Promise.all(candidates.slots.map(async slot => {
      const result = await this.checkVendorAvailability(vendorId, eventStart, eventEnd, packageId, undefined, excludeVendorOrderId, true, timeZone, { startDateTime: slot.startDateTime, configuration: config });
      return { ...slot, available: result.available, reason: result.reason };
    }));
    return { vendorId, packageId, timeZone, eventStartDateTime: eventStart, earliest: candidates.earliest, latest: candidates.latest, date: candidates.date, slots };
  }

    async checkMany(
    vendorIds: string[],
    startDateTime: Date,
    endDateTime: Date,
    packageId?: string,
    replacementMode = false,
    eventTimeZone = 'UTC',
  ): Promise<AvailabilityResult[]> {
    return Promise.all(
      vendorIds.map((id) =>
        this.checkVendorAvailability(
          id,
          startDateTime,
          endDateTime,
          packageId, undefined, undefined, replacementMode, eventTimeZone,
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
      .select('availabilitySettings role businessCityId')
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

    // Interpret the selected calendar day in the vendor's business-city timezone.
    const vendorTimeZone = await this.cityService.requireCityTimeZone(
      String((vendor as any).businessCityId),
    );
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new BadRequestException('Calendar date must use YYYY-MM-DD');
    }
    const dayStart = eventLocalToUtc(dateStr, '00:00', vendorTimeZone);
    const [year, month, day] = dateStr.split('-').map(Number);
    const nextDay = new Date(Date.UTC(year, month - 1, day + 1))
      .toISOString().slice(0, 10);
    const dayEnd = eventLocalToUtc(nextDay, '00:00', vendorTimeZone);
    const dayCode = DAY_CODES[new Date(dateStr + 'T12:00:00.000Z').getUTCDay()];

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