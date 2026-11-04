export const resolvePackagePrice = (
  pkg: any, selectedDurationMinutes: number,
): { price: number | null; reason?: string; basis?: 'fixed' | 'custom' } => {
  const durations = Array.isArray(pkg.durations) ? pkg.durations : [];
  const hours = selectedDurationMinutes / 60;
  const included = Number(pkg.baseIncludedDurationMinutes);
  if (!(included > 0)) {
    const exact = durations.find((d: any) => Number(d.value) * (d.unit === 'DAYS' ? 24 : 1) === hours);
    if (exact) return { price: Number(exact.price), basis: 'fixed' };
    if (pkg.allowCustomDuration && Number(pkg.customDurationRate) > 0) {
      return { price: Math.round(Number(pkg.customDurationRate) * (pkg.customDurationUnit === 'DAYS' ? hours / 24 : hours)), basis: 'custom' };
    }
    return { price: null, reason: 'This duration is not offered by the vendor.' };
  }
  const base = Number(pkg.price);
  if (!Number.isFinite(base) || base < 0)
    return { price: null, reason: 'Vendor pricing needs correction before booking.' };
  const tiers = [{ minutes: included, price: base }, ...durations.map((d: any) => ({
    minutes: Number(d.value) * (d.unit === 'DAYS' ? 1440 : 60), price: Number(d.price),
  }))].sort((a,b) => a.minutes - b.minutes);
  if (tiers.some((t,i) => !Number.isFinite(t.minutes) || !Number.isFinite(t.price) || t.price < 0 ||
    (i > 0 && (t.minutes <= tiers[i-1].minutes || t.price < tiers[i-1].price))))
    return { price: null, reason: 'Vendor pricing needs correction before booking.' };
  const exact = tiers.find(t => Math.abs(t.minutes - selectedDurationMinutes) < 0.001);
  if (exact) return { price: exact.price, basis: 'fixed' };
  const rate = Number(pkg.customDurationRate);
  if (!pkg.allowCustomDuration || !Number.isFinite(rate) || rate <= 0)
    return { price: null, reason: 'This duration is not offered by the vendor.' };
  if (selectedDurationMinutes < included) {
    const unitMinutes = pkg.customDurationUnit === 'DAYS' ? 1440 : pkg.customDurationUnit === 'HOURS' ? 60 : 0;
    if (!unitMinutes || selectedDurationMinutes <= 0 || selectedDurationMinutes % unitMinutes !== 0) {
      return { price: null, reason: 'Select a duration in whole units of the vendor’s custom rate.' };
    }
    return { price: Math.round(Math.min(base, rate * selectedDurationMinutes / unitMinutes)), basis: 'custom' };
  }
  const lower = [...tiers].reverse().find(t => t.minutes < selectedDurationMinutes);
  const upper = tiers.find(t => t.minutes > selectedDurationMinutes);
  if (!lower) return { price: null, reason: 'This duration is not offered by the vendor.' };
  // Custom time is charged beyond the base included duration, not
  // beyond a discounted fixed tier. Fixed tiers remain exact overrides.
  const calculated = base + rate * (selectedDurationMinutes - included) / (pkg.customDurationUnit === 'DAYS' ? 1440 : 60);
  const monotonicPrice = Math.max(lower.price, upper ? Math.min(calculated, upper.price) : calculated);
  return { price: Math.round(monotonicPrice), basis: 'custom' };
};
