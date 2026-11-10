import { randomUUID } from 'crypto';
import { EmailService } from '../../../email/email.service';
import { renderEventifyPaymentEmail, emailReceiptSection } from '../../../email/payment-email-layout';
// fyp-backend/src/vendor/growth/subscription/subscription.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import {
  Connection,
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
    SubscriptionActivationType,
  SUBSCRIPTION_DURATION_DAYS,
  SubscriptionPlan,
  SubscriptionPlanChangeType,
  SubscriptionStatus,
  VENDOR_TRIAL_DURATION_DAYS,
} from './subscription.types';

import { PlanCatalogService, PLAN_KEY } from './plan-catalog.service';

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

    @InjectConnection()
    private readonly connection: Connection,
    private readonly catalog: PlanCatalogService,
    private readonly emailService: EmailService,
  ) {}

  // =========================================================
  // PLANS
  // =========================================================

  private async billingCurrency(vendorId: string): Promise<'PKR' | 'USD'> {
    this.assertValidId(vendorId);
    const vendor = await this.userModel.findById(vendorId).select('marketplaceCountryCode').lean();
    if (!vendor) throw new NotFoundException('Vendor not found.');
    return vendor.marketplaceCountryCode === 'US' ? 'USD' : 'PKR';
  }

  async getPlans(vendorId: string) {
    const currency = await this.billingCurrency(vendorId);
    const plans = await this.catalog.list();
    return plans.filter(plan => plan.isPurchasable).map(plan => {
      const monthlyPrice = currency === 'USD' ? plan.monthlyPriceUSD : plan.monthlyPrice;
      return {
        ...plan, currency, monthlyPrice: monthlyPrice ?? null,
        isPurchasable: monthlyPrice != null && monthlyPrice > 0,
        priceLabel: monthlyPrice == null ? 'Price not configured' :
          currency === 'USD' ? `$ ${monthlyPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / month` :
            `Rs. ${monthlyPrice.toLocaleString('en-PK')} / month`,
      };
    });
  }

  async getPlanForAccess(key: string) {
    return (await this.catalog.get(key)) ?? (await this.catalog.get(SubscriptionPlan.FREE))!;
  }

  private snapshotPlan(plan: {
    name: string;
    rank: number;
    features: Record<string, boolean>;
    limits: Record<string, number>;
    featureLabels: string[];
  }) {
    return {
      name: plan.name,
      rank: plan.rank,
      features: { ...plan.features },
      limits: { ...plan.limits },
      featureLabels: [...plan.featureLabels],
    };
  }

  // Never resolve paid entitlements against an edited catalog plan.
  // Legacy paid rows without a snapshot are frozen on their first read after
  // deployment. Historical entitlements before that read cannot be recovered.
  async getPlanForSubscription(subscription: VendorSubscription) {
    if (subscription.entitlementSnapshot) return subscription.entitlementSnapshot;
    const currentPlan = await this.getPlanForAccess(subscription.plan);
    const snapshot = this.snapshotPlan(currentPlan);
    if (
      subscription._id &&
      subscription.paymentStatus === PaymentStatus.PAID &&
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED, SubscriptionStatus.SCHEDULED]
        .includes(subscription.status)
    ) {
      const stored = await this.subscriptionModel.findOneAndUpdate(
        { _id: subscription._id, entitlementSnapshot: null },
        { $set: { entitlementSnapshot: snapshot } },
        { new: true },
      );
      if (stored?.entitlementSnapshot) return stored.entitlementSnapshot;
      const existing = await this.subscriptionModel.findById(subscription._id);
      if (existing?.entitlementSnapshot) return existing.entitlementSnapshot;
      // Do not serve a possibly inconsistent value after a concurrent write.
      throw new BadRequestException('Unable to load subscription benefits. Please retry.');
    }
    return currentPlan;
  }

  async getPaymentInstructions(vendorId: string) {
    const currency = await this.billingCurrency(vendorId);
    if (currency === 'USD') {
      // Synthetic-card flow: no external gateway or real card charge.
      // Never return bank credentials or accept a user-supplied card number.
      return { provider: PaymentProvider.CARD_TEST, currency, configured: true };
    }
    const accountTitle = process.env.SUBSCRIPTION_EASYPAISA_ACCOUNT_TITLE?.trim();
    const mobileNumber = process.env.SUBSCRIPTION_EASYPAISA_MOBILE?.trim();
    if (!accountTitle || !mobileNumber) {
      throw new BadRequestException('Easypaisa subscription payment details are not configured.');
    }
    return { provider: PaymentProvider.EASYPAISA, currency, accountTitle, mobileNumber };
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

    await this.activateScheduledSubscription(
      vendorObjectId,
    );

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

    /**
     * Backward compatibility:
     *
     * Old database rows may still contain:
     *
     * plan = FREE
     *
     * Convert them into the new BASIC trial lifecycle.
     */
    if (
      current.plan === SubscriptionPlan.FREE ||
      String(current.plan) === 'trial'
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
  // AUTOMATIC SCHEDULED ACTIVATION
  // =========================================================

  private async activateScheduledSubscription(
    vendorObjectId: Types.ObjectId,
  ): Promise<void> {
    const due = await this.subscriptionModel.exists({
      vendorId: vendorObjectId,
      status: SubscriptionStatus.SCHEDULED,
      paymentStatus: PaymentStatus.PAID,
      isCurrent: false,
      scheduledActivationDate: { $lte: new Date() },
    });
    if (!due) return;

    await this.connection.transaction(async (session) => {
      const lock = await this.userModel.updateOne(
        { _id: vendorObjectId },
        { $currentDate: { updatedAt: true } },
        { session },
      );
      if (!lock.matchedCount) {
        throw new NotFoundException('Vendor not found.');
      }

      const duePlans = await this.subscriptionModel.find({
        vendorId: vendorObjectId,
        status: SubscriptionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PAID,
        isCurrent: false,
        scheduledActivationDate: { $lte: new Date() },
      }).sort({ scheduledActivationDate: 1 }).session(session);

      if (!duePlans.length) return;
      if (duePlans.length > 1) {
        throw new BadRequestException(
          'Multiple scheduled subscriptions need administrator review.',
        );
      }

      const activation = duePlans[0];
      await this.subscriptionModel.updateMany(
        { vendorId: vendorObjectId, isCurrent: true },
        { $set: { isCurrent: false } },
        { session },
      );
      activation.status = activation.endDate &&
        new Date(activation.endDate).getTime() <= Date.now()
        ? SubscriptionStatus.EXPIRED
        : SubscriptionStatus.ACTIVE;
      activation.isCurrent = true;
      activation.scheduledActivationDate = null;
      await activation.save({ session });
    });
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
    plan: string,
    paymentProvider: PaymentProvider,
     paymentReference: string | undefined,
    activationType: SubscriptionActivationType,
    expectedAmount?: number,
    sendReceipt = true,
  ): Promise<VendorSubscriptionDocument> {
    this.assertValidId(vendorId);

    const definition = await this.catalog.getPurchasable(plan);

    this.assertManualPaymentProvider(
      paymentProvider,
    );

        const current = await this.getCurrentSubscription(
      vendorId,
    );

    const currentRank = (await this.getPlanForAccess(current.plan)).rank;

    const hasValidCurrentAccess =
      current.endDate !== null &&
      new Date(current.endDate).getTime() > Date.now() &&
      [
        SubscriptionStatus.TRIAL,
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.CANCELLED,
      ].includes(current.status);

    let planChangeType: SubscriptionPlanChangeType;
    let effectiveActivationType: SubscriptionActivationType;

    if (current.status === SubscriptionStatus.TRIAL) {
      planChangeType = SubscriptionPlanChangeType.NEW_PURCHASE;
      effectiveActivationType = SubscriptionActivationType.IMMEDIATE;
    } else if (!hasValidCurrentAccess) {
      planChangeType = SubscriptionPlanChangeType.NEW_PURCHASE;
      effectiveActivationType = SubscriptionActivationType.IMMEDIATE;
    } else if (current.plan === plan) {
      planChangeType = SubscriptionPlanChangeType.RENEWAL;
      effectiveActivationType = SubscriptionActivationType.SCHEDULED;
        } else if (definition.rank > currentRank) {
      if (
        activationType !== SubscriptionActivationType.IMMEDIATE &&
        activationType !== SubscriptionActivationType.SCHEDULED
      ) {
        throw new BadRequestException(
          'Choose immediate or scheduled activation for your upgrade.',
        );
      }

      planChangeType = SubscriptionPlanChangeType.UPGRADE;
      effectiveActivationType = activationType;
    } else {
      planChangeType = SubscriptionPlanChangeType.DOWNGRADE;
      effectiveActivationType = SubscriptionActivationType.SCHEDULED;
    }

    const vendorObjectId =
      new Types.ObjectId(vendorId);

          const existingScheduled =
      await this.subscriptionModel.findOne({
        vendorId: vendorObjectId,
        status: SubscriptionStatus.SCHEDULED,
        paymentStatus: PaymentStatus.PAID,
      });

    if (existingScheduled) {
      throw new BadRequestException(
        'You already have an approved scheduled subscription. Wait until it activates before purchasing another plan.',
      );
    }

    const currency = await this.billingCurrency(vendorId);
    const amountDue = currency === 'USD' ? definition.monthlyPriceUSD : definition.monthlyPrice;
    const instructions = await this.getPaymentInstructions(vendorId);
    if (paymentProvider !== instructions.provider) {
      throw new BadRequestException('Choose the configured payment provider for your country.');
    }
    if (paymentProvider === PaymentProvider.CARD_TEST && currency !== 'USD') {
      throw new BadRequestException('Test card subscriptions are available only for USA vendors.');
    }

    /**
     * Backend is the source of truth.
     *
     * Vendor/mobile frontend can NEVER provide
     * subscription price.
     */
    if (
      amountDue === null ||
      amountDue <= 0
    ) {
      throw new BadRequestException(
        `${definition.name} subscription price has not been configured by Eventify Hub yet.`,
      );
    }

    if (expectedAmount !== undefined && expectedAmount !== amountDue) {
      throw new BadRequestException('This plan price changed. Refresh the plans and contact support if you already paid.');
    }

    // Generate the reference on the server for synthetic cards. No fake
    // transaction reference or card credentials are submitted by the client.
    const normalizedReference = paymentProvider === PaymentProvider.CARD_TEST
      ? `TEST-CARD-${randomUUID().toUpperCase()}`
      : paymentReference?.trim().toUpperCase();

    if (
      !normalizedReference ||
      normalizedReference.length < 2
    ) {
      throw new BadRequestException(
        'Payment reference is required.',
      );
    }

    /**
     * Vendor cannot submit two simultaneous
     * pending subscription payments.
     */
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

    /**
     * Same transaction/reference cannot be reused
     * while pending or after being approved.
     */
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

    /**
     * A payment request itself is NOT current
     * subscription access.
     *
     * Example:
     *
     * Current:
     * BASIC + TRIAL
     *
     * Payment request:
     * GROWTH + PENDING_PAYMENT
     *
     * The trial remains usable until Admin approves Growth.
     */
    return this.subscriptionModel.create({
      vendorId:
        vendorObjectId,

        plan,
        entitlementSnapshot: this.snapshotPlan(definition),

      planChangeType,

      activationType: effectiveActivationType,

      scheduledActivationDate: null,

      status:
        SubscriptionStatus.PENDING_PAYMENT,

      /**
       * Actual billing start date is reset
       * when Admin approves the payment.
       */
      startDate:
        now,

      endDate:
        null,

      paymentStatus:
        PaymentStatus.PENDING,

      paymentProvider,
      sendReceipt,

      paymentReference:
        normalizedReference,

      /**
       * Backend-controlled price snapshot.
       */
      amountDue,
      currency,

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
      /**
       * Demo subscriptions are not real
       * subscription payments.
       */
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

      if (!PLAN_KEY.test(normalizedPlan)) {
        throw new BadRequestException('Invalid subscription plan.');
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

             activationType:
        subscription.activationType ?? null,

      planChangeType:
        subscription.planChangeType ?? null,

      scheduledActivationDate:
        subscription.scheduledActivationDate ?? null,
            paymentStatus:
              subscription.paymentStatus,

            paymentProvider:
              subscription.paymentProvider,

            paymentReference:
              subscription.paymentReference ??
              null,

            currency: subscription.currency ?? 'PKR',

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
    if (!Types.ObjectId.isValid(subscriptionId)) {
      throw new BadRequestException('Invalid subscriptionId.');
    }
    if (!Types.ObjectId.isValid(adminId)) {
      throw new BadRequestException('Invalid Admin account.');
    }

    const normalizedDecision = decision?.toUpperCase();
    if (normalizedDecision !== 'PAID' && normalizedDecision !== 'FAILED') {
      throw new BadRequestException('Decision must be PAID or FAILED.');
    }
    const rejectionReason = reason?.trim();
    if (normalizedDecision === 'FAILED' && !rejectionReason) {
      throw new BadRequestException('A rejection reason is required.');
    }

    // All payment and entitlement writes commit or roll back together.
    // This Mongoose version returns void from connection.transaction().
    let reviewedSubscription: VendorSubscriptionDocument | null = null;

    await this.connection.transaction(
      async (session): Promise<void> => {
        const paymentRequest = await this.subscriptionModel
          .findById(subscriptionId)
          .session(session);
        if (!paymentRequest) {
          throw new NotFoundException('Subscription payment request not found.');
        }

        // A write to the same vendor serializes concurrent reviews/activations.
        const lock = await this.userModel.updateOne(
          { _id: paymentRequest.vendorId },
          { $currentDate: { updatedAt: true } },
          { session },
        );
        if (!lock.matchedCount) {
          throw new NotFoundException('Vendor not found.');
        }

        if (
          paymentRequest.paymentStatus !== PaymentStatus.PENDING ||
          paymentRequest.status !== SubscriptionStatus.PENDING_PAYMENT
        ) {
          throw new BadRequestException(
            'This subscription payment has already been reviewed.',
          );
        }

        const now = new Date();
        paymentRequest.verifiedAt = now;
        paymentRequest.verifiedBy = new Types.ObjectId(adminId);
        paymentRequest.isCurrent = false;

        if (normalizedDecision === 'FAILED') {
          paymentRequest.paymentStatus = PaymentStatus.FAILED;
          paymentRequest.status = SubscriptionStatus.REJECTED;
          paymentRequest.amountPaid = 0;
          paymentRequest.rejectionReason = rejectionReason || null;
          await paymentRequest.save({ session });
          reviewedSubscription = paymentRequest;
          return;
        }

        const price = Number(paymentRequest.amountDue ?? 0);
        if (!Number.isFinite(price) || price <= 0) {
          throw new BadRequestException(
            'This payment request does not contain a valid backend price snapshot.',
          );
        }

        const existingScheduled = await this.subscriptionModel.exists({
          vendorId: paymentRequest.vendorId,
          _id: { $ne: paymentRequest._id },
          status: SubscriptionStatus.SCHEDULED,
          paymentStatus: PaymentStatus.PAID,
        }).session(session);
        if (existingScheduled) {
          throw new BadRequestException(
            'An approved scheduled subscription already exists for this vendor.',
          );
        }

        const currentSubscriptions = await this.subscriptionModel.find({
          vendorId: paymentRequest.vendorId,
          isCurrent: true,
        }).session(session);
        if (currentSubscriptions.length > 1) {
          throw new BadRequestException(
            'Duplicate current subscriptions require administrator cleanup before approval.',
          );
        }
        const current = currentSubscriptions[0] || null;
        const currentEndDate = current?.endDate
          ? new Date(current.endDate)
          : null;
        const shouldSchedule =
          paymentRequest.activationType === SubscriptionActivationType.SCHEDULED &&
          currentEndDate !== null &&
          currentEndDate.getTime() > now.getTime() &&
          current?.status !== SubscriptionStatus.TRIAL;

        const startDate = shouldSchedule && currentEndDate
          ? currentEndDate
          : now;
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + SUBSCRIPTION_DURATION_DAYS);

        if (!shouldSchedule) {
          await this.subscriptionModel.updateMany(
            { vendorId: paymentRequest.vendorId, isCurrent: true },
            { $set: { isCurrent: false } },
            { session },
          );
        }

        paymentRequest.status = shouldSchedule
          ? SubscriptionStatus.SCHEDULED
          : SubscriptionStatus.ACTIVE;
        paymentRequest.scheduledActivationDate = shouldSchedule ? startDate : null;
        paymentRequest.paymentStatus = PaymentStatus.PAID;
        paymentRequest.amountPaid = price;
        paymentRequest.startDate = startDate;
        paymentRequest.endDate = endDate;
        paymentRequest.rejectionReason = null;
        paymentRequest.cancelledReason = null;
        paymentRequest.isCurrent = !shouldSchedule;
        await paymentRequest.save({ session });
        reviewedSubscription = paymentRequest;
        return;
      },
    );

    if (!reviewedSubscription) {
      throw new Error('Subscription review did not complete.');
    }

    // Payment and access changes must commit before sending any email.
    if (reviewedSubscription.paymentStatus === PaymentStatus.PAID &&
        reviewedSubscription.sendReceipt !== false && this.emailService) {
      try {
        const vendor = await this.userModel.findById(reviewedSubscription.vendorId)
          .select('email name contactDetails.brandName').lean();
        if (vendor?.email) {
          const planName = reviewedSubscription.entitlementSnapshot?.name ||
            (await this.catalog.get(reviewedSubscription.plan))?.name || reviewedSubscription.plan;
          await this.emailService.sendTransactionalEmail({
            to: vendor.email,
            senderName: 'Eventify Hub',
            subject: 'Subscription Payment Receipt — ' + planName + ' | Eventify Hub',
            html: this.buildSubscriptionPaymentReceiptEmail({
              vendorName: vendor.name || 'Vendor',
              brandName: vendor.contactDetails?.brandName || null,
              planName,
              amount: reviewedSubscription.amountPaid,
              currency: reviewedSubscription.currency || 'PKR',
              provider: reviewedSubscription.paymentProvider,
              reference: reviewedSubscription.paymentReference || 'N/A',
              verifiedAt: reviewedSubscription.verifiedAt,
              startsAt: reviewedSubscription.startDate,
              endsAt: reviewedSubscription.endDate,
              scheduled: reviewedSubscription.status === SubscriptionStatus.SCHEDULED,
            }),
          });
        }
      } catch (error) {
        console.error('[Subscription Payment Receipt Email Failed]',
          error instanceof Error ? error.message : error);
      }
    }

    return reviewedSubscription;
  }

  private buildSubscriptionPaymentReceiptEmail(data: {
    vendorName: string;
    brandName?: string | null;
    planName: string;
    amount: number;
    currency: 'PKR' | 'USD';
    provider: PaymentProvider;
    reference: string;
    verifiedAt: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
    scheduled: boolean;
  }): string {
    const amountFormatted = Number(data.amount || 0).toLocaleString(
      data.currency === 'USD' ? 'en-US' : 'en-PK',
      { minimumFractionDigits: data.currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 },
    );
    const money = (data.currency === 'USD' ? '$ ' : 'Rs. ') + amountFormatted;
    const date = (value?: Date | null) => value && Number.isFinite(new Date(value).getTime())
      ? new Date(value).toLocaleString('en-GB', {
          dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC', hour12: true,
        }) + ' (UTC)'
      : 'N/A';
    const method = data.provider === PaymentProvider.CARD_TEST ? 'Credit / Debit Card (Test)' :
      data.provider === PaymentProvider.EASYPAISA ? 'Easypaisa' :
      data.provider === PaymentProvider.BANK_TRANSFER ? 'Bank Transfer' : data.provider;
    const content = [
      '<div style="font-size:22px;font-weight:700;color:#278A4B;">Payment Successful</div>',
      '<p>Your subscription payment has been verified and approved by Eventify Hub.</p>',
      emailReceiptSection('Subscription Details', [
        ['Vendor', data.vendorName],
        ['Business', data.brandName || data.vendorName],
        ['Plan', data.planName],
        ['Activation', data.scheduled ? 'Scheduled after current plan expires' : 'Active'],
        ['Starts At', date(data.startsAt)],
        ['Valid Until', date(data.endsAt)],
      ]),
      emailReceiptSection('Payment Details', [
        ['Amount Paid', money],
        ['Payment Method', method],
        ['Transaction Reference', data.reference],
        ['Verified At', date(data.verifiedAt)],
        ['Payment Status', 'Paid — Admin Verified'],
      ]),
      '<p style="margin-top:24px;color:#766B73;">' +
        (data.scheduled ? 'Your current plan remains active until the scheduled start date. ' : '') +
        'You can view your subscription details inside the Eventify Hub app.</p>',
    ].join('');
    return renderEventifyPaymentEmail('Subscription Payment Receipt', content);
  }

  // =========================================================
  // DEVELOPMENT-ONLY DEMO ACTIVATION
  // =========================================================

  /**
   * Kept temporarily for backward compatibility.
   *
   * Production Vendor UI must not use this flow.
   */
  async activateDemoPlan(
    vendorId: string,
    plan: SubscriptionPlan,
  ): Promise<VendorSubscriptionDocument> {
    this.assertValidId(vendorId);

    const demoDefinition = await this.catalog.getPurchasable(plan);

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
      entitlementSnapshot: this.snapshotPlan(demoDefinition),

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

    /**
     * BASIC trial cannot be cancelled as
     * a paid subscription because it has
     * no renewal/payment yet.
     */
    if (
      current.status ===
        SubscriptionStatus.TRIAL ||
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

      const accessAllowed =
  subscription.status === SubscriptionStatus.TRIAL ||
  subscription.status === SubscriptionStatus.ACTIVE ||
  (
    subscription.status === SubscriptionStatus.CANCELLED &&
    Boolean(
      subscription.endDate &&
      new Date(subscription.endDate).getTime() > Date.now()
    )
  );

    /**
     * Trial is now lifecycle status,
     * not SubscriptionPlan.TRIAL.
     */
    const isTrial =
      subscription.status ===
      SubscriptionStatus.TRIAL;

    /**
     * BASIC during TRIAL is not a paid plan.
     *
     * A paid plan must be:
     *
     * status        = ACTIVE
     * paymentStatus = PAID
     */
    const isPaidPlan =
      (subscription.status === SubscriptionStatus.ACTIVE ||
        (subscription.status === SubscriptionStatus.CANCELLED && accessAllowed)) &&
      subscription.paymentStatus ===
        PaymentStatus.PAID &&
      subscription.plan !== SubscriptionPlan.FREE;

    /**
     * Payment request exists separately from
     * current access so active trial/paid plan
     * remains untouched until approval.
     */
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

        const scheduledSubscription =
  await this.subscriptionModel
    .findOne({
      vendorId: new Types.ObjectId(vendorId),
      status: SubscriptionStatus.SCHEDULED,
      paymentStatus: PaymentStatus.PAID,
      isCurrent: false,
    })
    .sort({ scheduledActivationDate: 1 })
    .lean();

    const planDefinition = await this.getPlanForSubscription(subscription);

/**
 * Expired vendors keep their historical plan,
 * but subscription-controlled entitlements
 * must no longer be usable.
 *
 * We do NOT delete packages/images here.
 * Actual create/upload enforcement will be
 * added in Phase 14A.7.
 */
const entitlementFeatures =
  expired
    ? Object.fromEntries(
        Object.keys(
          planDefinition.features,
        ).map((key) => [
          key,
          false,
        ]),
      )
    : planDefinition.features;

const entitlementLimits =
  expired
    ? Object.fromEntries(
        Object.keys(
          planDefinition.limits,
        ).map((key) => [
          key,
          0,
        ]),
      )
    : planDefinition.limits; 

        return {
      subscription,

      scheduledSubscription: scheduledSubscription
  ? {
      subscriptionId: String(scheduledSubscription._id),
      plan: scheduledSubscription.plan,
      activationType: scheduledSubscription.activationType,
      planChangeType: scheduledSubscription.planChangeType,
      scheduledActivationDate:
        scheduledSubscription.scheduledActivationDate,
      startDate: scheduledSubscription.startDate,
      endDate: scheduledSubscription.endDate,
      paymentStatus: scheduledSubscription.paymentStatus,
    }
  : null,

      isTrial,
     
      effectivePlan:
  subscription.plan,
      planName: planDefinition.name,
      planRank: planDefinition.rank,
      featureLabels: accessAllowed ? planDefinition.featureLabels : [],

features:
  entitlementFeatures,

limits:
  entitlementLimits,

isPaidPlan,
       accessAllowed,
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

      /**
       * Authoritative backend values.
       *
       * Mobile should display these instead
       * of calculating its own trial duration.
       */
      trialDaysRemaining:
        isTrial &&
        !expired
          ? remainingDays
          : 0,

      daysRemaining:
        !expired
          ? remainingDays
          : 0,

      trialEndDate:
        isTrial
          ? subscription.endDate
          : null,
    };
  }

  // =========================================================
  // INITIAL 7-DAY BASIC TRIAL
  // =========================================================

  private async createInitialTrial(
  vendorObjectId: Types.ObjectId,
): Promise<VendorSubscriptionDocument> {
  const existing = await this.subscriptionModel.findOne({
    vendorId: vendorObjectId,
    isCurrent: true,
  });

  if (existing) return existing;

  await this.connection.transaction(async (session): Promise<void> => {
    const vendor = await this.userModel
      .findOneAndUpdate(
        { _id: vendorObjectId },
        { $currentDate: { updatedAt: true } },
        { new: true, session },
      )
      .select('_id role createdAt created_at');

    if (!vendor) {
      throw new NotFoundException('Vendor not found.');
    }

    if (String(vendor.role).toLowerCase() !== 'vendor') {
      throw new BadRequestException(
        'Subscription is available only for Vendor accounts.',
      );
    }

    const current = await this.subscriptionModel
      .findOne({
        vendorId: vendorObjectId,
        isCurrent: true,
      })
      .session(session);

    if (current) return;

    const vendorCreatedAt = (vendor as any).createdAt
  ? new Date((vendor as any).createdAt)
  : vendor.created_at
    ? new Date(vendor.created_at)
    : null;

if (!vendorCreatedAt || !Number.isFinite(vendorCreatedAt.getTime())) {
  throw new BadRequestException(
    'Vendor creation date is missing or invalid. Trial cannot be initialized.',
  );
}

    const trialEndDate = new Date(vendorCreatedAt);

    trialEndDate.setDate(
      trialEndDate.getDate() + VENDOR_TRIAL_DURATION_DAYS,
    );

    const alreadyExpired =
      trialEndDate.getTime() <= Date.now();

    await this.subscriptionModel.create(
      [
        {
          vendorId: vendorObjectId,
          plan: SubscriptionPlan.BASIC,
          status: alreadyExpired
            ? SubscriptionStatus.EXPIRED
            : SubscriptionStatus.TRIAL,
          startDate: vendorCreatedAt,
          endDate: trialEndDate,
          paymentStatus: PaymentStatus.NONE,
          paymentProvider: PaymentProvider.NONE,
          paymentReference: null,
          amountDue: 0,
          amountPaid: 0,
          paymentSubmittedAt: null,
          verifiedAt: null,
          verifiedBy: null,
          rejectionReason: null,
          isCurrent: true,
          cancelledReason: null,
        },
      ],
      { session },
    );
  });

  const subscription = await this.subscriptionModel.findOne({
    vendorId: vendorObjectId,
    isCurrent: true,
  });

  if (!subscription) {
    throw new Error('Initial subscription could not be created.');
  }

  return subscription;
}

  // =========================================================
  // LEGACY FREE → BASIC TRIAL MIGRATION
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

    /**
     * Use original account creation date.
     *
     * Never grant seven fresh days simply because
     * an old FREE document is being migrated now.
     */
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

    /**
     * Legacy FREE becomes BASIC entitlement.
     */
    subscription.plan =
      SubscriptionPlan.BASIC;

    subscription.startDate =
      vendorCreatedAt;

    subscription.endDate =
      trialEndDate;

    subscription.status =
      trialEndDate.getTime() <=
      Date.now()
        ? SubscriptionStatus.EXPIRED
        : SubscriptionStatus.TRIAL;

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

    /**
     * Pending/rejected payment records are not
     * lifecycle entitlements and should not be
     * automatically expired here.
     */
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

    /**
     * Applies to:
     *
     * TRIAL
     * ACTIVE
     * CANCELLED
     *
     * once their endDate is reached.
     */
    subscription.status =
      SubscriptionStatus.EXPIRED;

    /**
     * Keep expired entitlement as current.
     *
     * This allows subscription/access endpoints
     * to return:
     *
     * subscriptionRequired = true
     *
     * instead of silently creating a fresh trial.
     */
    subscription.isCurrent =
      true;

    await subscription.save();

    return subscription;
  }

  // =========================================================
  // VALIDATION
  // =========================================================

  private assertManualPaymentProvider(
    provider: PaymentProvider,
  ) {
    if (
      ![
        PaymentProvider.BANK_TRANSFER,
        PaymentProvider.CARD_TEST,
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