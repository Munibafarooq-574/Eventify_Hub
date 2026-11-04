import { growthApi } from "./growthApiClient";

export default function getAllVendorsByCategoryId(categoryId: string) {
  return growthApi.get<any[]>(`/vendor/getVendorsByCategoryId?categoryId=${encodeURIComponent(categoryId)}`);
}
