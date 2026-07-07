// src/reviews/schemas/review.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Review extends Document {
    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    userId: Types.ObjectId;

    @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
    vendorId: Types.ObjectId;

    @Prop({ required: true })
    reviewText: string;

    @Prop()
    reviewerName: string; // Optional name

    @Prop()
    rating: number; // Optional for future use
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
