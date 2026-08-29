// fyp-mobile/services/getGrowthAnalytics.ts
import { growthApi } from './growthApiClient';
import { GrowthAnalytics } from '../types/analytics.types';

export async function getGrowthAnalytics(vendorId: string): Promise<GrowthAnalytics> {
  return growthApi.get<GrowthAnalytics>(`/vendor/growth/analytics/growth/${vendorId}`);
}