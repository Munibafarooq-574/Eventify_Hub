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
  VendorCampaign,
  VendorCampaignSchema,
} from 'src/schemas/vendor-campaign.schema';

import {
  AdminCampaignService,
} from './admin-campaign.service';

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

import {
  VendorSubscription,
  VendorSubscriptionSchema,
} from 'src/schemas/vendor-subscription.schema';

// Reuse the existing Vendor Growth / Subscription module.
// SubscriptionService is already exported by this module.
import {
  VendorGrowthModule,
} from '../vendor/growth/vendor-growth.module';

import {
  Review,
  ReviewSchema,
} from 'src/schemas/review.schema';

import {
  AdminReviewService,
} from './admin-review.service';

import {
  AdminReviewController,
} from './admin-review.controller';

import {
  AdminVendorSubscriptionService,
} from './admin-vendor-subscription.service';

import {
  AdminVendorSubscriptionController,
} from './admin-vendor-subscription.controller';

@Module({
  imports: [

    AuthModule,
    CategoryModule,
    VendorGrowthModule,
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
      name: VendorSubscription.name,
      schema: VendorSubscriptionSchema,
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

      {
        name:
          VendorCampaign.name,
        schema:
          VendorCampaignSchema,
      },
      {
        name: Review.name,
        schema: ReviewSchema,
      },
    ]),
  ],

  controllers: [
    AdminController,
    AdminCommissionController,
    AdminFinanceController,
    AdminDisputeController,
    AdminAnalyticsController,
    AdminReviewController,
    AdminVendorSubscriptionController,
  ],

  providers: [
    AdminService,
    AdminCommissionService,
    AdminFinanceService,
    AdminDisputeService,
    AdminAnalyticsService,
    AdminCampaignService,
    AdminReviewService,
    AdminVendorSubscriptionService,
  ],
})
export class AdminModule {}
