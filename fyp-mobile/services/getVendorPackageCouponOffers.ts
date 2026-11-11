import { DiscountKind, type VendorDiscount } from '@/types/discount.types';
import { currencyOf, currencySymbol } from '@/utils/currency';
import { growthApi } from './growthApiClient';

interface PackagePricePreview {
  currency: 'USD' | 'PKR';
  originalPrice: number;
  finalAmount: number;
}

type PublicCoupon = VendorDiscount & {
  packagePricePreviews?: Record<string, PackagePricePreview>;
};

export async function getVendorPackageCouponOffers(vendorId: string): Promise<PublicCoupon[]> {
  try {
    const coupons = await growthApi.get<PublicCoupon[]>(
      `/vendor/growth/discount/coupon/public/${encodeURIComponent(vendorId)}?includePackagePrices=true`,
    );
    return Array.isArray(coupons) ? coupons : [];
  } catch {
    // Coupons are optional for the vendor's package views.
    return [];
  }
}

export function getPackageCouponOffer(
  coupons: PublicCoupon[],
  pkg: { _id: string; price?: number },
) {
  const packageId = String(pkg._id);
  const coupon = coupons.find(entry => entry.packageIds?.length
    ? entry.packageIds.includes(packageId)
    : !entry.packageId || entry.packageId === packageId);
  if (!coupon) return null;

  const currency = currencyOf(pkg);
  const preview = coupon.packagePricePreviews?.[packageId];
  const price = preview?.currency === currency && preview.originalPrice === Number(pkg.price) &&
    Number.isFinite(preview.finalAmount) && preview.finalAmount >= 0 && preview.finalAmount < preview.originalPrice
    ? preview : null;
  const discount = Number(coupon.discountValue).toLocaleString(undefined, { maximumFractionDigits: 2 });

  return {
    label: coupon.discountType === DiscountKind.PERCENTAGE
      ? `${discount}% OFF` : `${currencySymbol(currency)} ${discount} OFF`,
    price,
  };
}
