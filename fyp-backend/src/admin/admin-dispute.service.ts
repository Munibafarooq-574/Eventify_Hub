// fyp-backend/src/admin/admin-dispute.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    async addCounterStatement(disputeId: string, from: 'organizer' | 'vendor', statement: string) {
        const dispute = await this.disputeModel.findById(disputeId);
        if (!dispute) throw new NotFoundException('Dispute not found');

        if (from === 'organizer') {
            dispute.organizerStatement = statement;
        } else {
            dispute.vendorStatement = statement;
        }
        dispute.status = 'UNDER_REVIEW';
        return dispute.save();
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
        const query: any = status ? { status } : {};
        return this.disputeModel
            .find(query)
            .populate('organizerId', 'name')
            .populate('vendorId', 'name contactDetails')
            .sort({ createdAt: -1 })
            .skip(Number(skip))
            .limit(Number(limit))
            .lean();
    }

    // Admin resolution
    async resolveDispute(
        disputeId: string,
        resolution: 'RESOLVED_ORGANIZER' | 'RESOLVED_VENDOR' | 'RESOLVED_PARTIAL',
        notes?: string,
        partialRefundAmount?: number,
    ) {
        const dispute = await this.disputeModel.findById(disputeId);
        if (!dispute) throw new NotFoundException('Dispute not found');

        dispute.status = resolution;
        dispute.resolutionNotes = notes || null;
        dispute.resolvedAt = new Date();

        if (resolution === 'RESOLVED_PARTIAL') {
            dispute.partialRefundAmount = partialRefundAmount ?? 0;
        }

        await dispute.save();

        // If resolution favors the organizer (full or partial), create a
        // Refund record so it flows through the existing Refund ledger.
        if (resolution === 'RESOLVED_ORGANIZER' || resolution === 'RESOLVED_PARTIAL') {
            const paidPayments = await this.paymentModel.find({
                vendorOrderId: dispute.vendorOrderId,
                status: 'SUCCESS',
            });
            const amountPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

            const refundAmount =
                resolution === 'RESOLVED_PARTIAL'
                    ? (partialRefundAmount ?? 0)
                    : amountPaid;

            const existingRefund = await this.refundModel.findOne({
                vendorOrderId: dispute.vendorOrderId,
            });

            if (!existingRefund) {
                await this.refundModel.create({
                    vendorOrderId: dispute.vendorOrderId,
                    orderId: dispute.orderId,
                    organizerId: dispute.organizerId,
                    vendorId: dispute.vendorId,
                    amountPaid,
                    refundAmount,
                    withheldAmount: amountPaid - refundAmount,
                    initiatedBy: 'ORGANIZER_CANCELLED', // reuse enum; dispute-driven refund
                    daysBeforeEvent: 0,
                    cancellationPolicyApplied: 'DISPUTE_RESOLUTION',
                    status: 'PENDING',
                });
            }
        }

        return dispute;
    }
}