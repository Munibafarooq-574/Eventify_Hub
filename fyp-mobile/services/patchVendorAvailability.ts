// fyp-mobile/services/patchVendorAvailability.ts
import { growthApi } from './growthApiClient';
export default function patchVendorAvailability(vendorId: string, dto: any) {
  return growthApi.patch<any>(`/vendor-availability/${vendorId}`, dto);
}