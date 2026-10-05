import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VendorOrder } from 'src/schemas/vendor-order.schema';
import { Order } from 'src/schemas/order.schema';
import { Payment } from 'src/schemas/payment.schema';
import { PaymentBreakdown } from './payment.types';
import { PayoutService } from 'src/payout/payout.service';

@Injectable()
export class PaymentService {
    constructor(
        @InjectModel(VendorOrder.name)
        private readonly vendorOrderModel: Model<VendorOrder>,

        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,

        @InjectModel(Payment.name)
        private readonly paymentModel: Model<Payment>,

        private readonly payoutService: PayoutService,
    ) {}

    private async assertOrganizerOwnsVendorOrder(
    vendorOrderId: string,
    organizerId: string,
) {
    const order = await this.orderModel.findOne({
        vendorOrders: vendorOrderId,
    });

    if (!order) {
        throw new NotFoundException(
            'Parent order not found',
        );
    }

    if (
        order.organizerId.toString() !==
        organizerId
    ) {
        throw new ForbiddenException(
            'You do not own this booking.',
        );
    }

    return order;
}

    // ===== Read-only status / breakdown, used by mobile UI =====
    async getPaymentStatus(
    vendorOrderId: string,
    organizerId: string,
): Promise<PaymentBreakdown> {
        const vendorOrder =
            await this.vendorOrderModel.findById(vendorOrderId);

        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

await this.assertOrganizerOwnsVendorOrder(
    vendorOrderId,
    organizerId,
);
        const bookingAmount =
    vendorOrder.finalAmount ??
    vendorOrder.price;

const successfulPayments =
    await this.paymentModel
        .find({
            vendorOrderId: vendorOrder._id,
            status: 'SUCCESS',
        })
        .lean();

const paidAmount =
    successfulPayments.reduce(
        (sum, payment) =>
            sum + Number(payment.amount || 0),
        0,
    );

const outstandingAmount = Math.max(
    bookingAmount - paidAmount,
    0,
);

return {
    vendorOrderId,
    totalAmount: bookingAmount,

    downPaymentType:
        vendorOrder.downPaymentType ?? null,

    downPaymentPercentage:
        vendorOrder.downPaymentPercentage ?? null,

    downPaymentAmount:
        vendorOrder.downPaymentAmount ?? 0,

    remainingAmount:
        vendorOrder.remainingAmount ??
        Math.max(
            bookingAmount -
                Number(
                    vendorOrder.downPaymentAmount ?? 0,
                ),
            0,
        ),

    paidAmount,
    outstandingAmount,

    paymentStatus:
        vendorOrder.paymentStatus,

    paymentDeadline:
        vendorOrder.paymentDeadline ?? null,
};
    }

    // ===== Organizer initiates the down payment =====
    async initiatePayment(
    vendorOrderId: string,
    method: string,
    organizerId: string,
) {
        const vendorOrder =
            await this.vendorOrderModel.findById(vendorOrderId);

        if (!vendorOrder) {
            throw new NotFoundException('Vendor order not found');
        }

        const order =
    await this.assertOrganizerOwnsVendorOrder(
        vendorOrderId,
        organizerId,
    );

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

        const bookingAmount =
    Number(
        vendorOrder.finalAmount ??
        vendorOrder.price,
    )
    if (vendorOrder.downPaymentAmount == null) {
    throw new BadRequestException(
        'Down payment amount not calculated for this booking yet.',
    );
}
const requiredDownPayment =
    Number(
        vendorOrder.downPaymentAmount,
    );

    
if (
    !Number.isFinite(bookingAmount) ||
    bookingAmount < 0
) {
    throw new BadRequestException(
        'Booking amount is invalid.',
    );
}

if (
    !Number.isFinite(requiredDownPayment) ||
    requiredDownPayment < 0 ||
    requiredDownPayment > bookingAmount
) {
    throw new BadRequestException(
        'Down payment amount is invalid for this booking.',
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

        const payment = await this.paymentModel.create({
            vendorOrderId: vendorOrder._id,
            orderId: order._id,
            organizerId: order.organizerId,
            vendorId: vendorOrder.vendorId,
            amount: requiredDownPayment,
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

        const bookingAmount =
    vendorOrder.finalAmount ??
    vendorOrder.price;

if (paidSoFar >= bookingAmount) {
    vendorOrder.paymentStatus = 'PAID';
} else if (paidSoFar > 0) {
    vendorOrder.paymentStatus =
        'PARTIALLY_PAID';
} else {
    vendorOrder.paymentStatus =
        'PAYMENT_REQUIRED';
}

vendorOrder.remainingAmount = Math.max(
    bookingAmount - paidSoFar,
    0,
);

       await vendorOrder.save();

if (
    vendorOrder.status === 'completed' &&
    vendorOrder.paymentStatus === 'PAID'
) {
    try {
        await this.payoutService.createPayoutIfEligible(
            vendorOrder._id.toString(),
        );
    } catch (error) {
        console.log(
            'Payout not created yet:',
            error instanceof Error
                ? error.message
                : error,
        );
    }
}

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

            const bookingAmount =
                vendorOrder.finalAmount ??
                vendorOrder.price;

            if (paidSoFar >= bookingAmount) {
                vendorOrder.paymentStatus = 'PAID';
            } else if (paidSoFar > 0) {
                vendorOrder.paymentStatus =
                    'PARTIALLY_PAID';
            } else {
                vendorOrder.paymentStatus =
                    'PAYMENT_FAILED';
            }

            vendorOrder.remainingAmount = Math.max(
                bookingAmount - paidSoFar,
                0,
            );

            await vendorOrder.save();
        }

        return payment;
    }

    // ===== Pay the remaining balance =====
   async initiateRemainingPayment(
    vendorOrderId: string,
    method: string,
    organizerId: string,
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

        const order =
    await this.assertOrganizerOwnsVendorOrder(
        vendorOrderId,
        organizerId,
    );

        if (
            vendorOrder.paymentStatus !==
            'PARTIALLY_PAID'
        ) {
            throw new ConflictException(
                'Down payment must be completed before paying the remaining amount.',
            );
        }

        if (vendorOrder.status !== 'completed') {
    throw new ConflictException(
        'Remaining payment becomes due only after the service is completed.',
    );
}

        const bookingAmount =
    vendorOrder.finalAmount ??
    vendorOrder.price;

const successfulPayments =
    await this.paymentModel
        .find({
            vendorOrderId: vendorOrder._id,
            status: 'SUCCESS',
        })
        .lean();

const paidSoFar =
    successfulPayments.reduce(
        (sum, payment) =>
            sum + Number(payment.amount || 0),
        0,
    );

    const remaining = Math.max(
        bookingAmount - paidSoFar,
        0,
    );

    if (remaining <= 0) {
        throw new ConflictException(
            'No remaining amount is due for this booking.',
        );
    }

    vendorOrder.remainingAmount = remaining;
    await vendorOrder.save();

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
    organizerId: string,
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
        await this.assertOrganizerOwnsVendorOrder(
            vendorOrderId,
            organizerId,
        );

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

        const bookingAmount =
    vendorOrder.finalAmount ??
    vendorOrder.price;

        const outstandingAmount = Math.max(
            bookingAmount - paidSoFar,
            0,
        );

        return {
            vendorOrderId,
            totalAmount: bookingAmount,
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
            paidSoFar >= bookingAmount,
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
            organizerId: string,
        ) {
            return this.initiatePayment(
                vendorOrderId,
                method,
                organizerId,
            );
        }
}