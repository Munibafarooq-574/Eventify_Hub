//fyp-backend/src/auth/schemas/message.schema.ts

import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Message extends Document {
    @Prop({ required: true })
    chatId: string;

    @Prop({ required: true })
    senderId: string;

    @Prop({ required: true })
    receiverId: string;

    @Prop({ required: true })
    message: string;

    // 🔵 NEW
    @Prop({ default: '' })
    imageUrl: string;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: Date.now })
    timestamp: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
