// src/reviews/schemas/review.schema.ts
/*import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
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

export const ReviewSchema = SchemaFactory.createForClass(Review);*/

//fyp-backend/src/schemas/review.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum ReviewMediaType {
  IMAGE = 'image',
  VIDEO = 'video',
}

@Schema({ _id: false })
export class ReviewMedia {
  @Prop({ required: true, enum: ReviewMediaType })
  type: ReviewMediaType;

  @Prop({ required: true })
  url: string;

  @Prop()
  thumbnailUrl?: string;
}

export const ReviewMediaSchema = SchemaFactory.createForClass(ReviewMedia);

@Schema({ _id: false })
export class VendorReply {
  @Prop({ required: true, trim: true, maxlength: 1000 })
  text: string;

  @Prop({ required: true, default: () => new Date() })
  repliedAt: Date;
}

export const VendorReplySchema = SchemaFactory.createForClass(VendorReply);

@Schema({ timestamps: true })
export class Review extends Document {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'User',
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'User',
    index: true,
  })
  vendorId: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    maxlength: 2000,
  })
  reviewText: string;

  @Prop()
  reviewerName?: string;

  @Prop({
    required: true,
    min: 1,
    max: 5,
  })
  rating: number;

  @Prop({
    type: [ReviewMediaSchema],
    default: [],
  })
  media: ReviewMedia[];

  @Prop({
    type: VendorReplySchema,
    required: false,
  })
  vendorReply?: VendorReply;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// Indexes for vendor review filtering, sorting and pagination
ReviewSchema.index({ vendorId: 1, createdAt: -1 });
ReviewSchema.index({ vendorId: 1, rating: -1 });