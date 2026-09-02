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

    @Prop({ type: String, default: null })  //new add
    packageId: string | null;

    @Prop({ default: 'pending' })
    status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

    @Prop()
    message?: string;

    @Prop()
    confirmationTime?: Date;

      @Prop()
  eventStartDateTime?: Date;

  @Prop()
  eventEndDateTime?: Date;
}

export const VendorOrderSchema = SchemaFactory.createForClass(VendorOrder);

VendorOrderSchema.index({
  vendorId: 1,
  status: 1,
  eventStartDateTime: 1,
  eventEndDateTime: 1,
});