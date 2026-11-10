import { BadRequestException } from '@nestjs/common';

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
