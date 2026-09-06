// fyp-backend/src/payout/payout.service.ts
import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Order } from 'src/schemas/order.schema';
import { Payout } from 'src/schemas/payout.schema';
import { UpdatePayoutStatusDto } from './dto/update-payout-status.dto';

@Injectable()
export class PayoutService {
    constructor(
        @InjectModel(VendorOrder.name)
        private readonly vendorOrderModel: Model<VendorOrder>,

        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,

        @InjectModel(Payout.name)
        private readonly payoutModel: Model<Payout>,
    ) {}

    // ===== Called when a vendor order transitions to 'completed' AND
    // is fully paid. Creates the payout ledger entry as PENDING. =====
    async createPayoutIfEligible(vendorOrderId: string) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);
        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        if (vendorOrder.status !== 'completed') {
            throw new ConflictException(
                'Vendor order must be completed before a payout can be created.',
            );
        }

        if (vendorOrder.paymentStatus !== 'PAID') {
            throw new ConflictException(
                'Booking must be fully paid before a payout can be created.',
            );
        }

        // Idempotent: don't create a duplicate payout for the same vendor order.
        const existing = await this.payoutModel.findOne({ vendorOrderId: vendorOrder._id });
        if (existing) {
            return existing;
        }

        const order = await this.orderModel.findOne({ vendorOrders: vendorOrder._id });
        if (!order) {
            throw new NotFoundException('Parent order not found');
        }

        // Phase 13: use commission snapshot instead of raw price.
        // Current commission is 0%, so payoutAmount remains 100% of booking price.
        const commissionAmount = vendorOrder.commissionAmount ?? 0;

        const payoutAmount =
            vendorOrder.vendorNetAmount ??
            (vendorOrder.price - commissionAmount);

        const payout = await this.payoutModel.create({
            vendorOrderId: vendorOrder._id,
            orderId: order._id,
            vendorId: vendorOrder.vendorId,
            grossAmount: vendorOrder.price,
            payoutAmount,
            status: 'PENDING',
        });

        return payout;
    }

    async getPayoutStatus(vendorOrderId: string) {
        const payout = await this.payoutModel.findOne({ vendorOrderId });
        if (!payout) {
            throw new NotFoundException('No payout found for this vendor order');
        }
        return payout;
    }

    async getPayoutsForVendor(vendorId: string) {
        return this.payoutModel
            .find({ vendorId })
            .sort({ createdAt: -1 })
            .lean();
    }

    // ===== Admin-driven status transitions: PENDING -> PROCESSING -> PAID =====
    // No real payout gateway wired yet, so this stays a manual/admin-triggered
    // status update — never auto-marked PAID.
    async updatePayoutStatus(payoutId: string, dto: UpdatePayoutStatusDto) {
        const payout = await this.payoutModel.findById(payoutId);
        if (!payout) {
            throw new NotFoundException('Payout not found');
        }

        const validTransitions: Record<string, string[]> = {
            PENDING: ['PROCESSING'],
            PROCESSING: ['PAID', 'PENDING'], // allow reverting if processing fails
            PAID: [], // terminal state
        };

        if (payout.status === dto.status) {
            return payout; // no-op
        }

        if (!validTransitions[payout.status]?.includes(dto.status)) {
            throw new ConflictException(
                `Cannot transition payout from ${payout.status} to ${dto.status}.`,
            );
        }

        payout.status = dto.status;

        if (dto.payoutMethod) payout.payoutMethod = dto.payoutMethod;
        if (dto.payoutReference) payout.payoutReference = dto.payoutReference;
        if (dto.notes) payout.notes = dto.notes;

        if (dto.status === 'PROCESSING') {
            payout.processedAt = new Date();
        }

        if (dto.status === 'PAID') {
            payout.paidAt = new Date();
        }

        return payout.save();
    }
}