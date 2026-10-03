import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'discountredemptions' })
export class DiscountRedemption extends Document {
  @Prop({ type: Types.ObjectId, required: true })
  discountId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  vendorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  orderId: Types.ObjectId | null;
}

export const DiscountRedemptionSchema =
  SchemaFactory.createForClass(DiscountRedemption);

// Ek client + ek code = sirf ek record (database level par guarantee)
DiscountRedemptionSchema.index(
  { discountId: 1, clientId: 1 },
  { unique: true },
);