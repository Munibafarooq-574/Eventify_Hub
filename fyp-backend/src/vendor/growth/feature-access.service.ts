// fyp-backend/src/vendor/growth/feature-access.service.ts

import { Injectable } from '@nestjs/common';

import { SubscriptionService } from './subscription/subscription.service';

import {
  FeatureKey,
  LimitKey,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from './subscription/subscription.types';

import { getPlanDefinition } from './plan-config';

@Injectable()
export class FeatureAccessService {
  constructor(
    private readonly subscriptionService: SubscriptionService,
  ) {}


  async getCurrentPlan(
    vendorId: string,
  ): Promise<SubscriptionPlan> {
    const subscription =
      await this.subscriptionService.getCurrentSubscription(
        vendorId,
      );

    return subscription.plan;
  }

  async hasActiveSubscription(
    vendorId: string,
  ): Promise<boolean> {
    const subscription =
      await this.subscriptionService.getCurrentSubscription(
        vendorId,
      );

    return this.hasUsableAccess(
      subscription,
    );
  }

  async hasPaidSubscription(
    vendorId: string,
  ): Promise<boolean> {
    const subscription =
      await this.subscriptionService.getCurrentSubscription(
        vendorId,
      );

    if (
      !this.hasUsableAccess(
        subscription,
      )
    ) {
      return false;
    }

    if (
      subscription.status !==
        SubscriptionStatus.ACTIVE ||
      subscription.paymentStatus !==
        PaymentStatus.PAID
    ) {
      return false;
    }

    return [
      SubscriptionPlan.BASIC,
      SubscriptionPlan.GROWTH,
      SubscriptionPlan.PREMIUM,
    ].includes(
      subscription.plan,
    );
  }

  async canUseFeature(
    vendorId: string,
    feature: FeatureKey,
  ): Promise<boolean> {
    const subscription =
      await this.subscriptionService.getCurrentSubscription(
        vendorId,
      );

    if (
      !this.hasUsableAccess(
        subscription,
      )
    ) {
      return false;
    }

    return (
      getPlanDefinition(
        subscription.plan,
      ).features[feature] === true
    );
  }

  async getFeatureLimit(
    vendorId: string,
    limit: LimitKey,
  ): Promise<number> {
    const subscription =
      await this.subscriptionService.getCurrentSubscription(
        vendorId,
      );

    if (
      !this.hasUsableAccess(
        subscription,
      )
    ) {
      return 0;
    }

    return (
      getPlanDefinition(
        subscription.plan,
      ).limits[limit] ?? 0
    );
  }

  async canCreateMore(
    vendorId: string,
    limit: LimitKey,
    currentCount: number,
  ): Promise<boolean> {
    const max =
      await this.getFeatureLimit(
        vendorId,
        limit,
      );

    return currentCount < max;
  }

  private hasUsableAccess(
    subscription: any,
  ): boolean {
  
    if (
      subscription.status ===
      SubscriptionStatus.EXPIRED
    ) {
      return false;
    }

    if (
      subscription.status ===
      SubscriptionStatus.PENDING_PAYMENT
    ) {
      return false;
    }

    if (
      subscription.status ===
      SubscriptionStatus.REJECTED
    ) {
      return false;
    }

    if (
      subscription.status ===
      SubscriptionStatus.CANCELLED
    ) {
      return Boolean(
        subscription.endDate &&
          new Date(
            subscription.endDate,
          ).getTime() >
            Date.now(),
      );
    }

    if (
      subscription.status !==
        SubscriptionStatus.ACTIVE &&
      subscription.status !==
        SubscriptionStatus.TRIAL
    ) {
      return false;
    }

    if (!subscription.endDate) {
      return true;
    }

    return (
      new Date(
        subscription.endDate,
      ).getTime() >
      Date.now()
    );
  }
}