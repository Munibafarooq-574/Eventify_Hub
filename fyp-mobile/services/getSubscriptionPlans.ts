// fyp-mobile/services/getSubscriptionPlans.ts
import { growthApi } from './growthApiClient';
import { PlanDefinition } from '../types/subscription.types';

export async function getSubscriptionPlans(): Promise<PlanDefinition[]> {
  return growthApi.get<PlanDefinition[]>('/vendor/growth/subscription/plans');
}