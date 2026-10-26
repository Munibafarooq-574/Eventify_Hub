
// fyp-backend/src/schemas/vendor-order.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CancellationPolicySettings, CancellationPolicySettingsSchema } from './cancellation-policy.schema';

@Schema({ _id: false })
export class BookingPolicySnapshot {
    @Prop({ required: true, enum: [1], immutable: true })
    schemaVersion: number;

    @Prop({ required: true, immutable: true })
    policyConfigId: string;

    @Prop({ required: true, min: 0, immutable: true })
    policyRevision: number;

    @Prop({ type: Date, required: true, immutable: true })
    capturedAt: Date;

    @Prop({ required: true, enum: ['REFUNDABLE', 'PARTIALLY REFUNDABLE', 'NON-REFUNDABLE'], immutable: true })
    selectedPolicy: string;

    @Prop({ type: CancellationPolicySettingsSchema, required: true, immutable: true })
    settings: CancellationPolicySettings;
}
const BookingPolicySnapshotSchema = SchemaFactory.createForClass(BookingPolicySnapshot);

@Schema({ timestamps: true })
export class VendorOrder extends Document {
    // Server-generated once at booking creation. Absent on legacy bookings.
    // Acceptance, payment and rescheduling must not replace these terms.
    @Prop({ type: BookingPolicySnapshotSchema, immutable: true })
    policySnapshot?: BookingPolicySnapshot;

    @Prop({ type: Types.ObjectId, required: true, ref: 'Order' })
    orderId: Types.ObjectId;

    @Prop({
        type: Types.ObjectId,
        required: true,
        ref: 'User',
    })
    vendorId: Types.ObjectId;

    @Prop({ required: true })
    serviceName: string;

    @Prop({ required: true })
price: number;

// Step 16: Promotion snapshot.
// These values are frozen at booking creation time.
@Prop({
    type: Types.ObjectId,
    ref: 'VendorDiscount',
    default: null,
})
promotionId?: Types.ObjectId | null;

@Prop({
    type: String,
    enum: ['COUPON', 'DISCOUNT_CODE', null],
    default: null,
})
promotionType?: 'COUPON' | 'DISCOUNT_CODE' | null;

@Prop({ type: String, default: null })
promotionCode?: string | null;

@Prop({ type: Number, required: true })
originalAmount: number;

@Prop({ type: Number, default: 0 })
discountAmount: number;

@Prop({ type: Number, required: true })
finalAmount: number;

@Prop({ type: String, default: null })
packageId: string | null;

    // Present only when this VendorOrder replaces an unavailable vendor
    // during an existing event reschedule. Normal bookings remain null.
    @Prop({ type: Types.ObjectId, ref: 'RescheduleRequest', default: null, index: true })
    replacementRescheduleRequestId?: Types.ObjectId | null;

    @Prop({ type: Types.ObjectId, ref: 'VendorOrder', default: null })
    replacesVendorOrderId?: Types.ObjectId | null;

    // Historical closure for a vendor who could not accommodate a
    // requested schedule and was replaced. Kept separate from the
    // existing booking lifecycle so normal status/payment logic is untouched.
    @Prop({
        type: String,
        enum: ['NO_LONGER_ASSIGNED', null],
        default: null,
    })
    replacementOutcome?: 'NO_LONGER_ASSIGNED' | null;

    @Prop({ type: Date, default: null })
    replacementFinalizedAt?: Date | null;

    @Prop({ type: String, enum: ['CONTINUE_WITHOUT', null], default: null })
    cancellationReplacementChoice?: 'CONTINUE_WITHOUT' | null;

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

    // First time the required payment was secured (or no advance was required).
    @Prop()
    confirmationTime?: Date;

    @Prop({ type: Date })
    rejectedAt?: Date;

    @Prop({ type: Date })
    completedAt?: Date;

    @Prop({ type: Date })
    expiredAt?: Date;

    @Prop()
    eventStartDateTime?: Date;

    @Prop()
    eventEndDateTime?: Date;

    // ===== Phase 4: organizer cancel-before-acceptance =====

    @Prop({
        type: String,
        enum: ['organizer', 'vendor', 'admin', null],
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

    @Prop({ type: Number, min: 0 })
    paymentPreparationMinutes?: number;
    @Prop({ type: Number, min: 0 })
    paymentMinimumWindowMinutes?: number;
    @Prop({ type: Date })
    paymentServiceCutoff?: Date;

    // =========================================================
    // Phase 6: Payment fields
    // =========================================================

    // Snapshot of the vendor's down-payment configuration
    // when the vendor accepts the booking.
    // Backend-calculated only — never trust frontend amounts.
    @Prop({
    type: String,
    enum: ['PERCENTAGE', 'FIXED', null],
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
            'PARTIALLY_PAID',
            'PAID',
            'PAYMENT_FAILED',
            'PAYMENT_EXPIRED',
        ],
        default: 'UNPAID',
    })
    paymentStatus: string;

    @Prop({ type: Date, default: null })
    remainingPaymentDeadline?: Date | null;

    // Initial down-payment deadline only.
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
