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

    @Prop({
        required: function (this: Message) {
            return !this.imageUrl;
        },
        default: '',
    })
    message: string;

    @Prop({ default: '' })
    imageUrl: string;

    @Prop({ default: false })
    isRead: boolean;

    @Prop({ default: Date.now })
    timestamp: Date;

    // 🔵 NEW — delete feature
    @Prop({ type: [String], default: [] })
    deletedFor: string[];

    @Prop({ default: false })
    isDeletedForEveryone: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
