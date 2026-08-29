// fyp-mobile/services/getBusinessInsights.ts
import { growthApi } from './growthApiClient';
import { BusinessInsight } from '../types/analytics.types';

export async function getBusinessInsights(vendorId: string): Promise<BusinessInsight[]> {
  return growthApi.get<BusinessInsight[]>(`/vendor/growth/analytics/insights/${vendorId}`);
}