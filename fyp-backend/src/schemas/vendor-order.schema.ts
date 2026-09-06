
// fyp-backend/src/schemas/vendor-order.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class VendorOrder extends Document {
    @Prop({ type: Types.ObjectId, required: true, ref: 'Order' })
    orderId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, required: true, ref: 'Vendor' })
    vendorId: Types.ObjectId;

    @Prop({ required: true })
    serviceName: string;

    @Prop({ required: true })
    price: number;

    @Prop({ type: String, default: null })
    packageId: string | null;

    // IMPORTANT: Existing booking lifecycle — DO NOT CHANGE
    @Prop({ default: 'pending' })
status:
    | 'pending'
    | 'accepted'
    | 'rejected'
    | 'cancelled'
    | 'cancelled_by_vendor'
    | 'completed'
    | 'expired';

    @Prop()
    message?: string;

    @Prop()
    confirmationTime?: Date;

    @Prop()
    eventStartDateTime?: Date;

    @Prop()
    eventEndDateTime?: Date;

    // ===== Phase 4: organizer cancel-before-acceptance =====

    @Prop({
        type: String,
        enum: ['organizer', 'vendor', 'admin'],
        default: null,
    })
    cancelledBy?: string | null;

    @Prop({ type: Date, default: null })
    cancelledAt?: Date | null;

    @Prop({ type: String, default: null })
    cancellationReason?: string | null;

    // ===== Phase 5: temporary hold after vendor acceptance =====

    @Prop({ type: Date, default: null })
    acceptedAt?: Date | null;

    @Prop({ type: Date, default: null })
    holdExpiresAt?: Date | null;

    // =========================================================
    // Phase 6: Payment fields
    // =========================================================

    // Snapshot of the vendor's down-payment configuration
    // when the vendor accepts the booking.
    // Backend-calculated only — never trust frontend amounts.
    @Prop({
        type: String,
        enum: ['PERCENTAGE', 'FIXED'],
        default: null,
    })
    downPaymentType?: string | null;

    // Used only when downPaymentType === 'PERCENTAGE'
    @Prop({ type: Number, default: null })
    downPaymentPercentage?: number | null;

    // Actual down-payment amount required from organizer
    @Prop({ type: Number, default: null })
    downPaymentAmount?: number | null;

    // Remaining amount after down payment
    @Prop({ type: Number, default: null })
    remainingAmount?: number | null;

    // Separate payment lifecycle.
    // DO NOT mix this with the existing booking status above.
    @Prop({
        type: String,
        enum: [
            'UNPAID',
            'PAYMENT_REQUIRED',
            'PAID',
            'PAYMENT_FAILED',
            'PAYMENT_EXPIRED',
        ],
        default: 'UNPAID',
    })
    paymentStatus: string;

    // Mirrors holdExpiresAt when payment becomes due.
    @Prop({ type: Date, default: null })
    paymentDeadline?: Date | null;

    // =========================================================
// Phase 13: Commission snapshot fields
// =========================================================

// Commission percentage captured when vendor accepts the booking.
// This snapshot never changes for this VendorOrder.
@Prop({ type: Number, default: 0 })
commissionPercentageAtBooking: number;

// Commission amount calculated from the booking price.
// Current platform commission is 0%, so this will normally be 0.
@Prop({ type: Number, default: 0 })
commissionAmount: number;

// Amount vendor is entitled to receive after commission.
// With current 0% commission, this equals the full price.
@Prop({ type: Number, default: null })
vendorNetAmount?: number | null;
}

export const VendorOrderSchema = SchemaFactory.createForClass(VendorOrder);

// Existing availability / booking index — KEEP
VendorOrderSchema.index({
    vendorId: 1,
    status: 1,
    eventStartDateTime: 1,
    eventEndDateTime: 1,
});
