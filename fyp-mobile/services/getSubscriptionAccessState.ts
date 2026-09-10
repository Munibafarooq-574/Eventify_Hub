// fyp-mobile/services/getSubscriptionAccessState.ts

import { growthApi } from './growthApiClient';

import {
  SubscriptionAccessState,
} from '../types/subscription.types';

export async function getSubscriptionAccessState(
  vendorId: string,
): Promise<SubscriptionAccessState> {
  return growthApi.get<SubscriptionAccessState>(
    `/vendor/growth/subscription/access/${vendorId}`,
  );
}