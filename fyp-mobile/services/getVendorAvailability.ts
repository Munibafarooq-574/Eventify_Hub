// fyp-mobile/services/getVendorAvailability.ts
import { growthApi } from './growthApiClient';
export default function getVendorAvailability(vendorId: string) {
  return growthApi.get<any>(`/vendor-availability/${vendorId}`);
}