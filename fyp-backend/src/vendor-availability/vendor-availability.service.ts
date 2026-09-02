
//fyp-backend/src/vendor-availability/vendor-availability.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from 'src/schemas/user.schema';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { SetAvailabilityDto } from './dto/set-availability.dto';

const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
// Statuses that actively hold a slot. Rejected/cancelled release it (req #11).
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
    @InjectModel(User.name) private readonly userModel: Model<User>,
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

  async setAvailability(vendorId: string, dto: SetAvailabilityDto) {
    const user = await this.userModel.findById(vendorId);
    if (!user || user.role !== 'Vendor') {
      throw new NotFoundException('Vendor not found');
    }

    const current = (user.availabilitySettings as any)?.toObject?.()
      ?? user.availabilitySettings
      ?? {};

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
   * Core check. Reused by: organizer search, order creation (backend guard),
   * and the vendor calendar view.
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
      return { vendorId, available: false, reason: 'Vendor not found' };
    }

    const settings: any = vendor.availabilitySettings ?? {};
    const workingDays = settings.workingDays ?? [];
    const workingHoursStart = settings.workingHoursStart ?? '09:00';
    const workingHoursEnd = settings.workingHoursEnd ?? '18:00';
    const blockedDates: Date[] = settings.blockedDates ?? [];
    const minimumAdvanceMinutes = settings.minimumAdvanceMinutes ?? 0;
    const maxConcurrentBookings = settings.maxConcurrentBookings ?? 1;

    // 1. Working day
    const dayCode = DAY_CODES[startDateTime.getDay()];
    const workingDay = workingDays.find((d: any) => d.day === dayCode);
    if (workingDays.length > 0 && (!workingDay || !workingDay.enabled)) {
      return {
        vendorId,
        available: false,
        reason: 'Vendor is not working on the selected day',
      };
    }

    // 2. Working hours must cover the ENTIRE requested range
    const [wsH, wsM] = workingHoursStart.split(':').map(Number);
    const [weH, weM] = workingHoursEnd.split(':').map(Number);
    const dayStart = new Date(startDateTime);
    dayStart.setHours(wsH, wsM, 0, 0);
    const dayEnd = new Date(startDateTime);
    dayEnd.setHours(weH, weM, 0, 0);
    if (startDateTime < dayStart || endDateTime > dayEnd) {
      return {
        vendorId,
        available: false,
        reason: 'Outside vendor working hours',
      };
    }

    // 3. Blocked dates
    const key = toDateKey(startDateTime);
    if (blockedDates.some((d) => toDateKey(d) === key)) {
      return {
        vendorId,
        available: false,
        reason: 'Vendor has blocked this date',
      };
    }

    // 4. Minimum advance booking time
    if (minimumAdvanceMinutes > 0) {
      const deadline = new Date(
        startDateTime.getTime() - minimumAdvanceMinutes * 60000,
      );
      if (new Date() > deadline) {
        return {
          vendorId,
          available: false,
          reason: 'Booking deadline has passed for this vendor',
        };
      }
    }

    // 5/6. Existing + pending bookings & capacity (overlap check)
    const overlapCount = await this.vendorOrderModel.countDocuments({
      vendorId: new Types.ObjectId(vendorId),
      status: { $in: BLOCKING_STATUSES },
      eventStartDateTime: { $lt: endDateTime },
      eventEndDateTime: { $gt: startDateTime },
    });

    if (overlapCount >= maxConcurrentBookings) {
      return {
        vendorId,
        available: false,
        reason: 'This vendor is already booked for the selected time',
      };
    }

    return { vendorId, available: true };
  }

  async checkMany(
    vendorIds: string[],
    startDateTime: Date,
    endDateTime: Date,
  ): Promise<AvailabilityResult[]> {
    return Promise.all(
      vendorIds.map((id) =>
        this.checkVendorAvailability(id, startDateTime, endDateTime),
      ),
    );
  }

  /** Vendor-facing calendar: booked/pending/available slots for one day. */
  async getDaySlots(vendorId: string, dateStr: string) {
    const dayStart = new Date(dateStr);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr);
    dayEnd.setHours(23, 59, 59, 999);

    const bookings = await this.vendorOrderModel
      .find({
        vendorId: new Types.ObjectId(vendorId),
        status: { $in: BLOCKING_STATUSES },
        eventStartDateTime: { $lt: dayEnd },
        eventEndDateTime: { $gt: dayStart },
      })
      .select('eventStartDateTime eventEndDateTime status serviceName')
      .lean();

    return bookings.map((b) => ({
      start: b.eventStartDateTime,
      end: b.eventEndDateTime,
      status: b.status,
      serviceName: b.serviceName,
    }));
  }
}