// fyp-backend/src/schemas/booking-change-request.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class BookingChangeRequest extends Document {
    @Prop({ type: Types.ObjectId, required: true, ref: 'VendorOrder' })
    vendorOrderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'Order' })
    orderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    organizerId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    vendorId: Types.ObjectId;

    // ===== Current (existing) values, snapshotted at request time =====
    @Prop({ required: true })
    currentEventStartDateTime: Date;

    @Prop({ required: true })
    currentEventEndDateTime: Date;

    @Prop({ required: true })
    currentPrice: number;

    // ===== Requested (new) values =====
    @Prop({ required: true })
    requestedEventStartDateTime: Date;

    @Prop({ required: true })
    requestedEventEndDateTime: Date;

    @Prop({ type: Number, default: null })
    requestedPrice?: number | null; // null = no price change (date/time/guests only)

    @Prop({ type: Number, default: null })
    requestedGuests?: number | null;

    @Prop({ type: String, default: null })
    requestedLocation?: string | null;

    @Prop({ type: String, default: null })
    requestedServiceNote?: string | null; // free text if package/service changes

    // ===== Computed differences (backend-calculated, never trusted from FE) =====
    @Prop({ type: Number, default: 0 })
    priceDifference: number; // requestedPrice - currentPrice (can be negative)

    @Prop({ type: Number, default: 0 })
    paymentAdjustment: number; // amount organizer must pay extra, or gets refunded (negative)

    // ===== Lifecycle =====
    @Prop({
        type: String,
        enum: [
            'PENDING_AVAILABILITY_CHECK', // before vendor accepted the original booking
            'CHANGE_REQUESTED',           // sent to vendor for accept/reject
            'ACCEPTED',
            'REJECTED',
            'CANCELLED',                  // organizer withdrew the request
        ],
        default: 'CHANGE_REQUESTED',
    })
    status: string;

    @Prop({ type: String, default: null })
    requestedBy?: string | null; // 'organizer' (only organizer can request changes)

    @Prop({ type: String, default: null })
    rejectionReason?: string | null;

    @Prop({ type: Date, default: null })
    respondedAt?: Date | null;
}

export const BookingChangeRequestSchema = SchemaFactory.createForClass(
    BookingChangeRequest,
);

BookingChangeRequestSchema.index({ vendorOrderId: 1, status: 1 });