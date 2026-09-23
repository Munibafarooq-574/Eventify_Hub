// fyp-backend/src/admin/admin-dispute.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Dispute } from 'src/schemas/dispute.schema';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Order } from 'src/schemas/order.schema';
import { Payment } from 'src/schemas/payment.schema';
import { Refund } from 'src/schemas/refund.schema';

@Injectable()
export class AdminDisputeService {
    constructor(
        @InjectModel(Dispute.name) private readonly disputeModel: Model<Dispute>,
        @InjectModel(VendorOrder.name) private readonly vendorOrderModel: Model<VendorOrder>,
        @InjectModel(Order.name) private readonly orderModel: Model<Order>,
        @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
        @InjectModel(Refund.name) private readonly refundModel: Model<Refund>,
        @InjectConnection() private readonly connection: Connection,
    ) {}

    // Organizer or vendor raises a dispute
    async raiseDispute(
        vendorOrderId: string,
        raisedBy: 'organizer' | 'vendor',
        statement: string,
        evidenceUrls: string[] = [],
    ) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);
        if (!vendorOrder) throw new NotFoundException('Vendor order not found');

        const order = await this.orderModel.findOne({ vendorOrders: vendorOrder._id });
        if (!order) throw new NotFoundException('Parent order not found');

        return this.disputeModel.create({
            vendorOrderId: vendorOrder._id,
            orderId: order._id,
            organizerId: order.organizerId,
            vendorId: vendorOrder.vendorId,
            raisedBy,
            organizerStatement: raisedBy === 'organizer' ? statement : '',
            vendorStatement: raisedBy === 'vendor' ? statement : null,
            evidenceUrls,
            status: 'OPEN',
        });
    }
        // The other party responds with their side
    async addCounterStatement(
        disputeId: string,
        from: 'organizer' | 'vendor',
        statement: string,
    ) {
        const updated = await this.disputeModel.findOneAndUpdate(
            {
                _id: disputeId,
                status: { $in: ['OPEN', 'UNDER_REVIEW'] },
            },
            {
                $set: {
                    ...(from === 'organizer'
                        ? { organizerStatement: statement }
                        : { vendorStatement: statement }),
                    status: 'UNDER_REVIEW',
                },
            },
            { new: true },
        );

        if (updated) {
            return updated;
        }

        const exists = await this.disputeModel.exists({ _id: disputeId });

        if (!exists) {
            throw new NotFoundException('Dispute not found');
        }

        throw new ConflictException('Cannot update a resolved dispute');
    }

    // Full context for admin to review
    async getDisputeDetail(disputeId: string) {
        const dispute = await this.disputeModel
            .findById(disputeId)
            .populate('organizerId', 'name email phone')
            .populate('vendorId', 'name email phone contactDetails')
            .lean();

        if (!dispute) throw new NotFoundException('Dispute not found');

        const vendorOrder = await this.vendorOrderModel.findById(dispute.vendorOrderId).lean();
        const payments = await this.paymentModel.find({ vendorOrderId: dispute.vendorOrderId }).lean();
        const refund = await this.refundModel.findOne({ vendorOrderId: dispute.vendorOrderId }).lean();

        return {
            dispute,
            vendorOrder,
            timeline: {
                acceptedAt: vendorOrder?.acceptedAt,
                cancelledAt: vendorOrder?.cancelledAt,
                cancellationReason: vendorOrder?.cancellationReason,
            },
            payments,
            refund,
        };
    }

        async getDisputes(status?: string, limit = 20, skip = 0) {
        const query = status ? { status } : {};

        const [disputes, total] = await Promise.all([
            this.disputeModel
                .find(query)
                .populate('organizerId', 'name')
                .populate('vendorId', 'name contactDetails')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),

            this.disputeModel.countDocuments(query),
        ]);

        return {
            disputes,
            total,
            limit,
            skip,
        };
    }

        // Admin resolution
    async resolveDispute(
        disputeId: string,
        resolution: 'RESOLVED_ORGANIZER' | 'RESOLVED_VENDOR' | 'RESOLVED_PARTIAL',
        notes?: string,
        partialRefundAmount?: number,
    ) {
        const session = await this.connection.startSession();

        try {
            let resolvedDispute: Dispute | null = null;

            await session.withTransaction(async () => {
                const dispute = await this.disputeModel
                    .findById(disputeId)
                    .session(session);

                if (!dispute) {
                    throw new NotFoundException('Dispute not found');
                }

                if (
                    dispute.status === 'RESOLVED_ORGANIZER' ||
                    dispute.status === 'RESOLVED_VENDOR' ||
                    dispute.status === 'RESOLVED_PARTIAL'
                ) {
                    throw new ConflictException('Dispute is already resolved');
                }

                const needsRefund =
                    resolution === 'RESOLVED_ORGANIZER' ||
                    resolution === 'RESOLVED_PARTIAL';

                let amountPaid = 0;

                if (needsRefund) {
                    const paidPayments = await this.paymentModel
                        .find({
                            vendorOrderId: dispute.vendorOrderId,
                            status: 'SUCCESS',
                        })
                        .session(session);

                    amountPaid = paidPayments.reduce(
                        (sum, payment) => sum + payment.amount,
                        0,
                    );
                }

                if (resolution === 'RESOLVED_PARTIAL') {
                    if (
                        partialRefundAmount === undefined ||
                        !Number.isFinite(partialRefundAmount) ||
                        partialRefundAmount <= 0 ||
                        partialRefundAmount > amountPaid
                    ) {
                        throw new BadRequestException(
                            'Partial refund must be greater than zero and cannot exceed the paid amount',
                        );
                    }
                }

                const updated = await this.disputeModel.findOneAndUpdate(
                    {
                        _id: disputeId,
                        status: { $in: ['OPEN', 'UNDER_REVIEW'] },
                    },
                    {
                        $set: {
                            status: resolution,
                            resolutionNotes: notes || null,
                            resolvedAt: new Date(),
                            ...(resolution === 'RESOLVED_PARTIAL'
                                ? { partialRefundAmount }
                                : {}),
                        },
                    },
                    {
                        new: true,
                        session,
                    },
                );

                if (!updated) {
                    throw new ConflictException('Dispute is already resolved');
                }

                if (needsRefund) {
                    const refundAmount =
                        resolution === 'RESOLVED_PARTIAL'
                            ? partialRefundAmount!
                            : amountPaid;

                    const existingRefund = await this.refundModel
                        .findOne({
                            vendorOrderId: dispute.vendorOrderId,
                        })
                        .session(session);

                    if (!existingRefund) {
                        await this.refundModel.create(
                            [
                                {
                                    vendorOrderId: dispute.vendorOrderId,
                                    orderId: dispute.orderId,
                                    organizerId: dispute.organizerId,
                                    vendorId: dispute.vendorId,
                                    amountPaid,
                                    refundAmount,
                                    withheldAmount: amountPaid - refundAmount,
                                    initiatedBy: 'ORGANIZER_CANCELLED',
                                    daysBeforeEvent: 0,
                                    cancellationPolicyApplied: 'DISPUTE_RESOLUTION',
                                    status: 'PENDING',
                                },
                            ],
                            { session },
                        );
                    }
                }

                resolvedDispute = updated;
            });

            return resolvedDispute;
        } finally {
            await session.endSession();
        }
    }
}