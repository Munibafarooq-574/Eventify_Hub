export type DeliveryWeightUnit = 'kg' | 'g' | 'lb' | 'oz';
export type DeliverySettings = {
  deliveryWeightUnit?: DeliveryWeightUnit;
  bookingType?: string;
  deliveryFeeType?: 'FREE' | 'PAID'; deliveryFee?: number; deliveryExtraWeightEnabled?: boolean;
  deliveryIncludedWeightKg?: number; deliveryExtraFeePerKg?: number; deliveryWeightKg?: number;
  deliveryWeightBasis?: 'PACKAGE' | 'PER_GUEST'; deliveryReserveMinutes?: number;
};
export const defaultDelivery: DeliverySettings = { deliveryWeightUnit:'kg', deliveryFeeType: 'FREE', deliveryFee: 0, deliveryExtraWeightEnabled: false, deliveryReserveMinutes: 30, deliveryWeightBasis: 'PACKAGE' };
export const DELIVERY_WEIGHT_UNITS = [
  { value:'kg', label:'Kilograms (kg)', kg:1 },
  { value:'g', label:'Grams (g)', kg:0.001 },
  { value:'lb', label:'Pounds (lb)', kg:0.45359237 },
  { value:'oz', label:'Ounces (oz)', kg:0.028349523125 },
] as const;
export const deliveryUnitKg = (unit: DeliveryWeightUnit = 'kg') => DELIVERY_WEIGHT_UNITS.find(u => u.value === unit)?.kg || 1;
export const displayDeliveryWeight = (kg: number, unit: DeliveryWeightUnit = 'kg') => Number((kg / deliveryUnitKg(unit)).toFixed(6));
export const displayDeliveryRate = (perKg: number, unit: DeliveryWeightUnit = 'kg') => Number((perKg * deliveryUnitKg(unit)).toFixed(6));
export function deliverySettings(pkg: DeliverySettings): DeliverySettings {
  const result:any = { ...defaultDelivery, ...pkg };
  for (const key of ['deliveryFee','deliveryReserveMinutes','deliveryIncludedWeightKg','deliveryExtraFeePerKg','deliveryWeightKg']) {
    const value = result[key]; result[key] = value == null || value === '' ? undefined : Number(value);
  }
  return Object.fromEntries(Object.keys({...defaultDelivery,deliveryIncludedWeightKg:0,deliveryExtraFeePerKg:0,deliveryWeightKg:0}).map(key=>[key,result[key]]));
}
export function deliverySettingsError(d: DeliverySettings) {
  if (!DELIVERY_WEIGHT_UNITS.some(u => u.value === (d.deliveryWeightUnit || 'kg'))) return 'Choose a delivery weight unit.';
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
  const unitKg = deliveryUnitKg(pkg.deliveryWeightUnit);
  const extraUnits = pkg.deliveryExtraWeightEnabled ? Math.ceil(Math.max(0, Number(((weightKg - Number(pkg.deliveryIncludedWeightKg)) / unitKg).toFixed(6)))) : 0;
  const baseFee = Number(pkg.deliveryFee || 0);
  const extraFee = Math.round(extraUnits * Number(pkg.deliveryExtraFeePerKg || 0) * unitKg * 100) / 100;
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
