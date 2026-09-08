//fyp-mobile/services/getVendorAvailability.ts
import { growthApi } from './growthApiClient';

export type VendorAvailabilityResponse = {
  vendorId: string;

  date?: string;
  day?: string;
  enabled?: boolean;

  workingDays?: {
    day: string;
    enabled: boolean;
  }[];

  workingHoursStart?: string;
  workingHoursEnd?: string;

  daySlots?: {
    day: string;
    enabled: boolean;
    slots: {
      start: string;
      end: string;
    }[];
    maxEventDurationMinutes?: number[];
    advanceNoticeOptionsMinutes?: number[];
  }[];

  blockedDates?: string[];

  minimumAdvanceMinutes?: number;

  advanceNoticeOptionsMinutes?: number[];

  maxEventDurationMinutes?: number[];

  maxConcurrentBookings?: number;

  workingSlots?: {
    start: string;
    end: string;
  }[];

  bookings?: {
    start: string;
    end: string;
    status: string;
    serviceName?: string;
  }[];
};

export default function getVendorAvailability(vendorId: string) {
  return growthApi.get<VendorAvailabilityResponse>(
    `/vendor-availability/${vendorId}`,
  );
}