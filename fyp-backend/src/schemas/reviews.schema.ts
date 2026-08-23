import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Reviews extends Document {

  @Prop()
  reviews_id: string; 

  @Prop()
  vendor_id: string; 

  @Prop()
  user_id: string; 

  @Prop()
  comments: string; 

  @Prop()
  ratings: number;

  @Prop()
  created_at: Date;

  @Prop()
  provider?: string;

  @Prop()
  providerId?: string;
}

export const ReviewsSchema = SchemaFactory.createForClass(Reviews);