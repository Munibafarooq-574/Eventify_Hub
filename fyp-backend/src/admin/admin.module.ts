// fyp-backend/src/admin/admin.module.ts

import {
  Module,
} from '@nestjs/common';

import {
  MongooseModule,
} from '@nestjs/mongoose';

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

import {
  AdminService,
} from './admin.service';

import {
  AdminController,
} from './admin.controller';

import {
  AdminCommissionService,
} from './admin-commission.service';

import {
  AdminCommissionController,
} from './admin-commission.controller';

import {
  AdminFinanceService,
} from './admin-finance.service';

import {
  AdminFinanceController,
} from './admin-finance.controller';

import {
  AdminDisputeService,
} from './admin-dispute.service';

import {
  AdminDisputeController,
} from './admin-dispute.controller';

import {
  AdminAnalyticsService,
} from './admin-analytics.service';

import {
  AdminAnalyticsController,
} from './admin-analytics.controller';

import {
  AuthModule,
} from '../auth/auth.module';

import {
  CategoryModule,
} from '../category/category.module';

// Reuse the existing Vendor Growth / Subscription module.
// SubscriptionService is already exported by this module.
import {
  VendorGrowthModule,
} from '../vendor/growth/vendor-growth.module';

@Module({
  imports: [
    // =====================================================
    // AUTH
    // =====================================================

    AuthModule,

    // =====================================================
    // CATEGORY
    // =====================================================

    CategoryModule,

    // =====================================================
    // EXISTING SUBSCRIPTION SYSTEM
    // =====================================================

    VendorGrowthModule,

    // =====================================================
    // ADMIN DATABASE MODELS
    // =====================================================

    MongooseModule.forFeature([
      {
        name:
          VendorOrder.name,
        schema:
          VendorOrderSchema,
      },

      {
        name:
          Order.name,
        schema:
          OrderSchema,
      },

      {
        name:
          Payment.name,
        schema:
          PaymentSchema,
      },

      {
        name:
          Payout.name,
        schema:
          PayoutSchema,
      },

      {
        name:
          Refund.name,
        schema:
          RefundSchema,
      },

      {
        name:
          CommissionConfig.name,
        schema:
          CommissionConfigSchema,
      },

      {
        name:
          Dispute.name,
        schema:
          DisputeSchema,
      },

      {
        name:
          User.name,
        schema:
          UserSchema,
      },
    ]),
  ],

  controllers: [
    AdminController,
    AdminCommissionController,
    AdminFinanceController,
    AdminDisputeController,
    AdminAnalyticsController,
  ],

  providers: [
    AdminService,
    AdminCommissionService,
    AdminFinanceService,
    AdminDisputeService,
    AdminAnalyticsService,
  ],
})
export class AdminModule {}