// fyp-backend/src/schemas/vendor-penalty.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class VendorPenalty extends Document {
    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    vendorId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'VendorOrder' })
    vendorOrderId: Types.ObjectId;

    @Prop({ required: true })
    penaltyPercentage: number;

    @Prop({ required: true })
    penaltyAmount: number;

    @Prop({ required: true })
    daysBeforeEvent: number;

    @Prop({ default: null })
    reason?: string | null;

    @Prop({ type: Date, default: Date.now })
    issuedAt: Date;
}

export const VendorPenaltySchema = SchemaFactory.createForClass(VendorPenalty);

VendorPenaltySchema.index({ vendorId: 1, issuedAt: -1 });