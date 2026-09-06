// fyp-backend/src/schemas/payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Payment extends Document {
    @Prop({ type: Types.ObjectId, required: true, ref: 'VendorOrder' })
    vendorOrderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'Order' })
    orderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    organizerId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    vendorId: Types.ObjectId;

    @Prop({ required: true })
    amount: number;

    @Prop({ type: String, enum: ['DOWN_PAYMENT', 'REMAINING'], required: true })
    type: string;

    @Prop({
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED'],
        default: 'PENDING',
    })
    status: string;

    @Prop({ type: String, default: null })
    method?: string | null; // 'card' | 'jazzcash' | 'easypaisa'

    @Prop({ type: String, default: null })
    transactionRef?: string | null; // gateway reference once real gateway is wired

    @Prop({ type: Date, default: null })
    paidAt?: Date | null;

    @Prop({ type: String, default: null })
    failureReason?: string | null;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ vendorOrderId: 1, type: 1 });