import { growthApi } from './growthApiClient';

export interface VendorClient {
  _id: string;
  name: string;
  email: string;
}

export interface VendorClientSearchResult {
  clients: VendorClient[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function searchVendorClients(
  vendorId: string,
  search: string = '',
  page: number = 1,
  limit: number = 20,
): Promise<VendorClientSearchResult> {
  return growthApi.get<VendorClientSearchResult>(
    `/vendor/growth/discount/discount-code/clients/${vendorId}` +
      `?page=${page}` +
      `&limit=${limit}` +
      `&search=${encodeURIComponent(search)}`,
  );
}