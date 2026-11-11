import { growthApi } from './growthApiClient';

export function getEligibleCoupons(
  vendorId: string,
  options: { packageId?: string; includePackagePrices?: boolean; durationMinutes?: number } = {},
) {
  const query = new URLSearchParams();
  if (options.packageId) query.set('packageId', options.packageId);
  if (options.includePackagePrices) query.set('includePackagePrices', 'true');
  if (options.durationMinutes !== undefined) query.set('durationMinutes', String(options.durationMinutes));
  const params = query.toString();
  return growthApi.get<unknown>(
    `/vendor/growth/discount/coupon/eligible/${encodeURIComponent(vendorId)}${params ? `?${params}` : ''}`,
  );
}
