//fyp-mobile/services/getVendorAvailability.ts
import { growthApi } from './growthApiClient';

export type VendorAvailabilityResponse = {
  vendorId: string;
  date?: string;
  day?: string;
  enabled?: boolean;

  maxEventDurationMinutes?: number[];

  advanceNoticeOptionsMinutes?: number[];

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