// fyp-mobile/services/getSubscriptionPaymentInstructions.ts

import { growthApi } from './growthApiClient';

import {
  SubscriptionPaymentInstructions,
} from '../types/subscription.types';

export async function getSubscriptionPaymentInstructions():
Promise<SubscriptionPaymentInstructions> {
  return growthApi.get<SubscriptionPaymentInstructions>(
    '/vendor/growth/subscription/payment-instructions',
  );
}