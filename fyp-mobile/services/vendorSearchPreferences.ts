import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from '@/store';

export const SORT_OPTIONS = [
  ['default', 'Default order'], ['priceAsc', 'Price: Low to High'],
  ['priceDesc', 'Price: High to Low'], ['nameAsc', 'Name: A–Z'],
  ['nameDesc', 'Name: Z–A'], ['rating', 'Highest Rated'], ['reviews', 'Most Reviewed'],
] as const;
export type VendorSort = typeof SORT_OPTIONS[number][0];
export interface VendorSearchPreferences {
  cityIds: string[];
  cityLabels: Record<string, string>;
  staffOptions: string[];
  policies: string[];
  ratingBands: string[];
  sort: VendorSort;
}
export const emptyVendorFilters = (): VendorSearchPreferences => ({
  cityIds: [], cityLabels: {}, staffOptions: [], policies: [], ratingBands: [], sort: 'default',
});
async function storageKey() {
  const user = await getUserData();
  const id = user?._id || user?.id;
  return id ? `vendor-search-filters:v1:${id}` : null;
}
export async function loadVendorFilters(): Promise<VendorSearchPreferences> {
  const key = await storageKey();
  if (!key) return emptyVendorFilters();
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return emptyVendorFilters();
  try {
    const parsed = JSON.parse(raw);
    const result = emptyVendorFilters();
    for (const key of ['cityIds', 'staffOptions', 'policies', 'ratingBands'] as const) {
      result[key] = Array.isArray(parsed[key]) ? [...new Set<string>(parsed[key].filter((v: unknown) => typeof v === 'string'))] : [];
    }
    result.cityLabels = parsed.cityLabels && typeof parsed.cityLabels === 'object' ? parsed.cityLabels : {};
    result.sort = SORT_OPTIONS.some(([value]) => value === parsed.sort) ? parsed.sort : 'default';
    return result;
  } catch { return emptyVendorFilters(); }
}
export async function saveVendorFilters(filters: VendorSearchPreferences) {
  const key = await storageKey();
  if (key) await AsyncStorage.setItem(key, JSON.stringify(filters));
}
export function vendorStartingPrice(vendor: any): number | undefined {
  const details = [vendor.cakeBusinessDetails, vendor.mehndiBusinessDetails,
    vendor.cateringBusinessDetails, vendor.photographerBusinessDetails,
    vendor.salonBusinessDetails, vendor.venueBusinessDetails, vendor.soundBusinessDetails,
    vendor.genericBusinessDetails, vendor.BusinessDetails];
  for (const detail of details) {
    const raw = detail?.minimumPrice ?? detail?.minimumPricePerEvent;
    if (raw !== undefined && raw !== null && raw !== '' && Number.isFinite(Number(raw)) && Number(raw) >= 0) return Number(raw);
  }
  return undefined;
}
export function sortVendorResults(vendors: any[], sort: VendorSort, reviews: Record<string, any>) {
  const name = (v: any) => String(v.contactDetails?.brandName || v.ContactDetails?.brandName || v.BusinessDetails?.brandName || v.name || '');
  const compareName = (a: any, b: any) => name(a).localeCompare(name(b), undefined, { sensitivity: 'base', numeric: true });
  return [...vendors].sort((a, b) => {
    if (sort === 'default') return 0;
    if (sort === 'priceAsc' || sort === 'priceDesc') {
      const left = vendorStartingPrice(a), right = vendorStartingPrice(b);
      if (left === undefined || right === undefined) return left === right ? compareName(a,b) : left === undefined ? 1 : -1;
      return (sort === 'priceAsc' ? left - right : right - left) || compareName(a,b);
    }
    if (sort === 'nameAsc' || sort === 'nameDesc') return compareName(a,b) * (sort === 'nameAsc' ? 1 : -1);
    const metric = sort === 'rating' ? 'averageRating' : 'totalReviews';
    return (Number(reviews[b._id]?.[metric]) || 0) - (Number(reviews[a._id]?.[metric]) || 0) || compareName(a,b);
  });
}
