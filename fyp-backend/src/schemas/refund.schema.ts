// fyp-backend/src/schemas/refund.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Refund extends Document {
    @Prop({ type: Types.ObjectId, required: true, ref: 'VendorOrder' })
    vendorOrderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'Order' })
    orderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    organizerId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    vendorId: Types.ObjectId;

    @Prop({ required: true })
    amountPaid: number; // what organizer had paid so far

    @Prop({ required: true })
    refundAmount: number; // what organizer gets back

    @Prop({ required: true })
    withheldAmount: number; // amountPaid - refundAmount

    @Prop({
        type: String,
        enum: ['ORGANIZER_CANCELLED', 'VENDOR_CANCELLED'],
        required: true,
    })
    initiatedBy: string;

    @Prop({ required: true })
    daysBeforeEvent: number;

    @Prop({ required: true })
    cancellationPolicyApplied: string; // e.g. 'PARTIALLY REFUNDABLE'

    @Prop({
        type: String,
        enum: ['PENDING', 'PROCESSING', 'PAID'],
        default: 'PENDING',
    })
    status: string;

    @Prop({ type: Date, default: null })
    processedAt?: Date | null;

    @Prop({ type: Date, default: null })
    paidAt?: Date | null;

    @Prop({ type: String, default: null })
    notes?: string | null;
}

export const RefundSchema = SchemaFactory.createForClass(Refund);

RefundSchema.index({ vendorOrderId: 1 }, { unique: true });