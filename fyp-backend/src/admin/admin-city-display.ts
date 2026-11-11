/** Read vendor business city from the canonical City reference, with legacy-text fallback. */
export function adminVendorCity(vendor: {
  businessCityId?: { name?: string | null } | string | null;
  contactDetails?: { city?: string | null } | null;
}): string {
  const city = vendor.businessCityId;
  const populatedName = city && typeof city === 'object' && typeof city.name === 'string'
    ? city.name.trim() : '';
  const legacyName = typeof vendor.contactDetails?.city === 'string'
    ? vendor.contactDetails.city.trim() : '';
  return populatedName || legacyName || 'N/A';
}
