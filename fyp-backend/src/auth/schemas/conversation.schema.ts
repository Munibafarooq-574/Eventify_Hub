// src/chat/schemas/conversation.schema.ts
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from './user.schema';
import { Message } from './message.schema';

@Schema()
export class Conversation extends Document {
    @Prop({ required: true })
    chatId: string;  // Unique ID for the conversation (can be generated or mapped from participants)

    @Prop({ type: [Types.ObjectId], ref: 'User', required: true })
    participants: User[]; // List of participants (userId, vendorId)

    @Prop({ type: Types.ObjectId, ref: 'Message' })
    lastMessage: Message; // Reference to the last message

    @Prop({ default: Date.now })
    createdAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
