// fyp-mobile/services/cancelSubscription.ts

import { growthApi } from './growthApiClient';

import {
  VendorSubscription,
} from '../types/subscription.types';

export async function cancelSubscription(
  reason?: string,
): Promise<VendorSubscription> {
  return growthApi.post<VendorSubscription>(
    '/vendor/growth/subscription/cancel',
    reason
      ? { reason }
      : {},
  );
}