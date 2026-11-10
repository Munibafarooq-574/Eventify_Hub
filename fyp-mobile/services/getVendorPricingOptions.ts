import getAllCategories from './getAllCategories';
import { PricingMethod } from '@/utils/packagePricing';

export default async function getVendorPricingOptions(user: any): Promise<PricingMethod[]> {
  const categories = await getAllCategories();
  const categoryId = String(user?.buisnessCategory?._id || user?.buisnessCategory || '');
  const category = categories.find((item: any) => String(item._id) === categoryId);
  if (!category) throw new Error('Your category could not be loaded. Please retry.');
  return category.allowedPricingMethods ?? [category.businessDetailsType === 'CATERING' ||
    String(category.normalizedName || category.name || '').toLowerCase().includes('catering') ? 'PER_PERSON' : 'FIXED'];
}
