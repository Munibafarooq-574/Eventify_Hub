// fyp-mobile/services/trackVendorView.ts
import { growthApi } from './growthApiClient';

export async function trackVendorView(
  vendorId: string,
  packageId?: string,
  source: 'organic' | 'sponsored' = 'organic',
): Promise<void> {
  await growthApi.post('/vendor/growth/analytics/track-view', {
    vendorId,
    packageId,
    source,
  });
}