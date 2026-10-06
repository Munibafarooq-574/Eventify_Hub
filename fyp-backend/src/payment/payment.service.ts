import {
    BadRequestException,
    ConflictException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    createHmac,
    timingSafeEqual,
} from 'crypto';
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
        private readonly configService: ConfigService,
    ) {}

    private getVerificationSecret(): string {
    const secret =
        this.configService.get<string>(
            'JWT_SECRET',
        );

    if (!secret) {
        throw new Error(
            'JWT_SECRET is not configured',
        );
    }

    return secret;
}

private createPaymentVerificationToken(
    paymentId: string,
    vendorOrderId: string,
): string {
    const payload = Buffer.from(
        JSON.stringify({
            paymentId,
            vendorOrderId,
        }),
        'utf8',
    ).toString('base64url');

    const signature = createHmac(
        'sha256',
        this.getVerificationSecret(),
    )
        .update(
            `eventify-payment-receipt:${payload}`,
        )
        .digest('base64url');

    return `${payload}.${signature}`;
}

private buildPaymentVerificationUrl(
    paymentId: string,
    vendorOrderId: string,
): string {
    const token =
        this.createPaymentVerificationToken(
            paymentId,
            vendorOrderId,
        );

    const baseUrl =
        (
            this.configService.get<string>(
                'PUBLIC_API_URL',
            ) ||
            'https://eventify-hub.onrender.com'
        ).replace(/\/+$/, '');

    return `${baseUrl}/payment/verify/${encodeURIComponent(
        token,
    )}`;
}

