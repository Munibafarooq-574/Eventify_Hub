// fyp-backend/src/admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Order } from 'src/schemas/order.schema';
import { Payment } from 'src/schemas/payment.schema';
import { Payout } from 'src/schemas/payout.schema';
import { Refund } from 'src/schemas/refund.schema';
import { AdminDashboardStats, AdminBookingRow } from './admin.types';

const BOOKING_STATUS_FILTERS: Record<string, any> = {
    Pending: { status: 'pending' },
    Accepted: { status: 'accepted' },
    Confirmed: { status: 'accepted', paymentStatus: 'PAID' },
    Completed: { status: 'completed' },
    Cancelled: { status: { $in: ['cancelled', 'cancelled_by_vendor'] } },
    'Payment Pending': { paymentStatus: 'PAYMENT_REQUIRED' },
};

@Injectable()
export class AdminService {
    constructor(
        @InjectModel(VendorOrder.name)
        private readonly vendorOrderModel: Model<VendorOrder>,

        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,

        @InjectModel(Payment.name)
        private readonly paymentModel: Model<Payment>,

        @InjectModel(Payout.name)
        private readonly payoutModel: Model<Payout>,

        @InjectModel(Refund.name)
        private readonly refundModel: Model<Refund>,
    ) {}

    async getDashboardStats(): Promise<AdminDashboardStats> {
        const totalBookings = await this.vendorOrderModel.countDocuments();
        const completedBookings = await this.vendorOrderModel.countDocuments({
            status: 'completed',
        });

        const paidPayments = await this.paymentModel.find({ status: 'SUCCESS' }).lean();
        const grossBookingValue = paidPayments.reduce((sum, p) => sum + p.amount, 0);

        // Commission comes from Payout ledger snapshots (grossAmount - payoutAmount).
        const payouts = await this.payoutModel.find().lean();
        const eventifyCommission = payouts.reduce(
            (sum, p) => sum + (p.grossAmount - p.payoutAmount),
            0,
        );
        const vendorEarnings = payouts.reduce((sum, p) => sum + p.payoutAmount, 0);

        const pendingPayoutDocs = await this.payoutModel.find({
            status: { $in: ['PENDING', 'PROCESSING'] },
        });
        const pendingPayouts = pendingPayoutDocs.reduce(
            (sum, p) => sum + p.payoutAmount,
            0,
        );

        const refundDocs = await this.refundModel.find({ status: 'PAID' });
        const totalRefunds = refundDocs.reduce((sum, r) => sum + r.refundAmount, 0);

        return {
            totalBookings,
            completedBookings,
            grossBookingValue,
            eventifyCommission,
            vendorEarnings,
            pendingPayouts,
            totalRefunds,
        };
    }

    async getBookings(filter?: string, limit = 20, skip = 0): Promise<AdminBookingRow[]> {
        const query: any = {};

        if (filter && filter !== 'All') {
            if (filter === 'Refunded') {
                const refundedIds = await this.refundModel
                    .find({ status: 'PAID' })
                    .distinct('vendorOrderId');
                query._id = { $in: refundedIds };
            } else if (filter === 'Payout Pending') {
                const payoutPendingIds = await this.payoutModel
                    .find({ status: { $in: ['PENDING', 'PROCESSING'] } })
                    .distinct('vendorOrderId');
                query._id = { $in: payoutPendingIds };
            } else if (BOOKING_STATUS_FILTERS[filter]) {
                Object.assign(query, BOOKING_STATUS_FILTERS[filter]);
            }
        }

        const vendorOrders = await this.vendorOrderModel
            .find(query)
            .populate('vendorId', 'name contactDetails')
            .sort({ createdAt: -1 })
            .skip(Number(skip))
            .limit(Number(limit))
            .lean();

        const rows: AdminBookingRow[] = [];

        for (const vo of vendorOrders) {
            const order = await this.orderModel
                .findOne({ vendorOrders: vo._id })
                .populate('organizerId', 'name')
                .lean();

            const payout = await this.payoutModel.findOne({ vendorOrderId: vo._id }).lean();

            const commission = payout ? payout.grossAmount - payout.payoutAmount : 0;
            const vendorNet = payout ? payout.payoutAmount : vo.price - commission;

            rows.push({
                bookingId: vo._id.toString(),
                organizerName: (order?.organizerId as any)?.name || 'N/A',
                vendorName:
                    (vo.vendorId as any)?.contactDetails?.brandName ||
                    (vo.vendorId as any)?.name ||
                    'N/A',
                eventName: order?.eventName || 'N/A',
                eventDate: order?.eventDate as Date,
                eventTime: order?.eventTime || '',
                amount: vo.price,
                downPayment: vo.downPaymentAmount ?? 0,
                remaining: vo.remainingAmount ?? vo.price,
                commission,
                vendorNet,
                bookingStatus: vo.status,
                paymentStatus: vo.paymentStatus,
                payoutStatus: payout?.status ?? null,
            });
        }

        return rows;
    }

    async getBookingDetail(vendorOrderId: string) {
        const vendorOrder = await this.vendorOrderModel
            .findById(vendorOrderId)
            .populate('vendorId', 'name email phone contactDetails')
            .lean();

        if (!vendorOrder) return null;

        const order = await this.orderModel
            .findOne({ vendorOrders: vendorOrder._id })
            .populate('organizerId', 'name email phone')
            .lean();

        const payments = await this.paymentModel.find({ vendorOrderId }).lean();
        const payout = await this.payoutModel.findOne({ vendorOrderId }).lean();
        const refund = await this.refundModel.findOne({ vendorOrderId }).lean();

        return { vendorOrder, order, payments, payout, refund };
    }
}