
//fyp-backend/src/auth/schemas/message.schema.ts

/*import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
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

    // 🔵 NEW (Phase 7.1) — improved seen receipts
    // Set the moment the receiver's socket is confirmed online at send time.
    @Prop({ type: Date, default: null })
    deliveredAt: Date | null;

    // Set only when the receiver actually opens/is viewing the conversation.
    @Prop({ type: Date, default: null })
    seenAt: Date | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message); */

//fyp-backend/src/auth/schemas/message.schema.ts

import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

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

    // 🔵 NEW (Phase 7.1) — improved seen receipts
    // Set the moment the receiver's socket is confirmed online at send time.
    @Prop({ type: Date, default: null })
    deliveredAt: Date | null;

    // Set only when the receiver actually opens/is viewing the conversation.
    @Prop({ type: Date, default: null })
    seenAt: Date | null;

    // 🟢 NEW (Reply feature) — nullable reference to the original message
    // this one is replying to. We store a reference instead of duplicating
    // the original content, and populate it on read (see chat.service.ts).
    // Existing messages simply have this as null/missing — no migration
    // required, and every consumer treats it as optional.
    @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
    repliedToMessageId: Types.ObjectId | null;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
