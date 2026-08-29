// fyp-mobile/services/getPremiumAnalytics.ts
import { growthApi } from './growthApiClient';
import { PremiumAnalytics } from '../types/analytics.types';

export async function getPremiumAnalytics(vendorId: string): Promise<PremiumAnalytics> {
  return growthApi.get<PremiumAnalytics>(`/vendor/growth/analytics/premium/${vendorId}`);
}