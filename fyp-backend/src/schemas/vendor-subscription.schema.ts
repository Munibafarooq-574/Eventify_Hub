// fyp-backend/src/schemas/vendor-subscription.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
  PaymentProvider,
  PaymentStatus,
  SubscriptionPlan,
  SubscriptionStatus,
} from '../vendor/growth/subscription/subscription.types';

// One document per subscription "cycle". We never delete old documents —
// when a vendor upgrades/downgrades/renews, the old doc is kept for
// history (isCurrent: false) and a new doc becomes the current one.
// This matches "Do not simply delete data when a subscription expires."

@Schema({ timestamps: true })
export class VendorSubscription extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  vendorId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: SubscriptionPlan, required: true, default: SubscriptionPlan.FREE })
  plan: SubscriptionPlan;

  @Prop({ type: String, enum: SubscriptionStatus, required: true, default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop({ type: Date, required: true, default: () => new Date() })
  startDate: Date;

  // null for the Free plan — Free never expires on its own.
  @Prop({ type: Date, default: null })
  endDate: Date | null;

  // --- Payment-related fields ---
  // Kept even though we're not charging money yet, so a real payment
  // gateway can be dropped in later without a schema migration.
  @Prop({ type: String, enum: PaymentStatus, required: true, default: PaymentStatus.NONE })
  paymentStatus: PaymentStatus;

  @Prop({ type: String, enum: PaymentProvider, required: true, default: PaymentProvider.NONE })
  paymentProvider: PaymentProvider;

  @Prop({ type: String, default: null })
  paymentReference: string | null;

  @Prop({ type: Number, default: 0 })
  amountPaid: number;

  // Only one document per vendor should have isCurrent: true at a time.
  @Prop({ type: Boolean, default: true, index: true })
  isCurrent: boolean;

  @Prop({ type: String, default: null })
  cancelledReason: string | null;
}

export const VendorSubscriptionSchema = SchemaFactory.createForClass(VendorSubscription);

VendorSubscriptionSchema.index({ vendorId: 1, isCurrent: 1 });