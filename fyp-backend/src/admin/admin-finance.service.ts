// fyp-backend/src/admin/admin-finance.service.ts

import {
  Injectable,
} from '@nestjs/common';

import {
  InjectModel,
} from '@nestjs/mongoose';

import {
  Model,
} from 'mongoose';

import {
  Payment,
} from 'src/schemas/payment.schema';

import {
  Refund,
} from 'src/schemas/refund.schema';

import {
  Payout,
} from 'src/schemas/payout.schema';

import {
  SubscriptionService,
} from '../vendor/growth/subscription/subscription.service';

@Injectable()
export class AdminFinanceService {
  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel:
      Model<Payment>,

    @InjectModel(Refund.name)
    private readonly refundModel:
      Model<Refund>,

    @InjectModel(Payout.name)
    private readonly payoutModel:
      Model<Payout>,

    // Reuse the existing centralized subscription service.
    // Do NOT duplicate subscription activation logic here.
    private readonly subscriptionService:
      SubscriptionService,
  ) {}

  // =========================================================
  // BOOKING PAYMENTS
  // =========================================================

  async getPayments(
    status?: string,
    limit = 20,
    skip = 0,
  ) {
    const normalizedStatus =
      status &&
      status !== 'ALL'
        ? status.toUpperCase()
        : undefined;

    const query:
      Record<string, unknown> =
      normalizedStatus
        ? {
            status:
              normalizedStatus,
          }
        : {};

    const payments =
      await this.paymentModel
        .find(query)
        .populate(
          'vendorOrderId',
          'serviceName price downPaymentType downPaymentPercentage downPaymentAmount remainingAmount paymentStatus status',
        )
        .populate(
          'organizerId',
          'name email phone_number',
        )
        .populate(
          'vendorId',
          'name email phone_number',
        )
        .sort({
          createdAt: -1,
        })
        .skip(
          Number(skip),
        )
        .limit(
          Number(limit),
        )
        .lean();

    const vendorOrderIds =
      payments
        .map(
          (payment: any) =>
            payment.vendorOrderId
              ?._id,
        )
        .filter(Boolean);

    const successfulPaymentTotals =
      vendorOrderIds.length > 0
        ? await this.paymentModel.aggregate([
            {
              $match: {
                vendorOrderId: {
                  $in:
                    vendorOrderIds,
                },

                status:
                  'SUCCESS',
              },
            },
            {
              $group: {
                _id:
                  '$vendorOrderId',

                paidSoFar: {
                  $sum:
                    '$amount',
                },
              },
            },
          ])
        : [];

    const paidMap =
      new Map<
        string,
        number
      >();

    for (
      const item of successfulPaymentTotals
    ) {
      paidMap.set(
        String(
          item._id,
        ),
        Number(
          item.paidSoFar ||
            0,
        ),
      );
    }

    return payments.map(
      (payment: any) => {
        const vendorOrder =
          payment.vendorOrderId;

        const vendorOrderId =
          String(
            vendorOrder?._id ??
              payment.vendorOrderId ??
              '',
          );

        const totalBookingAmount =
          Number(
            vendorOrder?.price ??
              0,
          );

        const paidSoFar =
          paidMap.get(
            vendorOrderId,
          ) ?? 0;

        const outstandingAmount =
          Math.max(
            totalBookingAmount -
              paidSoFar,
            0,
          );

        return {
          paymentId:
            String(
              payment._id,
            ),

          vendorOrderId,

          orderId:
            String(
              payment.orderId ??
                '',
            ),

          client:
            payment.organizerId
              ? {
                  id: String(
                    payment
                      .organizerId
                      ._id,
                  ),

                  name:
                    payment
                      .organizerId
                      .name ??
                    'Unknown Client',

                  email:
                    payment
                      .organizerId
                      .email ??
                    null,

                  phone:
                    payment
                      .organizerId
                      .phone_number ??
                    null,
                }
              : null,

          vendor:
            payment.vendorId
              ? {
                  id: String(
                    payment
                      .vendorId
                      ._id,
                  ),

                  name:
                    payment
                      .vendorId
                      .name ??
                    'Unknown Vendor',

                  email:
                    payment
                      .vendorId
                      .email ??
                    null,

                  phone:
                    payment
                      .vendorId
                      .phone_number ??
                    null,
                }
              : null,

          booking:
            vendorOrder
              ? {
                  serviceName:
                    vendorOrder
                      .serviceName ??
                    'N/A',

                  bookingStatus:
                    vendorOrder
                      .status ??
                    null,

                  totalAmount:
                    totalBookingAmount,

                  downPaymentType:
                    vendorOrder
                      .downPaymentType ??
                    null,

                  downPaymentPercentage:
                    vendorOrder
                      .downPaymentPercentage ??
                    null,

                  downPaymentAmount:
                    Number(
                      vendorOrder
                        .downPaymentAmount ??
                        0,
                    ),

                  configuredRemainingAmount:
                    Number(
                      vendorOrder
                        .remainingAmount ??
                        0,
                    ),

                  paymentStatus:
                    vendorOrder
                      .paymentStatus ??
                    null,
                }
              : null,

          type:
            payment.type,

          amount:
            Number(
              payment.amount ??
                0,
            ),

          paidSoFar,

          outstandingAmount,

          status:
            payment.status,

          method:
            payment.method ??
            null,

          transactionRef:
            payment.transactionRef ??
            null,

          paidAt:
            payment.paidAt ??
            null,

          failureReason:
            payment.failureReason ??
            null,

          createdAt:
            payment.createdAt ??
            null,

          updatedAt:
            payment.updatedAt ??
            null,
        };
      },
    );
  }

  // =========================================================
  // REFUNDS
  // =========================================================

  async getRefunds(
    status?: string,
    limit = 20,
    skip = 0,
  ) {
    const normalizedStatus =
      status &&
      status !== 'ALL'
        ? status.toUpperCase()
        : undefined;

    const query:
      Record<string, unknown> =
      normalizedStatus
        ? {
            status:
              normalizedStatus,
          }
        : {};

    const refunds =
      await this.refundModel
        .find(query)
        .populate(
          'vendorOrderId',
          'serviceName price status cancellationReason cancelledBy cancelledAt',
        )
        .populate(
          'organizerId',
          'name email phone_number',
        )
        .populate(
          'vendorId',
          'name email phone_number',
        )
        .sort({
          createdAt: -1,
        })
        .skip(
          Number(skip),
        )
        .limit(
          Number(limit),
        )
        .lean();

    return refunds.map(
      (refund: any) => ({
        refundId:
          String(
            refund._id,
          ),

        vendorOrderId:
          String(
            refund.vendorOrderId
              ?._id ??
              refund.vendorOrderId ??
              '',
          ),

        orderId:
          String(
            refund.orderId ??
              '',
          ),

        client:
          refund.organizerId
            ? {
                id: String(
                  refund
                    .organizerId
                    ._id,
                ),

                name:
                  refund
                    .organizerId
                    .name ??
                  'Unknown Client',

                email:
                  refund
                    .organizerId
                    .email ??
                  null,

                phone:
                  refund
                    .organizerId
                    .phone_number ??
                  null,
              }
            : null,

        vendor:
          refund.vendorId
            ? {
                id: String(
                  refund
                    .vendorId
                    ._id,
                ),

                name:
                  refund
                    .vendorId
                    .name ??
                  'Unknown Vendor',

                email:
                  refund
                    .vendorId
                    .email ??
                  null,

                phone:
                  refund
                    .vendorId
                    .phone_number ??
                  null,
              }
            : null,

        booking:
          refund.vendorOrderId
            ? {
                serviceName:
                  refund
                    .vendorOrderId
                    .serviceName ??
                  'N/A',

                totalAmount:
                  Number(
                    refund
                      .vendorOrderId
                      .price ??
                      0,
                  ),

                status:
                  refund
                    .vendorOrderId
                    .status ??
                  null,

                cancelledBy:
                  refund
                    .vendorOrderId
                    .cancelledBy ??
                  null,

                cancelledAt:
                  refund
                    .vendorOrderId
                    .cancelledAt ??
                  null,

                cancellationReason:
                  refund
                    .vendorOrderId
                    .cancellationReason ??
                  null,
              }
            : null,

        amountPaid:
          Number(
            refund.amountPaid ??
              0,
          ),

        refundAmount:
          Number(
            refund.refundAmount ??
              0,
          ),

        withheldAmount:
          Number(
            refund.withheldAmount ??
              0,
          ),

        initiatedBy:
          refund.initiatedBy,

        daysBeforeEvent:
          Number(
            refund.daysBeforeEvent ??
              0,
          ),

        cancellationPolicyApplied:
          refund
            .cancellationPolicyApplied,

        status:
          refund.status,

        processedAt:
          refund.processedAt ??
          null,

        refundedAt:
          refund.refundedAt ??
          refund.paidAt ??
          null,

        rejectedAt:
          refund.rejectedAt ??
          null,

        notes:
          refund.notes ??
          null,

        createdAt:
          refund.createdAt ??
          null,

        updatedAt:
          refund.updatedAt ??
          null,
      }),
    );
  }

  async updateRefundStatus(
    refundId: string,

    status:
      | 'PENDING'
      | 'PROCESSING'
      | 'REFUNDED'
      | 'REJECTED',
  ) {
    const refund =
      await this.refundModel
        .findById(
          refundId,
        );

    if (!refund) {
      return null;
    }

    refund.status =
      status;

    if (
      status ===
      'PENDING'
    ) {
      refund.processedAt =
        null;

      refund.refundedAt =
        null;

      refund.rejectedAt =
        null;
    }

    if (
      status ===
      'PROCESSING'
    ) {
      refund.processedAt =
        new Date();

      refund.refundedAt =
        null;

      refund.rejectedAt =
        null;
    }

    if (
      status ===
      'REFUNDED'
    ) {
      refund.refundedAt =
        new Date();

      refund.rejectedAt =
        null;
    }

    if (
      status ===
      'REJECTED'
    ) {
      refund.rejectedAt =
        new Date();

      refund.refundedAt =
        null;
    }

    return refund.save();
  }

  // =========================================================
  // SUBSCRIPTION PAYMENTS
  // =========================================================

  async getSubscriptionPayments(
    status?: string,
    plan?: string,
    limit = 20,
    skip = 0,
  ) {
    return this.subscriptionService
      .getAdminSubscriptionPayments(
        status,
        plan,
        limit,
        skip,
      );
  }

  async reviewSubscriptionPayment(
    subscriptionId: string,

    decision:
      | 'PAID'
      | 'FAILED',

    adminId: string,

    reason?: string,
  ) {
    return this.subscriptionService
      .reviewSubscriptionPayment(
        subscriptionId,
        decision,
        adminId,
        reason,
      );
  }

  // =========================================================
  // LEGACY PAYOUTS
  // =========================================================
  // Preserved for now.
  // Current subscription-only platform revenue model
  // does not require platform booking payouts.

  async getPayouts(
    status?: string,
    limit = 20,
    skip = 0,
  ) {
    const query:
      Record<string, unknown> =
      status &&
      status !== 'ALL'
        ? {
            status:
              status.toUpperCase(),
          }
        : {};

    return this.payoutModel
      .find(query)
      .populate(
        'vendorId',
        'name contactDetails',
      )
      .populate(
        'vendorOrderId',
        'serviceName',
      )
      .sort({
        createdAt: -1,
      })
      .skip(
        Number(skip),
      )
      .limit(
        Number(limit),
      )
      .lean();
  }
}