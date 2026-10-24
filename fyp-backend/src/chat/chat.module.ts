import { JwtModule } from '@nestjs/jwt';
import { BookingChatAccessService } from './booking-chat-access.service';
import { VendorGrowthModule } from '../vendor/growth/vendor-growth.module';
import { Order, OrderSchema } from '../schemas/order.schema';
import { VendorOrder, VendorOrderSchema } from '../schemas/vendor-order.schema';
// src/chat/chat.module.ts
import { Module, forwardRef } from '@nestjs/common';
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
        JwtModule.register({}),
        forwardRef(() => VendorGrowthModule),
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
            { name: VendorOrder.name, schema: VendorOrderSchema },
            { name: Message.name, schema: MessageSchema },
            { name: Conversation.name, schema: ConversationSchema },
            { name: User.name, schema: UserSchema },
            { name: Notification.name, schema: NotificationSchema }
        ]),
    ],
    providers: [BookingChatAccessService, ChatGateway, ChatService, FileUploadService],
    controllers: [ChatController],
    exports: [ChatService],
})
export class ChatModule { }
