import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
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
    async getPaymentStatus(
        vendorOrderId: string,
    ): Promise<PaymentBreakdown> {
        const vendorOrder =
            await this.vendorOrderModel.findById(vendorOrderId);

        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        return {
            vendorOrderId,
            totalAmount: vendorOrder.price,
            downPaymentType:
                vendorOrder.downPaymentType || 'PERCENTAGE',
            downPaymentPercentage:
                vendorOrder.downPaymentPercentage ?? null,
            downPaymentAmount:
                vendorOrder.downPaymentAmount ?? 0,
            remainingAmount:
                vendorOrder.remainingAmount ?? vendorOrder.price,
            paymentStatus: vendorOrder.paymentStatus,
            paymentDeadline:
                vendorOrder.paymentDeadline ?? null,
        };
    }

    // ===== Organizer initiates the down payment =====
    async initiatePayment(
        vendorOrderId: string,
        method: string,
    ) {
        const vendorOrder =
            await this.vendorOrderModel.findById(vendorOrderId);

        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        if (vendorOrder.paymentStatus === 'PAID') {
            throw new ConflictException(
                'This booking is already paid.',
            );
        }

        if (
            vendorOrder.paymentStatus !== 'PAYMENT_REQUIRED' &&
            vendorOrder.paymentStatus !== 'PAYMENT_FAILED'
        ) {
            throw new ConflictException(
                'Payment is not currently required for this booking.',
            );
        }

        if (
            vendorOrder.paymentDeadline &&
            vendorOrder.paymentDeadline < new Date()
        ) {
            vendorOrder.paymentStatus = 'PAYMENT_EXPIRED';
            await vendorOrder.save();

            throw new ConflictException(
                'Payment window has expired for this booking.',
            );
        }

        if (vendorOrder.downPaymentAmount == null) {
            throw new BadRequestException(
                'Down payment amount not calculated for this booking yet.',
            );
        }

        // Prevent duplicate pending down-payment transactions
        const existingPendingPayment =
            await this.paymentModel.findOne({
                vendorOrderId: vendorOrder._id,
                type: 'DOWN_PAYMENT',
                status: 'PENDING',
            });

        if (existingPendingPayment) {
            throw new ConflictException(
                'A down payment is already pending for this booking.',
            );
        }

        // Prevent duplicate successful down payment
        const existingSuccessfulDownPayment =
            await this.paymentModel.findOne({
                vendorOrderId: vendorOrder._id,
                type: 'DOWN_PAYMENT',
                status: 'SUCCESS',
            });

        if (existingSuccessfulDownPayment) {
            throw new ConflictException(
                'Down payment has already been completed for this booking.',
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
            amount: vendorOrder.downPaymentAmount,
            type: 'DOWN_PAYMENT',
            status: 'PENDING',
            method,
        });

        // Real gateway integration will confirm or fail this payment later.
        return payment;
    }

    // ===== Called by gateway webhook (or manually for now) on success =====
    async confirmPayment(
        paymentId: string,
        transactionRef?: string,
    ) {
        const payment =
            await this.paymentModel.findById(paymentId);

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.status !== 'PENDING') {
            throw new ConflictException(
                'Payment already resolved.',
            );
        }

        const vendorOrder =
            await this.vendorOrderModel.findById(
                payment.vendorOrderId,
            );

        if (!vendorOrder) {
            throw new NotFoundException(
                'Vendor order not found',
            );
        }

        payment.status = 'SUCCESS';
        payment.transactionRef =
            transactionRef || null;
        payment.paidAt = new Date();

        await payment.save();

        const successfulPayments =
            await this.paymentModel
                .find({
                    vendorOrderId: vendorOrder._id,
                    status: 'SUCCESS',
                })
                .lean();

        const paidSoFar =
            successfulPayments.reduce(
                (sum, item) =>
                    sum + Number(item.amount || 0),
                0,
            );

        if (paidSoFar >= vendorOrder.price) {
            vendorOrder.paymentStatus = 'PAID';
        } else if (paidSoFar > 0) {
            vendorOrder.paymentStatus =
                'PARTIALLY_PAID';
        } else {
            vendorOrder.paymentStatus =
                'PAYMENT_REQUIRED';
        }

        await vendorOrder.save();

        return payment;
    }

    // ===== Called by gateway webhook (or manually for now) on failure =====
    async failPayment(
        paymentId: string,
        reason?: string,
    ) {
        const payment =
            await this.paymentModel.findById(paymentId);

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.status !== 'PENDING') {
            throw new ConflictException(
                'Payment already resolved.',
            );
        }

        payment.status = 'FAILED';
        payment.failureReason = reason || null;

        await payment.save();

        const vendorOrder =
            await this.vendorOrderModel.findById(
                payment.vendorOrderId,
            );

        if (vendorOrder) {
            const successfulPayments =
                await this.paymentModel
                    .find({
                        vendorOrderId:
                            vendorOrder._id,
                        status: 'SUCCESS',
                    })
                    .lean();

            const paidSoFar =
                successfulPayments.reduce(
                    (sum, item) =>
                        sum +
                        Number(item.amount || 0),
                    0,
                );

            if (paidSoFar >= vendorOrder.price) {
                vendorOrder.paymentStatus = 'PAID';
            } else if (paidSoFar > 0) {
                vendorOrder.paymentStatus =
                    'PARTIALLY_PAID';
            } else {
                vendorOrder.paymentStatus =
                    'PAYMENT_FAILED';
            }

            await vendorOrder.save();
        }

        return payment;
    }

    // ===== Pay the remaining balance =====
    async initiateRemainingPayment(
        vendorOrderId: string,
        method: string,
    ) {
        const vendorOrder =
            await this.vendorOrderModel.findById(
                vendorOrderId,
            );

        if (!vendorOrder) {
            throw new NotFoundException(
                'Vendor order not found',
            );
        }

        if (
            vendorOrder.paymentStatus !==
            'PARTIALLY_PAID'
        ) {
            throw new ConflictException(
                'Down payment must be completed before paying the remaining amount.',
            );
        }

        const remaining =
            vendorOrder.remainingAmount ?? 0;

        if (remaining <= 0) {
            throw new ConflictException(
                'No remaining amount is due for this booking.',
            );
        }

        // Prevent duplicate successful remaining payment
        const existingSuccess =
            await this.paymentModel.findOne({
                vendorOrderId: vendorOrder._id,
                type: 'REMAINING',
                status: 'SUCCESS',
            });

        if (existingSuccess) {
            throw new ConflictException(
                'Remaining amount has already been paid.',
            );
        }

        // Prevent duplicate pending remaining payment
        const existingPending =
            await this.paymentModel.findOne({
                vendorOrderId: vendorOrder._id,
                type: 'REMAINING',
                status: 'PENDING',
            });

        if (existingPending) {
            throw new ConflictException(
                'A remaining payment is already pending for this booking.',
            );
        }

        const order =
            await this.orderModel.findOne({
                vendorOrders: vendorOrder._id,
            });

        if (!order) {
            throw new NotFoundException(
                'Parent order not found',
            );
        }

        const payment =
            await this.paymentModel.create({
                vendorOrderId:
                    vendorOrder._id,
                orderId: order._id,
                organizerId:
                    order.organizerId,
                vendorId:
                    vendorOrder.vendorId,
                amount: remaining,
                type: 'REMAINING',
                status: 'PENDING',
                method,
            });

        // Real payment gateway confirmation will happen later.
        return payment;
    }

    // ===== Booking financial summary =====
    async getBookingFinancials(
        vendorOrderId: string,
    ) {
        const vendorOrder =
            await this.vendorOrderModel.findById(
                vendorOrderId,
            );

        if (!vendorOrder) {
            throw new NotFoundException(
                'Vendor order not found',
            );
        }

        const payments =
            await this.paymentModel
                .find({
                    vendorOrderId:
                        vendorOrder._id,
                    status: 'SUCCESS',
                })
                .lean();

        const paidSoFar =
            payments.reduce(
                (sum, payment) =>
                    sum +
                    Number(payment.amount || 0),
                0,
            );

        const outstandingAmount = Math.max(
            vendorOrder.price - paidSoFar,
            0,
        );

        return {
            vendorOrderId,
            totalAmount: vendorOrder.price,
            downPaymentType:
                vendorOrder.downPaymentType ??
                null,
            downPaymentPercentage:
                vendorOrder.downPaymentPercentage ??
                null,
            downPaymentAmount:
                vendorOrder.downPaymentAmount ?? 0,
            remainingAmount:
                vendorOrder.remainingAmount ?? 0,
            paidSoFar,
            outstandingAmount,
            fullyPaid:
                paidSoFar >= vendorOrder.price,
            paymentStatus:
                vendorOrder.paymentStatus,
            paymentDeadline:
                vendorOrder.paymentDeadline ?? null,
        };
    }

    // ===== Retry failed down payment =====
    async retryPayment(
        vendorOrderId: string,
        method: string,
    ) {
        return this.initiatePayment(
            vendorOrderId,
            method,
        );
    }
}