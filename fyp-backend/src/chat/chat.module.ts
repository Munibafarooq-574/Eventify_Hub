// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Message, MessageSchema } from '../schemas/message.schema';
import { Conversation, ConversationSchema } from 'src/schemas/conversation.schema';
import { ChatController } from './chat.controller';
import { FileUploadService } from '../file-upload/file-upload.service';
import { User, UserSchema } from 'src/schemas/user.schema';
import { Notification, NotificationSchema } from 'src/schemas/notification.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Message.name, schema: MessageSchema },
            { name: Conversation.name, schema: ConversationSchema },
            { name: User.name, schema: UserSchema },
            { name: Notification.name, schema: NotificationSchema }
        ]),
    ],
    providers: [ChatGateway, ChatService, FileUploadService],
    controllers: [ChatController],
})
export class ChatModule { }
