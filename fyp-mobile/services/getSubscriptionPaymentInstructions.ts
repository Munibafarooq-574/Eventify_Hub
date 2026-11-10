// fyp-mobile/services/getSubscriptionPaymentInstructions.ts

import { growthApi } from './growthApiClient';

import {
  SubscriptionPaymentInstructions,
} from '../types/subscription.types';

export async function getSubscriptionPaymentInstructions(vendorId: string):
Promise<SubscriptionPaymentInstructions> {
  return growthApi.get<SubscriptionPaymentInstructions>(
    `/vendor/growth/subscription/payment-instructions?vendorId=${encodeURIComponent(vendorId)}`,
  );
}