// fyp-mobile/services/checkVendorsAvailability.ts
import { growthApi } from './growthApiClient';

export interface AvailabilityCheckResult {
  vendorId: string;
  available: boolean;
  reason?: string;
}

export default function checkVendorsAvailability(
 payload: {
  vendorIds: string[];
  eventDate: string;
  startTime: string;
  durationMinutes: number;
  packageId?: string;
}
) {
  return growthApi.post<AvailabilityCheckResult[]>('/vendor-availability/check', payload);
}