async verifyPaymentReceipt(
    token: string,
) {
    const parts = String(
        token || '',
    ).split('.');

    if (parts.length !== 2) {
        throw new NotFoundException(
            'Invalid payment verification link',
        );
    }

    const [
        payloadPart,
        suppliedSignature,
    ] = parts;

    const expectedSignature =
        createHmac(
            'sha256',
            this.getVerificationSecret(),
        )
            .update(
                `eventify-payment-receipt:${payloadPart}`,
            )
            .digest('base64url');

    const suppliedBuffer =
        Buffer.from(
            suppliedSignature,
            'utf8',
        );

    const expectedBuffer =
        Buffer.from(
            expectedSignature,
            'utf8',
        );

    if (
        suppliedBuffer.length !==
            expectedBuffer.length ||
        !timingSafeEqual(
            suppliedBuffer,
            expectedBuffer,
        )
    ) {
        throw new NotFoundException(
            'Invalid payment verification link',
        );
    }

    let payload: {
        paymentId?: string;
        vendorOrderId?: string;
    };

    try {
        payload = JSON.parse(
            Buffer.from(
                payloadPart,
                'base64url',
            ).toString('utf8'),
        );
    } catch {
        throw new NotFoundException(
            'Invalid payment verification link',
        );
    }

    if (
        !payload.paymentId ||
        !payload.vendorOrderId
    ) {
        throw new NotFoundException(
            'Invalid payment verification link',
        );
    }

    const payment =
        await this.paymentModel
            .findOne({
                _id:
                    payload.paymentId,

                vendorOrderId:
                    payload.vendorOrderId,

                status:
                    'SUCCESS',
            })
            .lean();

    if (!payment) {
        throw new NotFoundException(
            'Verified payment not found',
        );
    }

    const vendorOrder =
        await this.vendorOrderModel
            .findById(
                payload.vendorOrderId,
            )
            .lean();

    if (!vendorOrder) {
        throw new NotFoundException(
            'Booking not found',
        );
    }

    const [
        client,
        vendor,
        successfulPayments,
    ] = await Promise.all([
        this.userModel
            .findById(
                payment.organizerId,
            )
            .select('name')
            .lean(),

        this.userModel
            .findById(
                payment.vendorId,
            )
            .select('name')
            .lean(),

        this.paymentModel
            .find({
                vendorOrderId:
                    vendorOrder._id,

                status:
                    'SUCCESS',
            })
            .select('amount')
            .lean(),
    ]);

    const totalAmount =
        Number(
            vendorOrder.finalAmount ??
                vendorOrder.price ??
                0,
        );

    const paidSoFar =
        successfulPayments.reduce(
            (
                total,
                item,
            ) =>
                total +
                Number(
                    item.amount ||
                        0,
                ),
            0,
        );

    const remainingAmount =
        Math.max(
            totalAmount -
                paidSoFar,
            0,
        );

    return {
        verified: true,

        bookingReference:
            `EH-${String(
                vendorOrder._id,
            )
                .slice(-8)
                .toUpperCase()}`,

        clientName:
            client?.name ||
            'Client',

        vendorName:
            vendor?.name ||
            'Vendor',

        serviceName:
            vendorOrder.serviceName ||
            'N/A',

        paymentType:
            payment.type,

        amountPaid:
            Number(
                payment.amount ||
                    0,
            ),

        paymentMethod:
            payment.method ||
            null,

        transactionReference:
            payment.transactionRef ||
            null,

        paidAt:
            payment.paidAt ||
            null,

        transactionStatus:
            payment.status,

        bookingPaymentStatus:
            vendorOrder.paymentStatus,

        totalAmount,

        paidSoFar,

        remainingAmount,
    };
}

  private async assertOrganizerOwnsVendorOrder(
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

    const order =
        await this.orderModel.findById(
            vendorOrder.orderId,
        );

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
                verificationUrl:
                    this.buildPaymentVerificationUrl(
                        latestSuccessfulPayment._id.toString(),
                        vendorOrder._id.toString(),
                    ),
                
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

        eventName: string;
        eventType?: string | null;
        eventDate?: Date | null;
        eventTime?: string | null;
        eventDurationMinutes?: number | null;
        guests?: number | null;
        eventAddress?: string | null;

        vendorName: string;
        brandName?: string | null;
        vendorPhone?: string | null;
        vendorEmail?: string | null;
        vendorAddress?: string | null;

        serviceName?: string | null;
        packageName?: string | null;

        serviceStart?: Date | null;
        serviceEnd?: Date | null;

        bookingTotal: number;
        previouslyPaid: number;
        totalPaid: number;
        remainingBalance: number;
        paymentStatus: string;
    },
): string {
    const money = (value: number) =>
        Number(value || 0).toLocaleString('en-PK');

    const formatDate = (
        value?: Date | null,
    ) => {
        if (!value) {
            return 'N/A';
        }

        return new Date(value).toLocaleDateString(
            'en-PK',
            {
                dateStyle: 'medium',
            },
        );
    };

    const formatDateTime = (
        value?: Date | null,
    ) => {
        if (!value) {
            return 'N/A';
        }

        return new Date(value).toLocaleString(
            'en-PK',
            {
                dateStyle: 'medium',
                timeStyle: 'short',
            },
        );
    };

    const formatDuration = (
        minutes?: number | null,
    ) => {
        if (
            !minutes ||
            !Number.isFinite(minutes)
        ) {
            return 'N/A';
        }

        const hours = Math.floor(
            minutes / 60,
        );

        const remainingMinutes =
            minutes % 60;

        if (
            hours > 0 &&
            remainingMinutes > 0
        ) {
            return `${hours} hr ${remainingMinutes} min`;
        }

        if (hours > 0) {
            return `${hours} hr`;
        }

        return `${remainingMinutes} min`;
    };

    const paymentType =
        data.paymentType ===
        'DOWN_PAYMENT'
            ? 'Down Payment'
            : data.paymentType ===
                'REMAINING'
              ? 'Remaining Payment'
              : data.paymentType;

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
      max-width:650px;
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
          font-size:24px;
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
        Your payment has been confirmed successfully.
      </p>

      <div
        style="
          margin-top:24px;
          font-size:17px;
          font-weight:700;
          color:#7D0C72;
        "
      >
        Event Details
      </div>

      <div
        style="
          margin-top:12px;
          padding:18px;
          background:#FAF5F9;
          border-radius:12px;
        "
      >
        <div>
          <strong>Event Name:</strong>
          ${this.escapeHtml(data.eventName)}
        </div>

        <div style="margin-top:8px;">
          <strong>Event Type:</strong>
          ${this.escapeHtml(
              data.eventType || 'N/A',
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Event Date:</strong>
          ${this.escapeHtml(
              formatDate(data.eventDate),
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Event Time:</strong>
          ${this.escapeHtml(
              data.eventTime || 'N/A',
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Duration:</strong>
          ${this.escapeHtml(
              formatDuration(
                  data.eventDurationMinutes,
              ),
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Guests:</strong>
          ${this.escapeHtml(
              data.guests ?? 'N/A',
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Event Address:</strong>
          ${this.escapeHtml(
              data.eventAddress || 'N/A',
          )}
        </div>
      </div>

      <div
        style="
          margin-top:24px;
          font-size:17px;
          font-weight:700;
          color:#7D0C72;
        "
      >
        Vendor Details
      </div>

      <div
        style="
          margin-top:12px;
          padding:18px;
          background:#FAF5F9;
          border-radius:12px;
        "
      >
        <div>
          <strong>Brand Name:</strong>
          ${this.escapeHtml(
              data.brandName ||
                  data.vendorName,
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Vendor Name:</strong>
          ${this.escapeHtml(
              data.vendorName,
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Contact Number:</strong>
          ${this.escapeHtml(
              data.vendorPhone || 'N/A',
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Booking Email:</strong>
          ${this.escapeHtml(
              data.vendorEmail || 'N/A',
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Office Address:</strong>
          ${this.escapeHtml(
              data.vendorAddress || 'N/A',
          )}
        </div>
      </div>

      <div
        style="
          margin-top:24px;
          font-size:17px;
          font-weight:700;
          color:#7D0C72;
        "
      >
        Service Details
      </div>

      <div
        style="
          margin-top:12px;
          padding:18px;
          background:#FAF5F9;
          border-radius:12px;
        "
      >
        <div>
          <strong>Service:</strong>
          ${this.escapeHtml(
              data.serviceName || 'N/A',
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Package:</strong>
          ${this.escapeHtml(
              data.packageName || 'N/A',
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Service Start:</strong>
          ${this.escapeHtml(
              formatDateTime(
                  data.serviceStart,
              ),
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Service End:</strong>
          ${this.escapeHtml(
              formatDateTime(
                  data.serviceEnd,
              ),
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Booking Total:</strong>
          Rs. ${money(
              data.bookingTotal,
          )}
        </div>
      </div>

      <div
        style="
          margin-top:24px;
          font-size:17px;
          font-weight:700;
          color:#7D0C72;
        "
      >
        Payment Details
      </div>

      <div
        style="
          margin-top:12px;
          padding:18px;
          background:#F8E9F6;
          border-radius:12px;
        "
      >
        <div>
          <strong>Payment Type:</strong>
          ${this.escapeHtml(
              paymentType,
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Amount Paid:</strong>
          Rs. ${money(data.amount)}
        </div>

        <div style="margin-top:8px;">
          <strong>Previously Paid:</strong>
          Rs. ${money(
              data.previouslyPaid,
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Total Paid:</strong>
          Rs. ${money(
              data.totalPaid,
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Remaining Balance:</strong>
          Rs. ${money(
              data.remainingBalance,
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Payment Method:</strong>
          ${this.escapeHtml(method)}
        </div>

        <div style="margin-top:8px;">
          <strong>Transaction Reference:</strong>
          ${this.escapeHtml(
              data.transactionRef,
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Paid At:</strong>
          ${this.escapeHtml(
              formatDateTime(
                  data.paidAt,
              ),
          )}
        </div>

        <div style="margin-top:8px;">
          <strong>Payment Status:</strong>
          ${this.escapeHtml(
              data.paymentStatus,
          )}
        </div>
      </div>

      <p
        style="
          margin-top:24px;
          color:#766B73;
        "
      >
        You can also view this receipt inside
        the Eventify Hub app.
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
    const [
        client,
        order,
        vendor,
    ] = await Promise.all([
        this.userModel
            .findById(
                payment.organizerId,
            )
            .select(
                'email name',
            )
            .lean(),

        this.orderModel
            .findById(
                vendorOrder.orderId,
            )
            .lean(),

        this.userModel
            .findById(
                vendorOrder.vendorId,
            )
            .select(
                `
                name
                phone_number
                contactDetails
                packages
                businessAddress
                `,
            )
            .lean(),
    ]);

    if (
        client?.email &&
        order &&
        vendor
    ) {
        const packageData =
            Array.isArray(vendor.packages)
                ? vendor.packages.find(
                      (pkg: any) =>
                          pkg?._id?.toString() ===
                          vendorOrder.packageId?.toString(),
                  )
                : null;

        const bookingAmount =
            Number(
                vendorOrder.finalAmount ??
                vendorOrder.price ??
                0,
            );

        const paymentAmount =
            Number(
                payment.amount || 0,
            );

        const totalPaid =
            Number(
                paidSoFar || 0,
            );

        const previouslyPaid =
            Math.max(
                totalPaid -
                    paymentAmount,
                0,
            );

        const remainingBalance =
            Math.max(
                bookingAmount -
                    totalPaid,
                0,
            );

        const receiptHtml =
            this.buildPaymentReceiptEmail({
                amount:
                    paymentAmount,

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

                eventName:
                    order.eventName,

                eventType:
                    order.eventType ??
                    null,

                eventDate:
                    order.eventDate ??
                    null,

                eventTime:
                    order.eventTime ??
                    null,

                eventDurationMinutes:
                    order.eventDurationMinutes ??
                    null,

                guests:
                    order.guests ??
                    null,

                eventAddress:
                    order.eventAddress ??
                    null,

                vendorName:
                    vendor.name ||
                    vendorOrder.serviceName ||
                    'Vendor',

                brandName:
                    vendor.contactDetails
                        ?.brandName ??
                    null,

                vendorPhone:
                    vendor.contactDetails
                        ?.contactNumber ||
                    vendor.phone_number ||
                    null,

                vendorEmail:
                    vendor.contactDetails
                        ?.bookingEmail ??
                    null,

                vendorAddress:
                    vendor.contactDetails
                        ?.officialAddress ||
                    vendor.businessAddress ||
                    null,

                serviceName:
                    vendorOrder.serviceName ??
                    null,

                packageName:
                    packageData
                        ?.packageName ??
                    null,

                serviceStart:
                    vendorOrder
                        .eventStartDateTime ??
                    null,

                serviceEnd:
                    vendorOrder
                        .eventEndDateTime ??
                    null,

                bookingTotal:
                    bookingAmount,

                previouslyPaid,

                totalPaid,

                remainingBalance,

                paymentStatus:
                    String(
                        vendorOrder
                            .paymentStatus ||
                            '',
                    ),
            });

        const brandName =
            vendor.contactDetails
                ?.brandName ||
            vendor.name ||
            'Vendor';

        await this.emailService
            .sendTransactionalEmail({
                to:
                    client.email,

                subject:
                    `Payment Receipt — ${order.eventName} | ${brandName}`,

                html:
                    receiptHtml,

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