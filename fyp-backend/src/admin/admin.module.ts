// fyp-backend/src/admin/admin.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
    VendorOrder,
    VendorOrderSchema,
} from 'src/schemas/vendor-order.schema';

import {
    Order,
    OrderSchema,
} from 'src/schemas/order.schema';

import {
    Payment,
    PaymentSchema,
} from 'src/schemas/payment.schema';

import {
    Payout,
    PayoutSchema,
} from 'src/schemas/payout.schema';

import {
    Refund,
    RefundSchema,
} from 'src/schemas/refund.schema';

import {
    CommissionConfig,
    CommissionConfigSchema,
} from 'src/schemas/commission-config.schema';

import {
    Dispute,
    DisputeSchema,
} from 'src/schemas/dispute.schema';

import {
    User,
    UserSchema,
} from 'src/schemas/user.schema';

import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

import { AdminCommissionService } from './admin-commission.service';
import { AdminCommissionController } from './admin-commission.controller';

import { AdminFinanceService } from './admin-finance.service';
import { AdminFinanceController } from './admin-finance.controller';

import { AdminDisputeService } from './admin-dispute.service';
import { AdminDisputeController } from './admin-dispute.controller';

import { AdminAnalyticsService } from './admin-analytics.service';
import { AdminAnalyticsController } from './admin-analytics.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            // Existing admin models
            {
                name: VendorOrder.name,
                schema: VendorOrderSchema,
            },
            {
                name: Order.name,
                schema: OrderSchema,
            },

            // Finance models
            {
                name: Payment.name,
                schema: PaymentSchema,
            },
            {
                name: Payout.name,
                schema: PayoutSchema,
            },
            {
                name: Refund.name,
                schema: RefundSchema,
            },

            // Phase 13: Commission configuration
            {
                name: CommissionConfig.name,
                schema: CommissionConfigSchema,
            },

            // Existing dispute / analytics models
            {
                name: Dispute.name,
                schema: DisputeSchema,
            },
            {
                name: User.name,
                schema: UserSchema,
            },
        ]),
    ],

    controllers: [
        // Existing admin controller
        AdminController,

        // Phase 13: Commission
        AdminCommissionController,

        // Finance
        AdminFinanceController,

        // Existing dispute
        AdminDisputeController,

        // Existing analytics
        AdminAnalyticsController,
    ],

    providers: [
        // Existing admin service
        AdminService,

        // Phase 13: Commission
        AdminCommissionService,

        // Finance
        AdminFinanceService,

        // Existing dispute
        AdminDisputeService,

        // Existing analytics
        AdminAnalyticsService,
    ],
})
export class AdminModule {}