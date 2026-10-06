import {
    Controller,
    Get,
    Param,
    Res,
} from '@nestjs/common';

import {
    Response,
} from 'express';

import {
    PaymentService,
} from './payment.service';

@Controller('payment')
export class PaymentVerificationController {
    constructor(
        private readonly paymentService:
            PaymentService,
    ) {}

    @Get('verify/:token')
    async verify(
        @Param('token')
        token: string,

        @Res()
        response: Response,
    ) {
        const data =
            await this.paymentService
                .verifyPaymentReceipt(
                    token,
                );

        const escapeHtml = (
            value: unknown,
        ) =>
            String(value ?? '')
                .replace(
                    /&/g,
                    '&amp;',
                )
                .replace(
                    /</g,
                    '&lt;',
                )
                .replace(
                    />/g,
                    '&gt;',
                )
                .replace(
                    /"/g,
                    '&quot;',
                )
                .replace(
                    /'/g,
                    '&#039;',
                );

        const money = (
            value: number,
        ) =>
            Number(
                value || 0,
            ).toLocaleString(
                'en-PK',
            );

        return response
            .type('html')
            .send(`
<!DOCTYPE html>
<html>
<head>
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    />

    <title>
        Eventify Hub Payment Verification
    </title>
</head>

<body
    style="
        margin:0;
        padding:30px 18px;
        background:#F8E9F0;
        font-family:Arial,sans-serif;
        color:#1A1A1A;
    "
>
    <div
        style="
            max-width:540px;
            margin:0 auto;
            background:white;
            border-radius:22px;
            padding:28px;
            box-shadow:0 8px 32px rgba(120,12,96,.15);
        "
    >
        <div
            style="
                color:#780C60;
                font-size:22px;
                font-weight:800;
            "
        >
            Eventify Hub
        </div>

        <div
            style="
                margin-top:24px;
                color:#278A4B;
                font-size:24px;
                font-weight:800;
            "
        >
            ✓ Payment Verified
        </div>

        <p
            style="
                color:#777;
                line-height:1.6;
            "
        >
            This payment receipt was verified
            directly from Eventify Hub.
        </p>

        ${[
            [
                'Booking Reference',
                data.bookingReference,
            ],
            [
                'Client',
                data.clientName,
            ],
            [
                'Vendor',
                data.vendorName,
            ],
            [
                'Service',
                data.serviceName,
            ],
            [
                'Amount Paid',
                `Rs. ${money(
                    data.amountPaid,
                )}`,
            ],
            [
                'Paid So Far',
                `Rs. ${money(
                    data.paidSoFar,
                )}`,
            ],
            [
                'Remaining',
                `Rs. ${money(
                    data.remainingAmount,
                )}`,
            ],
            [
                'Payment Status',
                data.bookingPaymentStatus,
            ],
            [
                'Transaction Status',
                data.transactionStatus,
            ],
            [
                'Transaction Reference',
                data.transactionReference ||
                    'N/A',
            ],
        ]
            .map(
                ([label, value]) => `
                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        gap:20px;
                        padding:13px 0;
                        border-bottom:1px solid #F0DDEA;
                    "
                >
                    <span
                        style="
                            color:#888;
                            font-size:13px;
                        "
                    >
                        ${escapeHtml(
                            label,
                        )}
                    </span>

                    <strong
                        style="
                            font-size:13px;
                            text-align:right;
                        "
                    >
                        ${escapeHtml(
                            value,
                        )}
                    </strong>
                </div>
            `,
            )
            .join('')}

        <div
            style="
                margin-top:24px;
                padding:14px;
                background:#EDF8F0;
                color:#278A4B;
                border-radius:12px;
                font-size:13px;
                font-weight:700;
                text-align:center;
            "
        >
            Verified by Eventify Hub
        </div>
    </div>
</body>
</html>
        `);
    }
}