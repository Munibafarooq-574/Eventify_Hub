import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Order extends Document {
    @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
    organizerId: Types.ObjectId;

    @Prop({ type: [Types.ObjectId], ref: 'VendorOrder', default: [] })
    vendorOrders: Types.ObjectId[];

    @Prop({ required: true })
    eventName: string;

    @Prop({ required: true })
    guests: number;

    @Prop({ required: true })
    eventDate: Date;

    @Prop({ required: true })
    eventTime: string;

    @Prop({ required: true })
    totalAmount: number;

    @Prop({ required: true })
    discount: number;

    @Prop({ required: true })
    finalAmount: number;

    @Prop({ default: 'pending' })
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export const OrderSchema = SchemaFactory.createForClass(Order);
