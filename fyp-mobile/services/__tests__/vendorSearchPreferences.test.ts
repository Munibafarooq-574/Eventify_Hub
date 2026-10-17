import { beforeEach, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from '@/store';
import { emptyVendorFilters, loadVendorFilters, saveVendorFilters, sortVendorResults, vendorStartingPrice } from '../vendorSearchPreferences';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(),
}));
jest.mock('@/store', () => ({ getUserData: jest.fn() }));

beforeEach(() => { jest.clearAllMocks(); });
it('keeps missing prices last in both price orders and preserves zero prices', () => {
  const vendors = [{ _id: 'missing' }, { _id: 'paid', cakeBusinessDetails: { minimumPrice: 100 } }, { _id: 'zero', cakeBusinessDetails: { minimumPrice: 0 } }];
  expect(sortVendorResults(vendors, 'priceAsc', {}).map(v => v._id)).toEqual(['zero', 'paid', 'missing']);
  expect(sortVendorResults(vendors, 'priceDesc', {}).map(v => v._id)).toEqual(['paid', 'zero', 'missing']);
  expect(vendorStartingPrice(vendors[2])).toBe(0);
});
it('sorts the displayed brand name and the real review summaries', () => {
  const vendors = [{ _id: 'a', name: 'Z', contactDetails: { brandName: 'Alpha' } }, { _id: 'b', name: 'A', contactDetails: { brandName: 'Beta' } }];
  expect(sortVendorResults(vendors, 'nameAsc', {}).map(v => v._id)).toEqual(['a', 'b']);
  expect(sortVendorResults(vendors, 'rating', { a: { averageRating: 4.5 }, b: { averageRating: 5 } }).map(v => v._id)).toEqual(['b', 'a']);
  expect(sortVendorResults(vendors, 'reviews', { a: { totalReviews: 20 }, b: { totalReviews: 2 } }).map(v => v._id)).toEqual(['a', 'b']);
});
it('persists and restores multiple selections under the signed-in account key', async () => {
  jest.mocked(getUserData).mockResolvedValue({ _id: 'client-a' });
  const filters = { ...emptyVendorFilters(), cityIds: ['city-a', 'city-b'], staffOptions: ['MALE', 'FEMALE'] };
  await saveVendorFilters(filters);
  expect(AsyncStorage.setItem).toHaveBeenCalledWith('vendor-search-filters:v1:client-a', JSON.stringify(filters));
  jest.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(filters));
  expect(await loadVendorFilters()).toEqual(filters);
  jest.mocked(getUserData).mockResolvedValue({ _id: 'client-b' });
  await loadVendorFilters();
  expect(AsyncStorage.getItem).toHaveBeenLastCalledWith('vendor-search-filters:v1:client-b');
});
