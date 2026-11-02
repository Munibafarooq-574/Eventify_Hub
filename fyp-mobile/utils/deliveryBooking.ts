export type DeliverySettings = {
  bookingType?: string;
  deliveryFeeType?: 'FREE' | 'PAID'; deliveryFee?: number; deliveryExtraWeightEnabled?: boolean;
  deliveryIncludedWeightKg?: number; deliveryExtraFeePerKg?: number; deliveryWeightKg?: number;
  deliveryWeightBasis?: 'PACKAGE' | 'PER_GUEST'; deliveryReserveMinutes?: number;
};
export const defaultDelivery: DeliverySettings = { deliveryFeeType: 'FREE', deliveryFee: 0, deliveryExtraWeightEnabled: false, deliveryReserveMinutes: 30, deliveryWeightBasis: 'PACKAGE' };
export function deliverySettings(pkg: DeliverySettings): DeliverySettings {
  const result:any = { ...defaultDelivery, ...pkg };
  for (const key of ['deliveryFee','deliveryReserveMinutes','deliveryIncludedWeightKg','deliveryExtraFeePerKg','deliveryWeightKg']) {
    const value = result[key]; result[key] = value == null || value === '' ? undefined : Number(value);
  }
  return Object.fromEntries(Object.keys({...defaultDelivery,deliveryIncludedWeightKg:0,deliveryExtraFeePerKg:0,deliveryWeightKg:0}).map(key=>[key,result[key]]));
}
export function deliverySettingsError(d: DeliverySettings) {
  if (!d.deliveryFeeType) return 'Choose a delivery option.';
  if (!Number.isSafeInteger(Number(d.deliveryReserveMinutes)) || Number(d.deliveryReserveMinutes) < 1 || Number(d.deliveryReserveMinutes) > 1440) return 'Reserve between 1 and 1440 minutes per delivery.';
  if (d.deliveryFeeType === 'FREE') return '';
  if (!(Number(d.deliveryFee) > 0)) return 'Enter the delivery fee.';
  if (d.deliveryExtraWeightEnabled && ![d.deliveryIncludedWeightKg,d.deliveryExtraFeePerKg,d.deliveryWeightKg].every(n => Number(n) > 0)) return 'Enter covered weight, extra fee and delivery weight.';
  return '';
}
export function deliveryFee(pkg: DeliverySettings, quantity = 1, guests = 1, isCatering = false) {
  if ((pkg.bookingType && pkg.bookingType !== 'DELIVERY_BASED') || pkg.deliveryFeeType !== 'PAID') return { baseFee:0, extraFee:0, weightKg:0, totalFee:0 };
  const weightKg = pkg.deliveryExtraWeightEnabled ? Number(pkg.deliveryWeightKg) * quantity * (isCatering ? guests : 1) : 0;
  const extraKg = pkg.deliveryExtraWeightEnabled ? Math.ceil(Math.max(0, Number((weightKg - Number(pkg.deliveryIncludedWeightKg)).toFixed(6)))) : 0;
  const baseFee = Number(pkg.deliveryFee || 0);
  const extraFee = Math.round(extraKg * Number(pkg.deliveryExtraFeePerKg || 0) * 100) / 100;
  return { baseFee, extraFee, weightKg, totalFee:baseFee + extraFee };
}
export function deliveryDateTime(value: string, timeZone: string) {
  return new Date(value).toLocaleString('en-GB', { timeZone, day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true });
}

export function deliveryWindowExample(start: number | undefined, end: number | undefined) {
  if (start == null || end == null || start > end) return '';
  const example = new Date('2026-11-09T17:00:00Z');
  const label = (minutes:number) => new Date(example.getTime()+minutes*60000).toLocaleString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true});
  return `For a 9 Nov event at 5:00 PM, customers can choose delivery between ${label(start)} and ${label(end)}.`;
}
