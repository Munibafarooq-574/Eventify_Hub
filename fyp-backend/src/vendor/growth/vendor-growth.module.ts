// fyp-backend/src/vendor/growth/vendor-growth.module.ts
//
// Phase 1: Subscription Foundation.
// Phase 3: Promotion (Featured Vendor) added below.
// Phase 4 (Featured Package) reuses the same PromotionService/schema —
// no new module needed for that phase, just new methods.
// Phase 6/7 (badges, coupons, discounts) will add their own
// MongooseModule.forFeature entries + services/controllers to this same
// module as they're built, so everything growth-related stays together.

/*import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  VendorSubscription,
  VendorSubscriptionSchema,
} from '../../schemas/vendor-subscription.schema';
import { SubscriptionService } from './subscription/subscription.service';
import { SubscriptionController } from './subscription/subscription.controller';

import {
  VendorPromotion,
  VendorPromotionSchema,
} from '../../schemas/vendor-promotion.schema';
import { PromotionService } from './promotion/promotion.service';
import { PromotionController } from './promotion/promotion.controller';

import { FeatureAccessService } from './feature-access.service';

// PromotionService populates vendor display info (name, cover image,
// category) for the public "active featured vendors" list, so the User
// schema is registered here too — read-only use, no writes to User.
import { User, UserSchema } from 'src/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VendorSubscription.name, schema: VendorSubscriptionSchema },
      { name: VendorPromotion.name, schema: VendorPromotionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [SubscriptionController, PromotionController],
  providers: [SubscriptionService, FeatureAccessService, PromotionService],
  // Exported so Phase 6/7 (coupons/discounts) and other modules can
  // inject these without duplicating subscription/feature-access logic.
  exports: [SubscriptionService, FeatureAccessService, PromotionService],
})
export class VendorGrowthModule {}*/

// fyp-backend/src/vendor/growth/vendor-growth.module.ts
//
// Phase 1: Subscription Foundation.
// Phase 3: Promotion (Featured Vendor) added.
// Phase 4 (Featured Package) reused the same PromotionService/schema.
// Phase 5: Badges added below — computed on the fly, no new collection.
// Phase 6/7 (coupons, discounts) will add their own
// MongooseModule.forFeature entries + services/controllers to this same
// module as they're built, so everything growth-related stays together.

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  VendorSubscription,
  VendorSubscriptionSchema,
} from '../../schemas/vendor-subscription.schema';
import { SubscriptionService } from './subscription/subscription.service';
import { SubscriptionController } from './subscription/subscription.controller';

import {
  VendorPromotion,
  VendorPromotionSchema,
} from '../../schemas/vendor-promotion.schema';
import { PromotionService } from './promotion/promotion.service';
import { PromotionController } from './promotion/promotion.controller';

import { BadgeService } from './badges/badge.service';
import { BadgeController } from './badges/badge.controller';

import { FeatureAccessService } from './feature-access.service';

// PromotionService populates vendor display info (name, cover image,
// category) for the public "active featured vendors/packages" lists, so
// the User schema is registered here too — read-only use, no writes to User.
import { User, UserSchema } from 'src/schemas/user.schema';

// BadgeService reuses VendorAnalyticsService (rating, response time,
// customer counts) instead of recomputing that logic — see
// "Wiring" note in PHASE_5_README.md: VendorModule must export
// VendorAnalyticsService for this import to resolve.
import { VendorModule } from 'src/vendor/vendor.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VendorSubscription.name, schema: VendorSubscriptionSchema },
      { name: VendorPromotion.name, schema: VendorPromotionSchema },
      { name: User.name, schema: UserSchema },
    ]),
    VendorModule,
  ],
  controllers: [SubscriptionController, PromotionController, BadgeController],
  providers: [SubscriptionService, FeatureAccessService, PromotionService, BadgeService],
  // Exported so Phase 6/7 (coupons/discounts) and other modules can
  // inject these without duplicating subscription/feature-access logic.
  exports: [SubscriptionService, FeatureAccessService, PromotionService, BadgeService],
})
export class VendorGrowthModule {}