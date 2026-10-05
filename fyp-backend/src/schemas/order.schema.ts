//fyp-backend/src/schemas/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Order extends Document {
    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    organizerId: Types.ObjectId;

    // Client-side event context identifier. Used for final booking
    // idempotency so the same event cannot be confirmed twice
    // by accidental double-taps/network retries.
    @Prop({
      type: String,
      trim: true,
      default: null,
    })
    eventId?: string | null;

    @Prop({ type: [Types.ObjectId], ref: 'VendorOrder', default: [] })
    vendorOrders: Types.ObjectId[];

    @Prop({ required: true })
    eventName: string;

    @Prop()
    eventType: string;

    @Prop({
  type: Types.ObjectId,
  ref: 'City',
  required: true,
  index: true,
})
eventCityId: Types.ObjectId;

@Prop({
  type: [{ type: Types.ObjectId, ref: 'Category' }],
  default: [],
})
selectedCategoryIds: Types.ObjectId[];

@Prop({
  type: String,
  required: true,
  trim: true,
})
eventAddress: string;

    @Prop({ required: true })
    guests: number;

    @Prop({ required: true })
    eventDate: Date;

    @Prop({ required: true })
    eventTime: string;

      @Prop()
    eventStartDateTime?: Date;

    @Prop()
    eventEndDateTime?: Date;

    @Prop()
    eventDurationMinutes?: number;

    @Prop({ required: true })
    totalAmount: number;

    @Prop({ required: true })
    discount: number;

    @Prop({ required: true })
    finalAmount: number;

    @Prop({ default: 'pending' })
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// One confirmed booking request per organizer/event context.
// Legacy orders without eventId are not included in this unique index.
OrderSchema.index(
  { organizerId: 1, eventId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      eventId: { $type: 'string' },
    },
  },
);
