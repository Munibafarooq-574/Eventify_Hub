import { BadRequestException } from '@nestjs/common';

export interface DeliveryConfiguration {
  deliveryWeightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  deliveryFeeType?: 'FREE' | 'PAID';
  deliveryFee?: number;
  deliveryExtraWeightEnabled?: boolean;
  deliveryIncludedWeightKg?: number;
  deliveryExtraFeePerKg?: number;
  deliveryWeightKg?: number;
  deliveryWeightBasis?: 'PACKAGE' | 'PER_GUEST';
  deliveryReserveMinutes?: number;
}
export const DELIVERY_FIELDS = ['deliveryWeightUnit', 'deliveryFeeType', 'deliveryFee', 'deliveryExtraWeightEnabled',
  'deliveryIncludedWeightKg', 'deliveryExtraFeePerKg', 'deliveryWeightKg',
  'deliveryWeightBasis', 'deliveryReserveMinutes'] as const;

export function deliveryUnitKg(unit = 'kg'): number {
  const factor = { kg:1, g:0.001, lb:0.45359237, oz:0.028349523125 }[unit];
  if (!factor) throw new BadRequestException('Choose kg, g, lb or oz for delivery weight.');
  return factor;
}
export function displayDeliveryWeight(kg: number, unit = 'kg'): number {
  return Number((kg / deliveryUnitKg(unit)).toFixed(6));
}

export function validateDeliveryConfiguration(pkg: DeliveryConfiguration) {
  deliveryUnitKg(pkg.deliveryWeightUnit);
  if (!pkg.deliveryFeeType) return; // Legacy packages retain their agreed price/window.
  if (!['FREE', 'PAID'].includes(pkg.deliveryFeeType)) throw new BadRequestException('Choose Free Delivery or Delivery Charges.');
  if (!Number.isSafeInteger(pkg.deliveryReserveMinutes) || pkg.deliveryReserveMinutes! < 1 || pkg.deliveryReserveMinutes! > 1440)
    throw new BadRequestException('Delivery reserve time must be between 1 and 1440 minutes.');
  if (pkg.deliveryFeeType === 'FREE') return;
  if (!Number.isFinite(pkg.deliveryFee) || pkg.deliveryFee! <= 0)
    throw new BadRequestException('Enter a delivery fee greater than zero.');
  if (pkg.deliveryExtraWeightEnabled && (
    !Number.isFinite(pkg.deliveryIncludedWeightKg) || pkg.deliveryIncludedWeightKg! <= 0 ||
    !Number.isFinite(pkg.deliveryExtraFeePerKg) || pkg.deliveryExtraFeePerKg! <= 0 ||
    !Number.isFinite(pkg.deliveryWeightKg) || pkg.deliveryWeightKg! <= 0 ||
    !['PACKAGE', 'PER_GUEST'].includes(pkg.deliveryWeightBasis || '')
  )) throw new BadRequestException('Enter the covered weight, extra fee and package or per-guest weight.');
}

export function quoteDelivery(pkg: DeliveryConfiguration, quantity = 1, guests = 1, isCatering = false) {
  validateDeliveryConfiguration(pkg);
  const paid = pkg.deliveryFeeType === 'PAID';
  const weighted = paid && pkg.deliveryExtraWeightEnabled;
  if (weighted && (isCatering ? pkg.deliveryWeightBasis !== 'PER_GUEST' : pkg.deliveryWeightBasis !== 'PACKAGE'))
    throw new BadRequestException(isCatering ? 'Set delivery weight per guest for this catering package.' : 'Set delivery weight per package.');
  const weightKg = weighted ? Number(pkg.deliveryWeightKg) * quantity * (isCatering ? guests : 1) : 0;
  const baseFee = paid ? Number(pkg.deliveryFee) : 0;
  const unitKg = deliveryUnitKg(pkg.deliveryWeightUnit);
  // Round before ceil so conversion noise never adds another billing unit.
  const extraUnits = weighted ? Math.ceil(Math.max(0, Number(((weightKg - Number(pkg.deliveryIncludedWeightKg)) / unitKg).toFixed(6)))) : 0;
  const extraFee = Math.round(extraUnits * Number(pkg.deliveryExtraFeePerKg || 0) * unitKg * 100) / 100;
  return { baseFee, extraFee, weightKg, totalFee: baseFee + extraFee };
}

export function deliveryWindow(pkg: any, eventStart: Date, selected: Date, reserveMinutes = pkg.deliveryReserveMinutes) {
  const earliest = eventStart.getTime() + Number(pkg.serviceWindowStartOffsetMinutes) * 60000;
  const latest = eventStart.getTime() + Number(pkg.serviceWindowEndOffsetMinutes) * 60000;
  const chosen = selected.getTime();
  if (![earliest, latest, chosen].every(Number.isFinite) || earliest > latest || chosen < earliest || chosen > latest ||
      !Number.isSafeInteger(reserveMinutes) || reserveMinutes < 1 || reserveMinutes > 1440)
    throw new BadRequestException('Choose a delivery time within the vendor’s allowed delivery window.');
  return { startDateTime: selected, endDateTime: new Date(chosen + reserveMinutes * 60000) };
}

export function buildDeliveryCandidates(pkg: any, eventStart: Date, dateKey?: string, timeZone = 'UTC') {
  const earliest = new Date(eventStart.getTime() + Number(pkg.serviceWindowStartOffsetMinutes) * 60000);
  const latest = new Date(eventStart.getTime() + Number(pkg.serviceWindowEndOffsetMinutes) * 60000);
  if (![earliest.getTime(), latest.getTime()].every(Number.isFinite) || earliest > latest)
    throw new BadRequestException('Invalid delivery window.');
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const key = (date: Date) => { const p = Object.fromEntries(formatter.formatToParts(date).map(v => [v.type,v.value])); return `${p.year}-${p.month}-${p.day}`; };
  const day = dateKey || key(new Date(Math.min(latest.getTime(), Math.max(earliest.getTime(), Date.now()))));
  // At most one local day per request, even for windows expressed in days.
  const cursorStart = Math.max(earliest.getTime(), new Date(`${day}T00:00:00Z`).getTime() - 86400000);
  const cursorEnd = Math.min(latest.getTime(), new Date(`${day}T00:00:00Z`).getTime() + 2 * 86400000);
  const times = new Set<number>();
  for (let t = Math.ceil(cursorStart / 1800000) * 1800000; t <= cursorEnd; t += 1800000) {
    if (key(new Date(t)) === day) times.add(t);
  }
  for (const t of [earliest.getTime(), latest.getTime(), ...[-60,-30,0].map(m => eventStart.getTime() + m * 60000)])
    if (t >= earliest.getTime() && t <= latest.getTime() && key(new Date(t)) === day) times.add(t);
  return { earliest, latest, date: day, slots: [...times].sort((a,b) => a-b).map(t => deliveryWindow(pkg, eventStart, new Date(t))) };
}

export function deliveryDescription(booking: any): string {
  if (!booking?.delivery) return '';
  const d = booking.delivery;
  const time = new Date(booking.startDateTime).toLocaleString('en-GB', {timeZone:d.timeZone || 'UTC',day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
  return `Delivery: ${time} (${d.timeZone || 'UTC'}). Delivery fee: ${d.deliveryFeeType === 'FREE' ? 'Free' : `Rs. ${Number(d.totalFee).toLocaleString()}`}.`;
}
