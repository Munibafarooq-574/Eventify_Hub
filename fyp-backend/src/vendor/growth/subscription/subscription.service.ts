
// fyp-backend/src/vendor/growth/subscription/subscription.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VendorSubscription } from '../../../schemas/vendor-subscription.schema';
import {
  DEMO_SUBSCRIPTION_DURATION_DAYS,
  PaymentProvider,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from './subscription.types';
import { getAllPlanDefinitions, getPlanDefinition } from '../plan-config';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(VendorSubscription.name)
    private readonly subscriptionModel: Model<VendorSubscription>,
  ) {}

  /**
   * List all plans + their features/limits, for the SubscriptionScreen.
   */
  getPlans() {
    return getAllPlanDefinitions();
  }

  /**
   * Returns the vendor's current subscription document. If the vendor has
   * never had one, an implicit Free record is created lazily (every
   * vendor is on Free by default — nothing extra to set up on signup).
   *
   * Also lazily expires the subscription if endDate has passed, so callers
   * never see a stale "active" Growth/Premium plan that actually expired.
   */
  async getCurrentSubscription(vendorId: string): Promise<VendorSubscription> {
    this.assertValidId(vendorId);

    let current = await this.subscriptionModel.findOne({
      vendorId: new Types.ObjectId(vendorId),
      isCurrent: true,
    });

    if (!current) {
      current = await this.subscriptionModel.create({
        vendorId: new Types.ObjectId(vendorId),
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
        startDate: new Date(),
        endDate: null,
        paymentStatus: PaymentStatus.NONE,
        paymentProvider: PaymentProvider.NONE,
        paymentReference: null,
        isCurrent: true,
      });
    }

    return this.expireIfNeeded(current);
  }

  /**
   * Full subscription history for a vendor (most recent first) — kept for
   * audit/support purposes, nothing is ever deleted.
   */
  async getSubscriptionHistory(vendorId: string): Promise<VendorSubscription[]> {
    this.assertValidId(vendorId);
    return this.subscriptionModel
      .find({ vendorId: new Types.ObjectId(vendorId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Demo/Manual Activation — NOT a real payment. Clearly logged as such via
   * paymentStatus/paymentProvider so this can be swapped for a real gateway
   * later without touching the rest of the growth system.
   */
  async activateDemoPlan(vendorId: string, plan: SubscriptionPlan): Promise<VendorSubscription> {
    this.assertValidId(vendorId);

    if (plan === SubscriptionPlan.FREE) {
      throw new BadRequestException(
        'Free plan does not need activation — downgrade using the cancel endpoint instead.',
      );
    }

    // Sanity check the plan actually exists in config
    getPlanDefinition(plan);

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + DEMO_SUBSCRIPTION_DURATION_DAYS);

    // Archive whatever is currently active for this vendor
    await this.subscriptionModel.updateMany(
      { vendorId: new Types.ObjectId(vendorId), isCurrent: true },
      { $set: { isCurrent: false } },
    );

    const created = await this.subscriptionModel.create({
      vendorId: new Types.ObjectId(vendorId),
      plan,
      status: SubscriptionStatus.ACTIVE,
      startDate: now,
      endDate,
      paymentStatus: PaymentStatus.DEMO,
      paymentProvider: PaymentProvider.DEMO,
      paymentReference: `DEMO-${vendorId}-${now.getTime()}`,
      amountPaid: 0,
      isCurrent: true,
    });

    return created;
  }

async cancelSubscription(
  vendorId: string,
  reason?: string,
): Promise<VendorSubscription> {
  this.assertValidId(vendorId);

  const current = await this.subscriptionModel.findOne({
    vendorId: new Types.ObjectId(vendorId),
    isCurrent: true,
  });

  if (!current) {
    throw new NotFoundException(
      'No active subscription found for this vendor',
    );
  }

  if (current.plan === SubscriptionPlan.FREE) {
    throw new BadRequestException(
      'Vendor is already on the Free plan',
    );
  }

  // If the paid subscription has already reached its end date,
  // let the normal expiry flow handle it instead of scheduling cancellation.
  if (current.endDate && current.endDate.getTime() <= Date.now()) {
    return this.expireIfNeeded(current);
  }

  // Cancel renewal/access after the already-paid period ends.
  // IMPORTANT:
  // Keep the paid plan as current until endDate.
  current.status = SubscriptionStatus.CANCELLED;
  current.isCurrent = true;
  current.cancelledReason = reason ?? null;

  await current.save();

  return current;
}
  /**
   * If a subscription's endDate has passed and it's still marked active,
   * flip it to expired and demote the vendor back to Free. Called lazily
   * from getCurrentSubscription — no cron job required for Phase 1, but
   * this method can be reused later inside a scheduled task if needed.
   */
  private async expireIfNeeded(subscription: VendorSubscription): Promise<VendorSubscription> {
    const isPastEnd =
  subscription.endDate &&
  subscription.endDate.getTime() <= Date.now();

const isPaidPlan =
  subscription.plan !== SubscriptionPlan.FREE;

if (!isPastEnd || !isPaidPlan) {
  return subscription;
}

    subscription.status = SubscriptionStatus.EXPIRED;
    subscription.isCurrent = false;
    await subscription.save();

    // Vendor falls back to Free automatically once their paid plan expires
    const freeRecord = await this.subscriptionModel.create({
      vendorId: subscription.vendorId,
      plan: SubscriptionPlan.FREE,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      endDate: null,
      paymentStatus: PaymentStatus.NONE,
      paymentProvider: PaymentProvider.NONE,
      paymentReference: null,
      isCurrent: true,
    });

    return freeRecord;
  }

  private assertValidId(vendorId: string) {
    if (!Types.ObjectId.isValid(vendorId)) {
      throw new BadRequestException('Invalid vendorId');
    }
  }
}