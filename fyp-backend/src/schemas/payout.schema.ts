// fyp-backend/src/schemas/payout.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Payout extends Document {
    @Prop({ type: Types.ObjectId, required: true, ref: 'VendorOrder' })
    vendorOrderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'Order' })
    orderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    vendorId: Types.ObjectId;

    // No commission — full vendor order price is payable.
    @Prop({ required: true })
    grossAmount: number;

    @Prop({ required: true })
    payoutAmount: number; // same as grossAmount (no deduction)

    @Prop({
        type: String,
        enum: ['PENDING', 'PROCESSING', 'PAID'],
        default: 'PENDING',
    })
    status: string;

    @Prop({ type: String, default: null })
    payoutMethod?: string | null; // bank transfer / wallet, once wired

    @Prop({ type: String, default: null })
    payoutReference?: string | null; // gateway/bank reference once real payout exists

    @Prop({ type: Date, default: null })
    processedAt?: Date | null;

    @Prop({ type: Date, default: null })
    paidAt?: Date | null;

    @Prop({ type: String, default: null })
    notes?: string | null;
}

export const PayoutSchema = SchemaFactory.createForClass(Payout);

PayoutSchema.index({ vendorId: 1, status: 1 });
PayoutSchema.index({ vendorOrderId: 1 }, { unique: true }); // one payout per vendor order