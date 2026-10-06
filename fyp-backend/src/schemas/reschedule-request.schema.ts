import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RescheduleStatus =
  | 'CHANGE_REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED';

@Schema({ timestamps: true })
export class RescheduleRequest extends Document {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Order', index: true })
  bookingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Order', index: true })
  orderId: Types.ObjectId;

  @Prop({ type: String, required: true, index: true })
  eventId: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'VendorOrder', index: true })
  vendorOrderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User', index: true })
  vendorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  requestedBy: Types.ObjectId;

  @Prop({ type: String, default: null })
  bookingType?: string | null;

  // Event-level audit snapshot.
  @Prop({ type: Date, required: true })
  oldEventDate: Date;

  @Prop({ type: String, required: true })
  oldStartTime: string;

  @Prop({ type: Date, required: true })
  oldEndTime: Date;

  @Prop({ type: Date, required: true })
  newEventDate: Date;

  @Prop({ type: String, required: true })
  newStartTime: string;

  @Prop({ type: Date, required: true })
  newEndTime: Date;

  // Package-aware service window. For DELIVERY/SETUP/CUSTOM this is
  // intentionally not forced to equal the event duration.
  @Prop({ type: Date, default: null })
  oldServiceStartDateTime?: Date | null;

  @Prop({ type: Date, default: null })
  oldServiceEndDateTime?: Date | null;

  @Prop({ type: Date, default: null })
  newServiceStartDateTime?: Date | null;

  @Prop({ type: Date, default: null })
  newServiceEndDateTime?: Date | null;

  @Prop({ type: String, trim: true, default: null })
  reason?: string | null;

  @Prop({ type: Boolean, required: true })
  availabilityPrecheckPassed: boolean;

  @Prop({ type: String, default: null })
  availabilityPrecheckReason?: string | null;

  @Prop({
    type: String,
    enum: ['CHANGE_REQUESTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
    default: 'CHANGE_REQUESTED',
    index: true,
  })
  status: RescheduleStatus;

  @Prop({ type: Date, default: null })
  respondedAt?: Date | null;

  @Prop({ type: String, trim: true, default: null })
  responseMessage?: string | null;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  appliedAt?: Date | null;
}

export const RescheduleRequestSchema =
  SchemaFactory.createForClass(RescheduleRequest);

RescheduleRequestSchema.index(
  { vendorOrderId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'CHANGE_REQUESTED' },
  },
);
