// fyp-mobile/services/cancelSubscription.ts
import { growthApi } from './growthApiClient';
import { VendorSubscription } from '../types/subscription.types';

export async function cancelSubscription(
  vendorId: string,
  reason?: string,
): Promise<VendorSubscription> {
  return growthApi.post<VendorSubscription>(
    `/vendor/growth/subscription/cancel?vendorId=${vendorId}`,
    reason ? { reason } : undefined,
  );
}