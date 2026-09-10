// fyp-mobile/services/getSubscriptionHistory.ts

import { growthApi } from './growthApiClient';

import {
  VendorSubscription,
} from '../types/subscription.types';

export async function getSubscriptionHistory(
  vendorId: string,
): Promise<VendorSubscription[]> {
  return growthApi.get<VendorSubscription[]>(
    `/vendor/growth/subscription/history/${vendorId}`,
  );
}