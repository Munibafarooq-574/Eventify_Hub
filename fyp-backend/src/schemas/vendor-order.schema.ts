//fyp-backend/src/schemas/vendor-order.schema.ts
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

    @Prop({ default: 'pending' })
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'expired';

    @Prop()
    message?: string;

    @Prop()
    confirmationTime?: Date;

    @Prop()
    eventStartDateTime?: Date;

    @Prop()
    eventEndDateTime?: Date;

    // ===== NEW (Phase 4): organizer cancel-before-acceptance =====
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

    // ===== NEW (Phase 5 scaffold): temporary hold after vendor acceptance =====
    // Not enforced/auto-expired yet — activates once Phase 6 payment flow
    // exists. Fields are populated now so nothing needs a migration later.
   
@Prop({ type: Date, default: null })
acceptedAt?: Date | null;

@Prop({ type: Date, default: null })
holdExpiresAt?: Date | null;
}

export const VendorOrderSchema = SchemaFactory.createForClass(VendorOrder);

VendorOrderSchema.index({
  vendorId: 1,
  status: 1,
  eventStartDateTime: 1,
  eventEndDateTime: 1,
});