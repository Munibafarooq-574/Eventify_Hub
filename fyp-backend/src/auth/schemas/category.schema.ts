import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Category extends Document {

    @Prop()
    id: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    image: string;

    @Prop()
    description: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);