export type Currency = 'PKR' | 'USD';

// Missing snapshots belong to the original PKR-only application.
// Never infer historical money from today's profile or event location.
export function currencyOf(value?: unknown): Currency {
  return (typeof value === 'string' ? value : value && typeof value === 'object' && 'currency' in value ? value.currency : undefined) === 'USD' ? 'USD' : 'PKR';
}
export function countryCurrency(country?: string | null): Currency {
  return country === 'US' ? 'USD' : 'PKR';
}
export function currencySymbol(value?: unknown): string {
  return currencyOf(value) === 'USD' ? '$' : 'Rs.';
}
export function formatMoney(amount: number, value?: unknown): string {
  const currency = currencyOf(value);
  return currencySymbol(currency) + ' ' + Number(amount || 0).toLocaleString(currency === 'USD' ? 'en-US' : 'en-PK', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2,
  });
}

export function currencyMatch(value: Currency) {
  return { $expr: { $eq: [{ $ifNull: ['$currency', 'PKR'] }, value] } };
}
export function roundMoney(amount: number): number { return Math.round((amount + Number.EPSILON) * 100) / 100; }

export function roundForCurrency(amount: number, value?: unknown): number {
  return currencyOf(value) === 'USD' ? roundMoney(amount) : Math.round(amount);
}

export function formatMoneyTotals<T>(records: T[], amount: (record: T) => number): string {
  const totals: Partial<Record<Currency, number>> = {};
  for (const record of records) {
    const currency = currencyOf(record);
    totals[currency] = (totals[currency] || 0) + Number(amount(record) || 0);
  }
  return Object.entries(totals).map(([currency, total]) => formatMoney(total, currency)).join(' · ') || formatMoney(0);
}
