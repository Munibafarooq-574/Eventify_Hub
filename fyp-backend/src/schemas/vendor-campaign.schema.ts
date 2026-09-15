// fyp-backend/src/schemas/vendor-campaign.schema.ts

import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  Document,
  Schema as MongooseSchema,
} from 'mongoose';

export enum CampaignStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class VendorCampaign extends Document {

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  vendorId: MongooseSchema.Types.ObjectId;

  // Packages are embedded inside User,
  // therefore packageId is stored as string.
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  packageId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: true,
    index: true,
  })
  categoryId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  title: string;

  // Exactly one campaign image.
  @Prop({
    type: String,
    required: true,
  })
  image: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  description: string;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  offerLabel: string | null;

  @Prop({
    type: Date,
    required: true,
  })
  startDate: Date;

  @Prop({
    type: Date,
    required: true,
  })
  endDate: Date;

  @Prop({
    type: String,
    enum: CampaignStatus,
    default: CampaignStatus.PENDING,
    required: true,
    index: true,
  })
  status: CampaignStatus;

  @Prop({
    type: String,
    default: null,
  })
  rejectionReason: string | null;

  // Phase 14A.12 analytics counters.
  // Keeping them here now avoids changing the
  // campaign document structure later.
  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  impressions: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  clicks: number;

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  packageVisits: number;
}

export const VendorCampaignSchema =
  SchemaFactory.createForClass(
    VendorCampaign,
  );

VendorCampaignSchema.index({
  vendorId: 1,
  status: 1,
  createdAt: -1,
});

VendorCampaignSchema.index({
  categoryId: 1,
  status: 1,
  startDate: 1,
  endDate: 1,
});

VendorCampaignSchema.index({
  vendorId: 1,
  packageId: 1,
});