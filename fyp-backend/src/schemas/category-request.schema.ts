import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

export type CategoryRequestDocument =
  HydratedDocument<CategoryRequest>;

export enum CategoryRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  MERGED = 'MERGED',
}

@Schema({
  timestamps: true,
  collection: 'category_requests',
})
export class CategoryRequest {
  // ---------------------------------------------------------
  // REQUESTER DETAILS
  //
  // Optional at schema/database level for backward
  // compatibility with old category request documents.
  //
  // New requests are still REQUIRED to provide these fields
  // through CreateCategoryRequestDto.
  // ---------------------------------------------------------

  @Prop({
    type: String,
    trim: true,
    default: null,
  })
  requesterName?: string | null;

  @Prop({
    type: String,
    trim: true,
    lowercase: true,
    default: null,
  })
  requesterEmail?: string | null;

  // ---------------------------------------------------------
  // REQUESTED CATEGORY
  // ---------------------------------------------------------

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  requestedName: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true,
  })
  normalizedName: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  description: string;

  // ---------------------------------------------------------
  // REQUEST STATUS
  // ---------------------------------------------------------

  @Prop({
    type: String,
    enum: Object.values(
      CategoryRequestStatus,
    ),
    default:
      CategoryRequestStatus.PENDING,
    index: true,
  })
  status: CategoryRequestStatus;

  // ---------------------------------------------------------
  // OPTIONAL USER RELATION
  // ---------------------------------------------------------

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  requestedBy?: Types.ObjectId | null;

  // ---------------------------------------------------------
  // ADMIN REVIEW
  // ---------------------------------------------------------

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    default: null,
  })
  reviewedBy?: Types.ObjectId | null;

  @Prop({
    type: Date,
    default: null,
  })
  reviewedAt?: Date | null;

  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    default: null,
  })
  approvedCategoryId?: Types.ObjectId | null;

  @Prop({
    type: String,
    trim: true,
    default: null,
  })
  adminNote?: string | null;
}

export const CategoryRequestSchema =
  SchemaFactory.createForClass(
    CategoryRequest,
  );

CategoryRequestSchema.index({
  normalizedName: 1,
  status: 1,
});