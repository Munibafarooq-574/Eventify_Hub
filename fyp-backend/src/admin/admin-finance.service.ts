// fyp-backend/src/admin/admin-finance.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from 'src/schemas/payment.schema';
import { Refund } from 'src/schemas/refund.schema';
import { Payout } from 'src/schemas/payout.schema';

@Injectable()
export class AdminFinanceService {
    constructor(
        @InjectModel(Payment.name) private readonly paymentModel: Model<Payment>,
        @InjectModel(Refund.name) private readonly refundModel: Model<Refund>,
        @InjectModel(Payout.name) private readonly payoutModel: Model<Payout>,
    ) {}

    async getPayments(status?: string, limit = 20, skip = 0) {
        const query: any = status ? { status } : {};
        return this.paymentModel
            .find(query)
            .populate('vendorOrderId', 'serviceName price')
            .sort({ createdAt: -1 })
            .skip(Number(skip))
            .limit(Number(limit))
            .lean();
    }

    async getRefunds(status?: string, limit = 20, skip = 0) {
        const query: any = status ? { status } : {};
        return this.refundModel
            .find(query)
            .populate('vendorOrderId', 'serviceName price')
            .populate('vendorId', 'name contactDetails')
            .sort({ createdAt: -1 })
            .skip(Number(skip))
            .limit(Number(limit))
            .lean();
    }

    async updateRefundStatus(refundId: string, status: 'PENDING' | 'PROCESSING' | 'PAID') {
        const refund = await this.refundModel.findById(refundId);
        if (!refund) return null;
        refund.status = status;
        if (status === 'PROCESSING') refund.processedAt = new Date();
        if (status === 'PAID') refund.paidAt = new Date();
        return refund.save();
    }

    async getPayouts(status?: string, limit = 20, skip = 0) {
        const query: any = status ? { status } : {};
        return this.payoutModel
            .find(query)
            .populate('vendorId', 'name contactDetails')
            .populate('vendorOrderId', 'serviceName')
            .sort({ createdAt: -1 })
            .skip(Number(skip))
            .limit(Number(limit))
            .lean();
    }
}