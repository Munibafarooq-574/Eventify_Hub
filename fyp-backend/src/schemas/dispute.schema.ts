// fyp-backend/src/schemas/dispute.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Dispute extends Document {
    @Prop({ type: Types.ObjectId, required: true, ref: 'VendorOrder' })
    vendorOrderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'Order' })
    orderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    organizerId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    vendorId: Types.ObjectId;

    @Prop({ type: String, enum: ['organizer', 'vendor'], required: true })
    raisedBy: string;

    @Prop({ required: true })
    organizerStatement: string;

    @Prop({ type: String, default: null })
    vendorStatement?: string | null;

    @Prop({ type: [String], default: [] })
    evidenceUrls: string[];

    @Prop({
        type: String,
        enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED_ORGANIZER', 'RESOLVED_VENDOR', 'RESOLVED_PARTIAL'],
        default: 'OPEN',
    })
    status: string;

    @Prop({ type: String, default: null })
    resolutionNotes?: string | null;

    @Prop({ type: Number, default: null })
    partialRefundAmount?: number | null; // only used for RESOLVED_PARTIAL

    @Prop({ type: Date, default: null })
    resolvedAt?: Date | null;
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);
DisputeSchema.index({ status: 1, createdAt: -1 });