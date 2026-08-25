// fyp-mobile/services/activateDemoSubscription.ts
import { growthApi } from './growthApiClient';
import { SubscriptionPlan, VendorSubscription } from '../types/subscription.types';

// This calls the DEMO/MANUAL activation endpoint. No real payment happens.
// Do not present the result to the user as "Payment Successful" — always
// label it as a demo activation (the screen below does this).
export async function activateDemoSubscription(
  vendorId: string,
  plan: SubscriptionPlan,
): Promise<VendorSubscription> {
  return growthApi.post<VendorSubscription>(
    `/vendor/growth/subscription/activate-demo?vendorId=${vendorId}`,
    { plan },
  );
}