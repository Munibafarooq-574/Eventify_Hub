// fyp-mobile/services/requestSubscriptionPayment.ts

import { growthApi } from './growthApiClient';

import {
  PaymentProvider,
  VendorSubscription,
} from '../types/subscription.types';

interface RequestSubscriptionPaymentInput {
  plan: string;
  expectedAmount?: number;

  paymentProvider: PaymentProvider.EASYPAISA | PaymentProvider.BANK_TRANSFER | PaymentProvider.CARD_TEST;

  paymentReference?: string;
  sendReceipt?: boolean;
  activationType: 'immediate' | 'scheduled';
}

export async function requestSubscriptionPayment(
  input: RequestSubscriptionPaymentInput,
): Promise<VendorSubscription> {
  return growthApi.post<VendorSubscription>(
    '/vendor/growth/subscription/payment-request',
    input,
  );
}