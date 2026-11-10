export type Currency = 'PKR' | 'USD';
let profileCurrency: Currency = 'PKR';
export function setProfileCurrency(country?: string | null) { profileCurrency = countryCurrency(country); }
export function currentCurrency(): Currency { return profileCurrency; }


// Missing snapshots belong to the original PKR-only application.
// Never infer historical money from today's profile or event location.
export function currencyOf(value?: unknown): Currency {
  return (typeof value === 'string' ? value : value && typeof value === 'object' && 'currency' in value ? value.currency : undefined) === 'USD' ? 'USD' : 'PKR';
}
export function countryCurrency(country?: string | null): Currency {
  return country === 'US' ? 'USD' : 'PKR';
}
export function currencySymbol(value?: unknown): string {
  return (value === undefined ? profileCurrency : currencyOf(value)) === 'USD' ? '$' : 'Rs.';
}
export function formatMoney(amount: number, value?: unknown): string {
  const currency = currencyOf(value);
  return currencySymbol(currency) + ' ' + Number(amount || 0).toLocaleString(currency === 'USD' ? 'en-US' : 'en-PK', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2,
  });
}

export function cartCurrencies(cart: any): Currency[] {
  return [...new Set<Currency>((cart?.vendors || []).flatMap((vendor: any) =>
    (vendor.packages || []).map((pkg: any) => currencyOf(pkg)),
  ))];
}
export function cartCurrency(cart: any): Currency {
  return cartCurrencies(cart)[0] || currentCurrency();
}
export function assertSingleCurrency(cart: any): void {
  if (cartCurrencies(cart).length > 1) throw new Error('Use one currency per booking. Remove packages in a different currency.');
}

export function roundMoney(amount: number): number { return Math.round((amount + Number.EPSILON) * 100) / 100; }

export function roundForCurrency(amount: number, value?: unknown): number {
  return currencyOf(value) === 'USD' ? roundMoney(amount) : Math.round(amount);
}
