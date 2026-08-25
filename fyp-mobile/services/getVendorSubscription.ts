// fyp-mobile/services/getVendorSubscription.ts
import { growthApi } from './growthApiClient';
import { VendorSubscription } from '../types/subscription.types';

export async function getVendorSubscription(vendorId: string): Promise<VendorSubscription> {
  return growthApi.get<VendorSubscription>(`/vendor/growth/subscription/current/${vendorId}`);
}