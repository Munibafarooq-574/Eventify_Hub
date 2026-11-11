import { DiscountStatus, VendorDiscount } from '@/types/discount.types';

export type OccupyingOffer = {
  code: string;
  type: string;
};

/**
 * Vendor-facing availability hint. The backend always rechecks on creation.
 * Active All Packages offers occupy every package, including future packages.
 * Legacy single packageId offers are also supported.
 */
export function getOccupiedPromotionPackages(entries: VendorDiscount[]) {
  const occupied = new Map<string, OccupyingOffer>();
  let allPackagesOffer: OccupyingOffer | null = null;
  const now = Date.now();

  for (const entry of entries) {
    if (entry.status !== DiscountStatus.ACTIVE || new Date(entry.endDate).getTime() < now) continue;
    const offer = { code: entry.code, type: entry.type };
    const packageIds = entry.packageIds?.length
      ? entry.packageIds
      : entry.packageId ? [entry.packageId] : [];
    if (packageIds.length === 0) {
      allPackagesOffer = offer;
    } else {
      for (const id of packageIds) occupied.set(String(id), offer);
    }
  }
  return { occupied, allPackagesOffer };
}
