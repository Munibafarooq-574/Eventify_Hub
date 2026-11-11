import { BadRequestException } from '@nestjs/common';
import { roundForCurrency, type Currency } from './currency';
import type { Package } from '../../schemas/user.schema';

export const PRICING_METHODS = ['FIXED', 'PER_PERSON', 'GROUP'] as const;
export type PricingMethod = typeof PRICING_METHODS[number];
export type PackagePricing = { pricingMethod?: PricingMethod; groupSize?: number | null };
type CategoryPricing = { allowedPricingMethods?: PricingMethod[]; businessDetailsType?: string; normalizedName?: string; name?: string };

export function legacyPricingMethod(category?: CategoryPricing | null): PricingMethod {
  return category?.businessDetailsType === 'CATERING' ||
    String(category?.normalizedName || category?.name || '').toLowerCase().includes('catering')
    ? 'PER_PERSON' : 'FIXED';
}

export function allowedPricingMethods(category?: CategoryPricing | null): PricingMethod[] {
  return category?.allowedPricingMethods ?? [legacyPricingMethod(category)];
}

export function validatePackagePricing(pkg: PackagePricing, category: CategoryPricing | null, existing?: PackagePricing) {
  const method = pkg.pricingMethod ?? legacyPricingMethod(category);
  const unchanged = existing && method === (existing.pricingMethod ?? legacyPricingMethod(category));
  if (!PRICING_METHODS.includes(method) || (!unchanged && !allowedPricingMethods(category).includes(method))) {
    throw new BadRequestException('Choose a pricing method allowed for your category.');
  }
  if (method === 'GROUP' && (!Number.isSafeInteger(pkg.groupSize) || Number(pkg.groupSize) < 1)) {
    throw new BadRequestException('Enter the number of people included in one group package.');
  }
  return { pricingMethod: method, groupSize: method === 'GROUP' ? pkg.groupSize! : null };
}

export function quotePackage(pkg: PackagePricing, unitPrice: number, quantity: number, persons: number) {
  const method = pkg.pricingMethod ?? 'FIXED';
  if (!PRICING_METHODS.includes(method) || !Number.isFinite(unitPrice) || unitPrice < 0 ||
      !Number.isSafeInteger(quantity) || quantity < 1) {
    throw new BadRequestException('Invalid package price or quantity.');
  }
  if (method === 'PER_PERSON' && (!Number.isSafeInteger(persons) || persons < 1)) {
    throw new BadRequestException('Enter a whole number of people for this package.');
  }
  if (method === 'GROUP' && (!Number.isSafeInteger(pkg.groupSize) || Number(pkg.groupSize) < 1)) {
    throw new BadRequestException('This group package needs a valid serving size.');
  }
  return {
    pricingMethod: method,
    groupSize: method === 'GROUP' ? pkg.groupSize! : null,
    personCount: method === 'PER_PERSON' ? persons : null,
    packageAmount: Number((unitPrice * quantity * (method === 'PER_PERSON' ? persons : 1)).toFixed(2)),
  };
}

export function resolvePackageUnitPrice(
  packageDoc: Package,
  selectedDurationMinutes: number,
  currency: Currency,
): number {
  if (packageDoc.bookingType !== 'DURATION_BASED') return Number(packageDoc.price);

  const tiers = (packageDoc.durations ?? []).map(option => ({
    minutes: Number(option.value) * (option.unit === 'DAYS' ? 1440 : 60),
    price: Number(option.price),
  }));
  const included = Number(packageDoc.baseIncludedDurationMinutes);
  const basePrice = Number(packageDoc.price);
  const hasIncluded = Number.isFinite(included) && included > 0;
  const exact = tiers.find(tier => tier.minutes === selectedDurationMinutes);

  if (hasIncluded && selectedDurationMinutes === included) return basePrice;
  if (exact) return exact.price;
  if (!packageDoc.allowCustomDuration) {
    if (!hasIncluded) return basePrice;
    throw new BadRequestException('This duration is not offered by the vendor');
  }

  const unitMinutes = packageDoc.customDurationUnit === 'DAYS' ? 1440 :
    packageDoc.customDurationUnit === 'HOURS' ? 60 : 0;
  const rate = Number(packageDoc.customDurationRate);
  if (!unitMinutes || !Number.isFinite(rate) || rate <= 0) {
    throw new BadRequestException('Package custom duration pricing is invalid');
  }

  if (!hasIncluded) {
    // Legacy custom rates cover the full duration.
    if (selectedDurationMinutes % unitMinutes !== 0) {
      throw new BadRequestException('Package custom duration pricing is invalid');
    }
    return (selectedDurationMinutes / unitMinutes) * rate;
  }

  if (selectedDurationMinutes < included) {
    if (selectedDurationMinutes % unitMinutes !== 0) {
      throw new BadRequestException('Select a duration in whole units of the vendor’s custom rate.');
    }
    return roundForCurrency(Math.min(basePrice, rate * selectedDurationMinutes / unitMinutes), currency);
  }

  const sortedTiers = [{ minutes: included, price: basePrice }, ...tiers]
    .sort((a, b) => a.minutes - b.minutes);
  const lower = [...sortedTiers].reverse().find(tier => tier.minutes < selectedDurationMinutes);
  const upper = sortedTiers.find(tier => tier.minutes > selectedDurationMinutes);
  if (!lower) {
    throw new BadRequestException('Duration is below the package minimum');
  }
  const calculated = basePrice + rate * (selectedDurationMinutes - included) / unitMinutes;
  return roundForCurrency(Math.max(lower.price, upper ? Math.min(calculated, upper.price) : calculated), currency);
}
