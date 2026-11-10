export const PRICING_OPTIONS = [
  { value: 'FIXED', label: 'Fixed Package' },
  { value: 'PER_PERSON', label: 'Per Person' },
  { value: 'GROUP', label: 'Group Package' },
] as const;
export type PricingMethod = typeof PRICING_OPTIONS[number]['value'];
export type PackagePricing = { pricingMethod?: PricingMethod; groupSize?: number | null; personCount?: number | null };

export function pricingMethod(pkg: PackagePricing, legacyPerPerson = false): PricingMethod {
  return pkg.pricingMethod ?? (legacyPerPerson ? 'PER_PERSON' : 'FIXED');
}

export function packageAmount(pkg: PackagePricing & { price?: number; quantity?: number }, guests: number, legacyPerPerson = false) {
  const persons = Number(pkg.personCount ?? guests);
  return Number(pkg.price || 0) * Math.max(1, Number(pkg.quantity || 1)) *
    (pricingMethod(pkg, legacyPerPerson) === 'PER_PERSON' ? persons : 1);
}

export function pricingUnit(pkg: PackagePricing, legacyPerPerson = false) {
  const method = pricingMethod(pkg, legacyPerPerson);
  return method === 'PER_PERSON' ? 'per person' : method === 'GROUP' ? 'per group' : 'per package';
}

export function pricingTitle(pkg: PackagePricing, legacyPerPerson = false) {
  const method = pricingMethod(pkg, legacyPerPerson);
  const title = PRICING_OPTIONS.find(option => option.value === method)?.label || 'Fixed Package';
  return method === 'GROUP' && Number(pkg.groupSize) > 0
    ? `${title} · ${pkg.groupSize} people per group` : title;
}

export function pricingLabel(pkg: PackagePricing, legacyPerPerson = false) {
  const unit = pricingUnit(pkg, legacyPerPerson);
  return pricingMethod(pkg, legacyPerPerson) === 'GROUP' && Number(pkg.groupSize) > 0
    ? `${unit} · serves ${pkg.groupSize} people` : unit;
}

export function pricingFieldsError(pkg: PackagePricing) {
  return pkg.pricingMethod === 'GROUP' && (!Number.isSafeInteger(pkg.groupSize) || Number(pkg.groupSize) < 1)
    ? 'Enter the number of people included in one group package.' : '';
}
