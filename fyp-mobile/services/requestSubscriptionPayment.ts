// fyp-mobile/services/requestSubscriptionPayment.ts

import { growthApi } from './growthApiClient';

import {
  PaymentProvider,
  SubscriptionPlan,
  VendorSubscription,
} from '../types/subscription.types';

interface RequestSubscriptionPaymentInput {
  plan:
    | SubscriptionPlan.BASIC
    | SubscriptionPlan.GROWTH
    | SubscriptionPlan.PREMIUM;

  paymentProvider: PaymentProvider.EASYPAISA;

  paymentReference: string;
}

export async function requestSubscriptionPayment(
  input: RequestSubscriptionPaymentInput,
): Promise<VendorSubscription> {
  return growthApi.post<VendorSubscription>(
    '/vendor/growth/subscription/payment-request',
    input,
  );
}