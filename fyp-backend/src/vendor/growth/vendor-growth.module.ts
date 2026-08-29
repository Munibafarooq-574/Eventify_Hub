// fyp-backend/src/vendor/growth/vendor-growth.module.ts
//
// Phase 1: Subscription Foundation.
// Phase 3: Promotion (Featured Vendor) added.
// Phase 4: Featured Package reused the same PromotionService/schema.
// Phase 5: Badges added — computed on the fly, no new collection.
// Phase 6: Discount (Coupons) added.
// Phase 7: Discount Codes reused the same DiscountService/schema.
// Phase 8: Analytics added below — reads VendorOrder directly plus
// everything the earlier phases already built.
// Phase 9: Discovery added — public featured vendors/packages discovery.

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Subscription
import {
  VendorSubscription,
  VendorSubscriptionSchema,
} from '../../schemas/vendor-subscription.schema';
import { SubscriptionService } from './subscription/subscription.service';
import { SubscriptionController } from './subscription/subscription.controller';

// Promotion
import {
  VendorPromotion,
  VendorPromotionSchema,
} from '../../schemas/vendor-promotion.schema';
import { PromotionService } from './promotion/promotion.service';
import { PromotionController } from './promotion/promotion.controller';

// Badges
import { BadgeService } from './badges/badge.service';
import { BadgeController } from './badges/badge.controller';

// Discount
import {
  VendorDiscount,
  VendorDiscountSchema,
} from '../../schemas/vendor-discount.schema';
import { DiscountService } from './discount/discount.service';
import { DiscountController } from './discount/discount.controller';

// Analytics
import {
  VendorViewEvent,
  VendorViewEventSchema,
} from '../../schemas/vendor-view-event.schema';
import { AnalyticsService } from './analytics/analytics.service';
import { AnalyticsController } from './analytics/analytics.controller';

// Discovery
import { DiscoveryService } from './discovery/discovery.service';
import { DiscoveryController } from './discovery/discovery.controller';

// Feature Access
import { FeatureAccessService } from './feature-access.service';

// User schema
import { User, UserSchema } from 'src/schemas/user.schema';

// Vendor Order schema
import {
  VendorOrder,
  VendorOrderSchema,
} from 'src/schemas/vendor-order.schema';

// Vendor module
import { VendorModule } from 'src/vendor/vendor.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      // Subscription
      {
        name: VendorSubscription.name,
        schema: VendorSubscriptionSchema,
      },

      // Promotion
      {
        name: VendorPromotion.name,
        schema: VendorPromotionSchema,
      },

      // Discount
      {
        name: VendorDiscount.name,
        schema: VendorDiscountSchema,
      },

      // Analytics view events
      {
        name: VendorViewEvent.name,
        schema: VendorViewEventSchema,
      },

      // User
      {
        name: User.name,
        schema: UserSchema,
      },

      // Vendor Orders
      {
        name: VendorOrder.name,
        schema: VendorOrderSchema,
      },
    ]),

    // Provides VendorAnalyticsService used by
    // BadgeService and AnalyticsService.
    VendorModule,
  ],

  controllers: [
    SubscriptionController,
    PromotionController,
    BadgeController,
    DiscountController,
    AnalyticsController,

    // Phase 9: Discovery
    DiscoveryController,
  ],

  providers: [
    // Subscription
    SubscriptionService,

    // Centralized feature access
    FeatureAccessService,

    // Promotion / Featured Vendor / Featured Package
    PromotionService,

    // Badges
    BadgeService,

    // Coupons / Discount Codes
    DiscountService,

    // Growth Analytics
    AnalyticsService,

    // Phase 9: Featured vendor/package discovery
    DiscoveryService,
  ],

  exports: [
    SubscriptionService,
    FeatureAccessService,
    PromotionService,
    BadgeService,
    DiscountService,
    AnalyticsService,

    // Phase 9
    DiscoveryService,
  ],
})
export class VendorGrowthModule {}