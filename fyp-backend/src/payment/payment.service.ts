// fyp-backend/src/payment/payment.service.ts
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Order } from 'src/schemas/order.schema';
import { Payment } from 'src/schemas/payment.schema';
import { PaymentBreakdown } from './payment.types';

@Injectable()
export class PaymentService {
    constructor(
        @InjectModel(VendorOrder.name)
        private readonly vendorOrderModel: Model<VendorOrder>,

        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,

        @InjectModel(Payment.name)
        private readonly paymentModel: Model<Payment>,
    ) {}

    // ===== Read-only status / breakdown, used by mobile UI =====
    async getPaymentStatus(vendorOrderId: string): Promise<PaymentBreakdown> {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);
        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        return {
            vendorOrderId,
            totalAmount: vendorOrder.price,
            downPaymentType: vendorOrder.downPaymentType || 'PERCENTAGE',
            downPaymentPercentage: vendorOrder.downPaymentPercentage ?? null,
            downPaymentAmount: vendorOrder.downPaymentAmount ?? 0,
            remainingAmount: vendorOrder.remainingAmount ?? vendorOrder.price,
            paymentStatus: vendorOrder.paymentStatus,
            paymentDeadline: vendorOrder.paymentDeadline ?? null,
        };
    }

    // ===== Organizer initiates the down payment =====
    async initiatePayment(vendorOrderId: string, method: string) {
        const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);
        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        if (vendorOrder.paymentStatus === 'PAID') {
            throw new ConflictException('This booking is already paid.');
        }

        if (vendorOrder.paymentStatus !== 'PAYMENT_REQUIRED' &&
            vendorOrder.paymentStatus !== 'PAYMENT_FAILED') {
            throw new ConflictException(
                'Payment is not currently required for this booking.',
            );
        }

        if (vendorOrder.paymentDeadline && vendorOrder.paymentDeadline < new Date()) {
            vendorOrder.paymentStatus = 'PAYMENT_EXPIRED';
            await vendorOrder.save();
            throw new ConflictException('Payment window has expired for this booking.');
        }

        if (vendorOrder.downPaymentAmount == null) {
            throw new BadRequestException(
                'Down payment amount not calculated for this booking yet.',
            );
        }

        const order = await this.orderModel.findOne({ vendorOrders: vendorOrder._id });
        if (!order) {
            throw new NotFoundException('Parent order not found');
        }

        const payment = await this.paymentModel.create({
            vendorOrderId: vendorOrder._id,
            orderId: order._id,
            organizerId: order.organizerId,
            vendorId: vendorOrder.vendorId,
            amount: vendorOrder.downPaymentAmount,
            type: 'DOWN_PAYMENT',
            status: 'PENDING',
            method,
        });

        // NOTE: real gateway integration goes here (JazzCash/Easypaisa/card).
        // Until that's wired, this scaffold requires an explicit confirm/fail
        // call (below) instead of silently marking PAID.
        return payment;
    }

    // ===== Called by gateway webhook (or manually for now) on success =====
    // ===== Called by gateway webhook (or manually for now) on success =====
async confirmPayment(paymentId: string, transactionRef?: string) {
    const payment = await this.paymentModel.findById(paymentId);

    if (!payment) {
        throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'PENDING') {
        throw new ConflictException('Payment already resolved.');
    }

    payment.status = 'SUCCESS';
    payment.transactionRef = transactionRef || null;
    payment.paidAt = new Date();

    await payment.save();

    const vendorOrder = await this.vendorOrderModel.findById(
        payment.vendorOrderId,
    );

    if (vendorOrder) {
        if (payment.type === 'DOWN_PAYMENT') {
            vendorOrder.paymentStatus = 'PAID';
        } else if (payment.type === 'REMAINING') {
            // Remaining payment successfully completed.
            // paymentStatus remains PAID.
            vendorOrder.paymentStatus = 'PAID';
        }

        await vendorOrder.save();
    }

    return payment;
}

    // ===== Called by gateway webhook (or manually for now) on failure =====
    async failPayment(paymentId: string, reason?: string) {
        const payment = await this.paymentModel.findById(paymentId);
        if (!payment) {
            throw new NotFoundException('Payment not found');
        }
        if (payment.status !== 'PENDING') {
            throw new ConflictException('Payment already resolved.');
        }

        payment.status = 'FAILED';
        payment.failureReason = reason || null;
        await payment.save();

        const vendorOrder = await this.vendorOrderModel.findById(payment.vendorOrderId);
        if (vendorOrder) {
            vendorOrder.paymentStatus = 'PAYMENT_FAILED';
            await vendorOrder.save();
        }

        return payment;
    }

    // ===== Phase 7: pay the remaining balance =====
async initiateRemainingPayment(vendorOrderId: string, method: string) {
    const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);

    if (!vendorOrder) {
        throw new NotFoundException('Vendor order not found');
    }

    if (vendorOrder.paymentStatus !== 'PAID') {
        throw new ConflictException(
            'Down payment must be completed before paying the remaining amount.',
        );
    }

    const remaining = vendorOrder.remainingAmount ?? 0;

    if (remaining <= 0) {
        throw new ConflictException(
            'No remaining amount is due for this booking.',
        );
    }

    // Prevent duplicate successful remaining payments
    const existingSuccess = await this.paymentModel.findOne({
        vendorOrderId: vendorOrder._id,
        type: 'REMAINING',
        status: 'SUCCESS',
    });

    if (existingSuccess) {
        throw new ConflictException(
            'Remaining amount has already been paid.',
        );
    }

    const order = await this.orderModel.findOne({
        vendorOrders: vendorOrder._id,
    });

    if (!order) {
        throw new NotFoundException('Parent order not found');
    }

    const payment = await this.paymentModel.create({
        vendorOrderId: vendorOrder._id,
        orderId: order._id,
        organizerId: order.organizerId,
        vendorId: vendorOrder.vendorId,
        amount: remaining,
        type: 'REMAINING',
        status: 'PENDING',
        method,
    });

    // Real payment gateway confirmation will happen later.
    return payment;
}

// ===== Phase 7: booking financial summary =====
async getBookingFinancials(vendorOrderId: string) {
    const vendorOrder = await this.vendorOrderModel.findById(vendorOrderId);

    if (!vendorOrder) {
        throw new NotFoundException('Vendor order not found');
    }

    const payments = await this.paymentModel
        .find({
            vendorOrderId: vendorOrder._id,
            status: 'SUCCESS',
        })
        .lean();

    const paidSoFar = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
    );

    return {
        vendorOrderId,
        totalAmount: vendorOrder.price,
        downPaymentAmount: vendorOrder.downPaymentAmount ?? 0,
        remainingAmount: vendorOrder.remainingAmount ?? 0,
        paidSoFar,
        fullyPaid: paidSoFar >= vendorOrder.price,
        paymentStatus: vendorOrder.paymentStatus,
    };
}
    // ===== Retry after failure =====
    async retryPayment(vendorOrderId: string, method: string) {
        // Simply re-run initiatePayment; PAYMENT_FAILED is an allowed source state.
        return this.initiatePayment(vendorOrderId, method);
    }
}