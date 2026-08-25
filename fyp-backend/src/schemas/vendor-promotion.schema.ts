// fyp-backend/src/schemas/vendor-promotion.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { PromotionStatus, PromotionType } from './../vendor/growth/promotion/promotion.types';

// One promotion "campaign" per document. History is kept (never deleted),
// same pattern as VendorSubscription.

@Schema({ timestamps: true })
export class VendorPromotion extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  vendorId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: PromotionType, required: true, index: true })
  type: PromotionType;

  // Only set when type === FEATURED_PACKAGE (Phase 4). Packages are
  // subdocuments on User.packages, so this stores that subdocument's _id
  // as a plain string rather than a separate collection reference.
  @Prop({ type: String, default: null })
  packageId: string | null;

  @Prop({ type: Number, required: true })
  durationDays: number;

  @Prop({ type: Date, required: true, default: () => new Date() })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: String, enum: PromotionStatus, required: true, default: PromotionStatus.ACTIVE })
  status: PromotionStatus;

  @Prop({ type: String, default: null })
  cancelledReason: string | null;
}

export const VendorPromotionSchema = SchemaFactory.createForClass(VendorPromotion);

VendorPromotionSchema.index({ vendorId: 1, type: 1, status: 1 });
VendorPromotionSchema.index({ type: 1, status: 1, endDate: 1 });