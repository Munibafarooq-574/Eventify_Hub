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
import { User } from 'src/schemas/user.schema';
import { EmailService } from 'src/email/email.service';

@Injectable()
export class PaymentService {
    constructor(
        @InjectModel(VendorOrder.name)
        private readonly vendorOrderModel: Model<VendorOrder>,

        @InjectModel(Order.name)
        private readonly orderModel: Model<Order>,

        @InjectModel(Payment.name)
        private readonly paymentModel: Model<Payment>,

        @InjectModel(User.name)
        private readonly userModel: Model<User>,
        private readonly emailService: EmailService,
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

    const pendingPayment =
    await this.paymentModel
        .findOne({
            vendorOrderId: vendorOrder._id,
            status: 'PENDING',
        })
        .sort({ createdAt: -1 })
        .lean();

const outstandingAmount = Math.max(
    bookingAmount - paidAmount,
    0,
);

const latestSuccessfulPayment =
    await this.paymentModel
        .findOne({
            vendorOrderId: vendorOrder._id,
            status: 'SUCCESS',
        })
        .sort({
            paidAt: -1,
            createdAt: -1,
        })
        .lean();




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

pendingPayment: pendingPayment
    ? {
          paymentId:
              pendingPayment._id.toString(),
          type: String(
              pendingPayment.type || '',
          ),
          amount: Number(
              pendingPayment.amount || 0,
          ),
          method: String(
              pendingPayment.method || '',
          ),
      }
    : null,

    latestSuccessfulPayment:
    latestSuccessfulPayment
        ? {
              paymentId:
                  latestSuccessfulPayment._id.toString(),

              type: String(
                  latestSuccessfulPayment.type || '',
              ),

              amount: Number(
                  latestSuccessfulPayment.amount || 0,
              ),

              method: String(
                  latestSuccessfulPayment.method || '',
              ),

              transactionRef:
                  latestSuccessfulPayment.transactionRef ??
                  null,

              paidAt:
                  latestSuccessfulPayment.paidAt ??
                  null,
          }
        : null,
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

    private escapeHtml(
    value: unknown,
): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

private buildPaymentReceiptEmail(
    data: {
        amount: number;
        paymentType: string;
        method: string;
        transactionRef: string;
        paidAt: Date;
    },
): string {
    const amount =
        Number(
            data.amount || 0,
        ).toLocaleString('en-PK');

    const paymentType =
        data.paymentType ===
        'DOWN_PAYMENT'
            ? 'Down Payment'
            : 'Remaining Payment';

    const method =
        data.method === 'card'
            ? 'Credit / Debit Card'
            : data.method ===
                'jazzcash'
              ? 'JazzCash'
              : data.method ===
                  'easypaisa'
                ? 'EasyPaisa'
                : data.method;

    const transactionRef =
        this.escapeHtml(
            data.transactionRef,
        );

    const paidAt =
        data.paidAt.toLocaleString(
            'en-PK',
            {
                dateStyle: 'medium',
                timeStyle: 'short',
            },
        );

    return `
<!DOCTYPE html>
<html>
<body
  style="
    margin:0;
    padding:0;
    background:#F8E9F6;
    font-family:Arial,sans-serif;
    color:#332633;
  "
>
  <div
    style="
      max-width:600px;
      margin:30px auto;
      background:#FFFFFF;
      border-radius:16px;
      overflow:hidden;
      border:1px solid #EAD5E6;
    "
  >
    <div
      style="
        background:#7D0C72;
        color:#FFFFFF;
        padding:28px;
      "
    >
      <div
        style="
          font-size:22px;
          font-weight:700;
        "
      >
        Eventify Hub
      </div>

      <div
        style="
          margin-top:8px;
          font-size:16px;
        "
      >
        Payment Receipt
      </div>
    </div>

    <div style="padding:28px;">
      <div
        style="
          font-size:22px;
          font-weight:700;
          color:#278A4B;
        "
      >
        Payment Successful
      </div>

      <p>
        Your payment has been confirmed
        successfully.
      </p>

      <div
        style="
          margin-top:22px;
          padding:18px;
          background:#F8E9F6;
          border-radius:12px;
        "
      >
        <div>
          <strong>Amount:</strong>
          Rs. ${amount}
        </div>

        <div style="margin-top:10px;">
          <strong>Payment Type:</strong>
          ${this.escapeHtml(paymentType)}
        </div>

        <div style="margin-top:10px;">
          <strong>Payment Method:</strong>
          ${this.escapeHtml(method)}
        </div>

        <div style="margin-top:10px;">
          <strong>Transaction Reference:</strong>
          ${transactionRef}
        </div>

        <div style="margin-top:10px;">
          <strong>Paid At:</strong>
          ${this.escapeHtml(paidAt)}
        </div>
      </div>

      <p
        style="
          margin-top:22px;
          color:#766B73;
        "
      >
        You can also view this receipt
        inside the Eventify Hub app.
      </p>
    </div>
  </div>
</body>
</html>
`;
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

try {
    const client =
        await this.userModel
            .findById(
                payment.organizerId,
            )
            .select(
                'email name',
            )
            .lean();

    if (client?.email) {
        const receiptHtml =
            this.buildPaymentReceiptEmail({
                amount:
                    Number(
                        payment.amount || 0,
                    ),

                paymentType:
                    String(
                        payment.type || '',
                    ),

                method:
                    String(
                        payment.method || '',
                    ),

                transactionRef:
                    String(
                        payment.transactionRef ||
                            payment._id,
                    ),

                paidAt:
                    payment.paidAt ||
                    new Date(),
            });

        await this.emailService
            .sendTransactionalEmail({
                to: client.email,

                subject:
                    'Your Eventify Hub payment receipt',

                html: receiptHtml,

                senderName:
                    'Eventify Hub',
            });
    }
} catch (error) {
    console.error(
        '[Payment Receipt Email Failed]',
        error instanceof Error
            ? error.message
            : error,
    );
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