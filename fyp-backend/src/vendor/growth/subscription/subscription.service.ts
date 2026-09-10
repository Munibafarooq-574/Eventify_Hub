// fyp-backend/src/vendor/growth/subscription/subscription.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Model,
  Types,
} from 'mongoose';

import {
  VendorSubscription,
} from '../../../schemas/vendor-subscription.schema';

import {
  User,
} from '../../../schemas/user.schema';

import {
  DEMO_SUBSCRIPTION_DURATION_DAYS,
  PaymentProvider,
  PaymentStatus,
  SUBSCRIPTION_DURATION_DAYS,
  SubscriptionPlan,
  SubscriptionStatus,
  VENDOR_TRIAL_DURATION_DAYS,
} from './subscription.types';

import {
  getAllPlanDefinitions,
  getConfiguredPlanPrice,
  getPlanDefinition,
} from '../plan-config';

type VendorSubscriptionDocument =
  HydratedDocument<VendorSubscription>;

type AdminPaymentDecision =
  | 'PAID'
  | 'FAILED';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(VendorSubscription.name)
    private readonly subscriptionModel:
      Model<VendorSubscription>,

    @InjectModel(User.name)
    private readonly userModel:
      Model<User>,
  ) {}

  // =========================================================
  // PLANS
  // =========================================================

  getPlans() {
    return getAllPlanDefinitions();
  }

  // =========================================================
  // CURRENT SUBSCRIPTION
  // =========================================================

  async getCurrentSubscription(
    vendorId: string,
  ): Promise<VendorSubscriptionDocument> {
    this.assertValidId(vendorId);

    const vendorObjectId =
      new Types.ObjectId(vendorId);

    let current:
      | VendorSubscriptionDocument
      | null =
      await this.subscriptionModel.findOne({
        vendorId: vendorObjectId,
        isCurrent: true,
      });

    if (!current) {
      current =
        await this.createInitialTrial(
          vendorObjectId,
        );
    }

    // Backward compatibility:
    // old DB rows may still contain plan = "free".
    if (
      current.plan ===
      SubscriptionPlan.FREE
    ) {
      current =
        await this.convertLegacyFreeToTrial(
          current,
        );
    }

    return this.expireIfNeeded(
      current,
    );
  }

  // =========================================================
  // HISTORY
  // =========================================================

  async getSubscriptionHistory(
    vendorId: string,
  ): Promise<VendorSubscriptionDocument[]> {
    this.assertValidId(vendorId);

    return this.subscriptionModel
      .find({
        vendorId:
          new Types.ObjectId(vendorId),
      })
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  // =========================================================
  // VENDOR PAYMENT REQUEST
  // =========================================================

  async requestSubscriptionPayment(
    vendorId: string,
    plan: SubscriptionPlan,
    paymentProvider: PaymentProvider,
    paymentReference: string,
  ): Promise<VendorSubscriptionDocument> {
    this.assertValidId(vendorId);
    this.assertPurchasablePlan(plan);

    this.assertManualPaymentProvider(
      paymentProvider,
    );

    // Verify vendor and normalize any current subscription state.
    await this.getCurrentSubscription(
      vendorId,
    );

    const vendorObjectId =
      new Types.ObjectId(vendorId);

    const amountDue =
      getConfiguredPlanPrice(plan);

    // Backend is the source of truth.
    // Vendor/frontend cannot supply price.
    if (
      amountDue === null ||
      amountDue <= 0
    ) {
      throw new BadRequestException(
        `${getPlanDefinition(plan).name} subscription price has not been configured by Eventify Hub yet.`,
      );
    }

    const normalizedReference =
      paymentReference
        ?.trim()
        .toUpperCase();

    if (
      !normalizedReference ||
      normalizedReference.length < 2
    ) {
      throw new BadRequestException(
        'Payment reference is required.',
      );
    }

    const existingPending =
      await this.subscriptionModel.findOne({
        vendorId: vendorObjectId,
        paymentStatus:
          PaymentStatus.PENDING,
      });

    if (existingPending) {
      throw new BadRequestException(
        'You already have a subscription payment waiting for Admin verification.',
      );
    }

    const duplicateReference =
      await this.subscriptionModel.findOne({
        paymentProvider,
        paymentReference:
          normalizedReference,
        paymentStatus: {
          $in: [
            PaymentStatus.PENDING,
            PaymentStatus.PAID,
          ],
        },
      });

    if (duplicateReference) {
      throw new BadRequestException(
        'This payment reference has already been submitted.',
      );
    }

    const now =
      new Date();

    // A payment request is NOT current access yet.
    // Current trial/paid plan continues until Admin approves.
    return this.subscriptionModel.create({
      vendorId:
        vendorObjectId,

      plan,

      status:
        SubscriptionStatus.PENDING_PAYMENT,

      // startDate will be reset to the actual approval time.
      startDate:
        now,

      endDate:
        null,

      paymentStatus:
        PaymentStatus.PENDING,

      paymentProvider,

      paymentReference:
        normalizedReference,

      // Backend price snapshot.
      amountDue,

      amountPaid:
        0,

      paymentSubmittedAt:
        now,

      verifiedAt:
        null,

      verifiedBy:
        null,

      rejectionReason:
        null,

      isCurrent:
        false,

      cancelledReason:
        null,
    });
  }

  // =========================================================
  // ADMIN SUBSCRIPTION PAYMENT LIST
  // =========================================================

  async getAdminSubscriptionPayments(
    status?: string,
    plan?: string,
    limit = 20,
    skip = 0,
  ) {
    const safeLimit =
      Math.min(
        Math.max(
          Number(limit) || 20,
          1,
        ),
        100,
      );

    const safeSkip =
      Math.max(
        Number(skip) || 0,
        0,
      );

    const query: Record<string, any> = {
      plan: {
        $in: [
          SubscriptionPlan.BASIC,
          SubscriptionPlan.GROWTH,
          SubscriptionPlan.PREMIUM,
        ],
      },

      // Do not count demo subscriptions as real payments.
      paymentStatus: {
        $in: [
          PaymentStatus.PENDING,
          PaymentStatus.PAID,
          PaymentStatus.FAILED,
        ],
      },
    };

    if (
      status &&
      status.toUpperCase() !== 'ALL'
    ) {
      const normalized =
        status.toLowerCase();

      if (
        ![
          PaymentStatus.PENDING,
          PaymentStatus.PAID,
          PaymentStatus.FAILED,
        ].includes(
          normalized as PaymentStatus,
        )
      ) {
        throw new BadRequestException(
          'Invalid subscription payment status.',
        );
      }

      query.paymentStatus =
        normalized;
    }

    if (
      plan &&
      plan.toUpperCase() !== 'ALL'
    ) {
      const normalizedPlan =
        plan.toLowerCase();

      if (
        ![
          SubscriptionPlan.BASIC,
          SubscriptionPlan.GROWTH,
          SubscriptionPlan.PREMIUM,
        ].includes(
          normalizedPlan as SubscriptionPlan,
        )
      ) {
        throw new BadRequestException(
          'Invalid subscription plan.',
        );
      }

      query.plan =
        normalizedPlan;
    }

    const [
      subscriptions,
      total,
    ] = await Promise.all([
      this.subscriptionModel
        .find(query)
        .populate(
          'vendorId',
          'name email phone_number categoryName contactDetails',
        )
        .populate(
          'verifiedBy',
          'name email',
        )
        .sort({
          createdAt: -1,
        })
        .skip(safeSkip)
        .limit(safeLimit)
        .lean(),

      this.subscriptionModel
        .countDocuments(query),
    ]);

    return {
      total,
      limit:
        safeLimit,
      skip:
        safeSkip,

      items: subscriptions.map(
        (subscription: any) => {
          const vendor =
            subscription.vendorId;

          const verifiedBy =
            subscription.verifiedBy;

          return {
            subscriptionId:
              String(
                subscription._id,
              ),

            vendor: vendor
              ? {
                  id: String(
                    vendor._id,
                  ),

                  name:
                    vendor.name ??
                    'Unknown Vendor',

                  email:
                    vendor.email ??
                    null,

                  phone:
                    vendor.phone_number ??
                    null,

                  categoryName:
                    vendor.categoryName ??
                    null,

                  brandName:
                    vendor.contactDetails
                      ?.brandName ??
                    null,
                }
              : null,

            plan:
              subscription.plan,

            subscriptionStatus:
              subscription.status,

            paymentStatus:
              subscription.paymentStatus,

            paymentProvider:
              subscription.paymentProvider,

            paymentReference:
              subscription.paymentReference ??
              null,

            amountDue:
              Number(
                subscription.amountDue ??
                  0,
              ),

            amountPaid:
              Number(
                subscription.amountPaid ??
                  0,
              ),

            paymentSubmittedAt:
              subscription.paymentSubmittedAt ??
              null,

            startDate:
              subscription.startDate ??
              null,

            endDate:
              subscription.endDate ??
              null,

            verifiedAt:
              subscription.verifiedAt ??
              null,

            verifiedBy:
              verifiedBy
                ? {
                    id: String(
                      verifiedBy._id,
                    ),

                    name:
                      verifiedBy.name ??
                      null,

                    email:
                      verifiedBy.email ??
                      null,
                  }
                : null,

            rejectionReason:
              subscription.rejectionReason ??
              null,

            isCurrent:
              Boolean(
                subscription.isCurrent,
              ),

            createdAt:
              subscription.createdAt ??
              null,

            updatedAt:
              subscription.updatedAt ??
              null,
          };
        },
      ),
    };
  }

  // =========================================================
  // ADMIN VERIFY / REJECT PAYMENT
  // =========================================================

  async reviewSubscriptionPayment(
    subscriptionId: string,
    decision: AdminPaymentDecision,
    adminId: string,
    reason?: string,
  ): Promise<VendorSubscriptionDocument> {
    if (
      !Types.ObjectId.isValid(
        subscriptionId,
      )
    ) {
      throw new BadRequestException(
        'Invalid subscriptionId.',
      );
    }

    if (
      !Types.ObjectId.isValid(
        adminId,
      )
    ) {
      throw new BadRequestException(
        'Invalid Admin account.',
      );
    }

    const paymentRequest =
      await this.subscriptionModel.findById(
        subscriptionId,
      );

    if (!paymentRequest) {
      throw new NotFoundException(
        'Subscription payment request not found.',
      );
    }

    if (
      paymentRequest.paymentStatus !==
        PaymentStatus.PENDING ||
      paymentRequest.status !==
        SubscriptionStatus.PENDING_PAYMENT
    ) {
      throw new BadRequestException(
        'This subscription payment has already been reviewed.',
      );
    }

    const normalizedDecision =
      decision.toUpperCase();

    // -------------------------------------------------------
    // FAILED / REJECTED
    // -------------------------------------------------------

    if (
      normalizedDecision ===
      'FAILED'
    ) {
      const rejectionReason =
        reason?.trim();

      if (!rejectionReason) {
        throw new BadRequestException(
          'A rejection reason is required.',
        );
      }

      paymentRequest.paymentStatus =
        PaymentStatus.FAILED;

      paymentRequest.status =
        SubscriptionStatus.REJECTED;

      paymentRequest.amountPaid =
        0;

      paymentRequest.verifiedAt =
        new Date();

      paymentRequest.verifiedBy =
        new Types.ObjectId(
          adminId,
        );

      paymentRequest.rejectionReason =
        rejectionReason;

      paymentRequest.isCurrent =
        false;

      await paymentRequest.save();

      return paymentRequest;
    }

    // -------------------------------------------------------
    // PAID / APPROVED
    // -------------------------------------------------------

    if (
      normalizedDecision !==
      'PAID'
    ) {
      throw new BadRequestException(
        'Decision must be PAID or FAILED.',
      );
    }

    if (
      Number(
        paymentRequest.amountDue ??
          0,
      ) <= 0
    ) {
      throw new BadRequestException(
        'This payment request does not contain a valid backend price snapshot.',
      );
    }

    const now =
      new Date();

    const endDate =
      new Date(now);

    endDate.setDate(
      endDate.getDate() +
        SUBSCRIPTION_DURATION_DAYS,
    );

    // Growth/Premium replace Basic.
    // Only one entitlement is current at a time.
    await this.subscriptionModel.updateMany(
      {
        vendorId:
          paymentRequest.vendorId,

        isCurrent:
          true,
      },
      {
        $set: {
          isCurrent:
            false,
        },
      },
    );

    paymentRequest.status =
      SubscriptionStatus.ACTIVE;

    paymentRequest.paymentStatus =
      PaymentStatus.PAID;

    // Admin never chooses the amount.
    // Backend snapshot becomes paid amount.
    paymentRequest.amountPaid =
      Number(
        paymentRequest.amountDue,
      );

    paymentRequest.startDate =
      now;

    paymentRequest.endDate =
      endDate;

    paymentRequest.verifiedAt =
      now;

    paymentRequest.verifiedBy =
      new Types.ObjectId(
        adminId,
      );

    paymentRequest.rejectionReason =
      null;

    paymentRequest.cancelledReason =
      null;

    paymentRequest.isCurrent =
      true;

    await paymentRequest.save();

    return paymentRequest;
  }

  // =========================================================
  // DEMO ACTIVATION
  // =========================================================

  async activateDemoPlan(
    vendorId: string,
    plan: SubscriptionPlan,
  ): Promise<VendorSubscriptionDocument> {
    this.assertValidId(vendorId);
    this.assertPurchasablePlan(plan);

    getPlanDefinition(plan);

    const vendorObjectId =
      new Types.ObjectId(vendorId);

    const now =
      new Date();

    const endDate =
      new Date(now);

    endDate.setDate(
      endDate.getDate() +
        DEMO_SUBSCRIPTION_DURATION_DAYS,
    );

    await this.subscriptionModel.updateMany(
      {
        vendorId:
          vendorObjectId,

        isCurrent:
          true,
      },
      {
        $set: {
          isCurrent:
            false,
        },
      },
    );

    return this.subscriptionModel.create({
      vendorId:
        vendorObjectId,

      plan,

      status:
        SubscriptionStatus.ACTIVE,

      startDate:
        now,

      endDate,

      paymentStatus:
        PaymentStatus.DEMO,

      paymentProvider:
        PaymentProvider.DEMO,

      paymentReference:
        `DEMO-${vendorId}-${now.getTime()}`,

      amountDue:
        0,

      amountPaid:
        0,

      paymentSubmittedAt:
        null,

      verifiedAt:
        null,

      verifiedBy:
        null,

      rejectionReason:
        null,

      isCurrent:
        true,

      cancelledReason:
        null,
    });
  }

  // =========================================================
  // CANCEL RENEWAL
  // =========================================================

  async cancelSubscription(
    vendorId: string,
    reason?: string,
  ): Promise<VendorSubscriptionDocument> {
    this.assertValidId(vendorId);

    const current =
      await this.getCurrentSubscription(
        vendorId,
      );

    if (
      current.plan ===
        SubscriptionPlan.TRIAL ||
      current.plan ===
        SubscriptionPlan.FREE
    ) {
      throw new BadRequestException(
        'A free trial cannot be cancelled as a paid subscription.',
      );
    }

    if (
      current.status ===
      SubscriptionStatus.EXPIRED
    ) {
      throw new BadRequestException(
        'This subscription has already expired.',
      );
    }

    if (
      current.status ===
      SubscriptionStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Subscription renewal is already cancelled.',
      );
    }

    if (
      current.status !==
      SubscriptionStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Only an active paid subscription can be cancelled.',
      );
    }

    current.status =
      SubscriptionStatus.CANCELLED;

    current.cancelledReason =
      reason?.trim() || null;

    await current.save();

    return current;
  }

  // =========================================================
  // ACCESS STATE
  // =========================================================

  async isSubscriptionRequired(
    vendorId: string,
  ): Promise<boolean> {
    const current =
      await this.getCurrentSubscription(
        vendorId,
      );

    return (
      current.status ===
      SubscriptionStatus.EXPIRED
    );
  }

  async getSubscriptionAccessState(
    vendorId: string,
  ) {
    const subscription =
      await this.getCurrentSubscription(
        vendorId,
      );

    const endTime =
      subscription.endDate
        ? new Date(
            subscription.endDate,
          ).getTime()
        : null;

    const remainingMs =
      endTime !== null
        ? Math.max(
            endTime -
              Date.now(),
            0,
          )
        : 0;

    const remainingDays =
      endTime !== null
        ? Math.ceil(
            remainingMs /
              (
                1000 *
                60 *
                60 *
                24
              ),
          )
        : 0;

    const expired =
      subscription.status ===
      SubscriptionStatus.EXPIRED;

    const isTrial =
      subscription.plan ===
      SubscriptionPlan.TRIAL;

    const isPaidPlan =
      [
        SubscriptionPlan.BASIC,
        SubscriptionPlan.GROWTH,
        SubscriptionPlan.PREMIUM,
      ].includes(
        subscription.plan,
      );

    const pendingPayment =
      await this.subscriptionModel
        .findOne({
          vendorId:
            new Types.ObjectId(
              vendorId,
            ),

          status:
            SubscriptionStatus.PENDING_PAYMENT,

          paymentStatus:
            PaymentStatus.PENDING,
        })
        .sort({
          createdAt: -1,
        })
        .lean();

    return {
      subscription,

      isTrial,

      isPaidPlan,

      subscriptionRequired:
        expired,

      hasPendingPayment:
        Boolean(
          pendingPayment,
        ),

      pendingPayment:
        pendingPayment
          ? {
              subscriptionId:
                String(
                  pendingPayment._id,
                ),

              plan:
                pendingPayment.plan,

              amountDue:
                Number(
                  pendingPayment.amountDue ??
                    0,
                ),

              paymentProvider:
                pendingPayment.paymentProvider,

              paymentReference:
                pendingPayment.paymentReference,

              paymentStatus:
                pendingPayment.paymentStatus,

              submittedAt:
                pendingPayment.paymentSubmittedAt ??
                null,
            }
          : null,

      trialDaysRemaining:
        isTrial &&
        !expired
          ? remainingDays
          : 0,

      daysRemaining:
        !expired
          ? remainingDays
          : 0,
    };
  }

  // =========================================================
  // INITIAL 7-DAY TRIAL
  // =========================================================

  private async createInitialTrial(
    vendorObjectId: Types.ObjectId,
  ): Promise<VendorSubscriptionDocument> {
    const vendor =
      await this.userModel
        .findById(
          vendorObjectId,
        )
        .select(
          '_id role createdAt',
        )
        .lean();

    if (!vendor) {
      throw new NotFoundException(
        'Vendor not found.',
      );
    }

    if (
      String(
        vendor.role,
      ).toLowerCase() !==
      'vendor'
    ) {
      throw new BadRequestException(
        'Subscription is available only for Vendor accounts.',
      );
    }

    const vendorCreatedAt =
      (vendor as any).createdAt
        ? new Date(
            (vendor as any)
              .createdAt,
          )
        : new Date();

    const trialEndDate =
      new Date(
        vendorCreatedAt,
      );

    trialEndDate.setDate(
      trialEndDate.getDate() +
        VENDOR_TRIAL_DURATION_DAYS,
    );

    const alreadyExpired =
      trialEndDate.getTime() <=
      Date.now();

    return this.subscriptionModel.create({
      vendorId:
        vendorObjectId,

      plan:
        SubscriptionPlan.TRIAL,

      status:
        alreadyExpired
          ? SubscriptionStatus.EXPIRED
          : SubscriptionStatus.ACTIVE,

      startDate:
        vendorCreatedAt,

      endDate:
        trialEndDate,

      paymentStatus:
        PaymentStatus.NONE,

      paymentProvider:
        PaymentProvider.NONE,

      paymentReference:
        null,

      amountDue:
        0,

      amountPaid:
        0,

      paymentSubmittedAt:
        null,

      verifiedAt:
        null,

      verifiedBy:
        null,

      rejectionReason:
        null,

      isCurrent:
        true,

      cancelledReason:
        null,
    });
  }

  // =========================================================
  // LEGACY FREE → TRIAL MIGRATION
  // =========================================================

  private async convertLegacyFreeToTrial(
    subscription:
      VendorSubscriptionDocument,
  ): Promise<VendorSubscriptionDocument> {
    const vendor =
      await this.userModel
        .findById(
          subscription.vendorId,
        )
        .select(
          'role createdAt',
        )
        .lean();

    if (!vendor) {
      throw new NotFoundException(
        'Vendor not found.',
      );
    }

    const vendorCreatedAt =
      (vendor as any).createdAt
        ? new Date(
            (vendor as any)
              .createdAt,
          )
        : subscription.startDate;

    const trialEndDate =
      new Date(
        vendorCreatedAt,
      );

    trialEndDate.setDate(
      trialEndDate.getDate() +
        VENDOR_TRIAL_DURATION_DAYS,
    );

    subscription.plan =
      SubscriptionPlan.TRIAL;

    subscription.startDate =
      vendorCreatedAt;

    subscription.endDate =
      trialEndDate;

    subscription.status =
      trialEndDate.getTime() <=
      Date.now()
        ? SubscriptionStatus.EXPIRED
        : SubscriptionStatus.ACTIVE;

    subscription.paymentStatus =
      PaymentStatus.NONE;

    subscription.paymentProvider =
      PaymentProvider.NONE;

    subscription.paymentReference =
      null;

    subscription.amountDue =
      0;

    subscription.amountPaid =
      0;

    subscription.paymentSubmittedAt =
      null;

    subscription.verifiedAt =
      null;

    subscription.verifiedBy =
      null;

    subscription.rejectionReason =
      null;

    subscription.cancelledReason =
      null;

    subscription.isCurrent =
      true;

    await subscription.save();

    return subscription;
  }

  // =========================================================
  // EXPIRY
  // =========================================================

  private async expireIfNeeded(
    subscription:
      VendorSubscriptionDocument,
  ): Promise<VendorSubscriptionDocument> {
    if (
      subscription.status ===
      SubscriptionStatus.EXPIRED
    ) {
      return subscription;
    }

    if (
      subscription.status ===
        SubscriptionStatus.PENDING_PAYMENT ||
      subscription.status ===
        SubscriptionStatus.REJECTED
    ) {
      return subscription;
    }

    if (!subscription.endDate) {
      return subscription;
    }

    if (
      subscription.endDate.getTime() >
      Date.now()
    ) {
      return subscription;
    }

    subscription.status =
      SubscriptionStatus.EXPIRED;

    // Keep expired entitlement as current.
    // UI can now show "Subscription Required".
    subscription.isCurrent =
      true;

    await subscription.save();

    return subscription;
  }

  // =========================================================
  // VALIDATION
  // =========================================================

  private assertPurchasablePlan(
    plan: SubscriptionPlan,
  ) {
    if (
      ![
        SubscriptionPlan.BASIC,
        SubscriptionPlan.GROWTH,
        SubscriptionPlan.PREMIUM,
      ].includes(plan)
    ) {
      throw new BadRequestException(
        'Choose Basic, Growth, or Premium.',
      );
    }
  }

  private assertManualPaymentProvider(
    provider: PaymentProvider,
  ) {
    if (
      ![
        PaymentProvider.BANK_TRANSFER,
        PaymentProvider.JAZZCASH,
        PaymentProvider.EASYPAISA,
      ].includes(provider)
    ) {
      throw new BadRequestException(
        'Choose Bank Transfer, JazzCash, or Easypaisa.',
      );
    }
  }

  private assertValidId(
    vendorId: string,
  ) {
    if (
      !Types.ObjectId.isValid(
        vendorId,
      )
    ) {
      throw new BadRequestException(
        'Invalid vendorId.',
      );
    }
  }
}