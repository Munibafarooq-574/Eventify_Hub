import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum BusinessDetailsType {
  PHOTOGRAPHY = 'PHOTOGRAPHY',
  CATERING = 'CATERING',
  VENUE = 'VENUE',
  MAKEUP = 'MAKEUP',
  CAKE = 'CAKE',
  MEHNDI = 'MEHNDI',
  SOUND = 'SOUND',
  GENERIC = 'GENERIC',
}

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop()
  id: string;

  @Prop({
    required: true,
    trim: true,
  })
  name: string;

  /**
   * Case-insensitive normalized category identity used to prevent
   * duplicates such as "Photography" and " photography ".
   *
   * categoryId remains the actual relational identifier.
   */
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    index: true,
  })
  normalizedName: string;

  @Prop({ required: true })
  image: string;

  @Prop({ default: '' })
  description: string;

  /**
   * Controls WHICH business-details form/schema a category uses.
   *
   * This is intentionally separate from category.name.
   * Future categories can simply use GENERIC without requiring
   * another category-name if/else block.
   */
  @Prop({
    enum: Object.values(BusinessDetailsType),
    default: BusinessDetailsType.GENERIC,
  })
  businessDetailsType: BusinessDetailsType;

  /**
   * Deactivated categories remain in DB for historical bookings/vendors
   * but are hidden from new registration/discovery.
   */
  @Prop({ default: true, index: true })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);