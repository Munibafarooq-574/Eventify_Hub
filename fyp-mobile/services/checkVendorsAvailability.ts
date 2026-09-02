// fyp-mobile/services/checkVendorsAvailability.ts
import { growthApi } from './growthApiClient';

export interface AvailabilityCheckResult {
  vendorId: string;
  available: boolean;
  reason?: string;
}

export default function checkVendorsAvailability(payload: {
  vendorIds: string[];
  eventDate: string; // "2026-09-10"
  startTime: string; // "17:00"
  durationMinutes: number;
}) {
  return growthApi.post<AvailabilityCheckResult[]>('/vendor-availability/check', payload);
}