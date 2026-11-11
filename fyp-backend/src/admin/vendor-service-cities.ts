/** Resolve the configured service coverage, never infer it from the business address. */
export function adminVendorServiceCities(vendor: {
  serviceLocationCityIds?: Array<{ name?: string | null; stateProvinceName?: string | null; countryName?: string | null } | string | null> | null;
}): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const city of vendor.serviceLocationCityIds ?? []) {
    if (!city || typeof city !== 'object' || typeof city.name !== 'string') continue;
    const name = city.name.trim();
    if (!name) continue;
    const state = typeof city.stateProvinceName === 'string' ? city.stateProvinceName.trim() : '';
    const country = typeof city.countryName === 'string' ? city.countryName.trim() : '';
    const formatted = [name, state && state.toLowerCase() !== name.toLowerCase() ? state : '', country].filter(Boolean).join(', ');
    const key = formatted.toLowerCase();
    if (!seen.has(key)) { seen.add(key); output.push(formatted); }
  }
  return output;
}
