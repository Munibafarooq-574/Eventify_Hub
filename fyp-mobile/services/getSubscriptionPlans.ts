// fyp-mobile/services/getSubscriptionPlans.ts
import { growthApi } from './growthApiClient';
import { PlanDefinition } from '../types/subscription.types';

export async function getSubscriptionPlans(vendorId: string): Promise<PlanDefinition[]> {
  return growthApi.get<PlanDefinition[]>(`/vendor/growth/subscription/plans?vendorId=${encodeURIComponent(vendorId)}`);
}