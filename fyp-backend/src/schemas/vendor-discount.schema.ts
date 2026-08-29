// fyp-backend/src/schemas/vendor-discount.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import {
  DiscountEntryType,
  DiscountKind,
  DiscountStatus,
  DiscountAudience,
} from './../vendor/growth/discount/discount.types';

// One document per coupon / discount code. History is kept (never
// deleted) — "deleting" sets status to CANCELLED, same pattern as
// subscriptions and promotions.

@Schema({ timestamps: true })
export class VendorDiscount extends Document {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  vendorId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, enum: DiscountEntryType, required: true, index: true })
  type: DiscountEntryType;

  // Always stored uppercase — case-insensitive matching at validation time.
  @Prop({ type: String, required: true, uppercase: true, trim: true })
  code: string;

  @Prop({ type: String, enum: DiscountKind, required: true })
  discountType: DiscountKind;

  // Percentage (0-100) or a fixed Rs. amount, depending on discountType.
  @Prop({ type: Number, required: true, min: 0 })
  discountValue: number;

  @Prop({ type: Number, default: 0, min: 0 })
  minimumOrderAmount: number;

  // Only meaningful for PERCENTAGE — caps the rupee discount. Ignored for FIXED.
  @Prop({ type: Number, default: null })
  maximumDiscountAmount: number | null;

  // Package-specific coupons (Premium feature, spec section 14). Optional —
  // null means the coupon applies to any of the vendor's packages.
  @Prop({ type: String, default: null })
  packageId: string | null;

  @Prop({
  type: String,
  enum: DiscountAudience,
  default: DiscountAudience.ALL,
  required: true,
})
audience: DiscountAudience;

@Prop({
  type: [MongooseSchema.Types.ObjectId],
  ref: 'User',
  default: [],
})
selectedOrganizerIds: MongooseSchema.Types.ObjectId[];

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({ type: Number, required: true, min: 1 })
  usageLimit: number;

  @Prop({ type: Number, default: 0, min: 0 })
  usedCount: number;

  @Prop({ type: String, enum: DiscountStatus, required: true, default: DiscountStatus.ACTIVE })
  status: DiscountStatus;

  @Prop({ type: String, default: null })
  cancelledReason: string | null;
}

export const VendorDiscountSchema = SchemaFactory.createForClass(VendorDiscount);

// Lookup index for the vendor's own list + code validation queries.
// Deliberately NOT a unique index: a vendor's cancelled/expired coupon
// code should be reusable for a future coupon (e.g. "SUMMER20" every
// year) since we never delete history. Uniqueness among currently ACTIVE
// codes is enforced in discount.service.ts instead.
VendorDiscountSchema.index({ vendorId: 1, type: 1, code: 1 });
VendorDiscountSchema.index({ vendorId: 1, type: 1, status: 1 });